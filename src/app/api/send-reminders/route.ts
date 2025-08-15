import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resend, generateReminderEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    // Verify this is being called from a trusted source (cron job service)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current UTC hour to determine if it's midday for users
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    console.log(`Running reminder check at UTC hour: ${currentHour}`);

    // Get all users who have email addresses
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const users = usersData?.users?.filter(user => user.email) || [];
    
    if (users.length === 0) {
      return NextResponse.json({ message: 'No users found', sent: 0 });
    }

    // Check which users haven't created entries recently
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    
    const usersToRemind = [];
    
    for (const user of users) {
      // Skip users who have opted out of reminders (check metadata)
      const userMeta = user.user_metadata || {};
      if (userMeta.daily_reminders === false) {
        continue;
      }

      // Check if user has created any entries in the last 24 hours
      const { data: recentEntries, error: entriesError } = await supabaseAdmin
        .from('design_entries')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo)
        .limit(1);

      if (entriesError) {
        console.error(`Error checking entries for user ${user.id}:`, entriesError);
        continue;
      }

      // If no recent entries, add to reminder list
      if (!recentEntries || recentEntries.length === 0) {
        usersToRemind.push(user);
      }
    }

    console.log(`Found ${usersToRemind.length} users to send reminders to`);

    // Send reminder emails
    const results = [];
    const batchSize = 10; // Send emails in batches to avoid rate limiting
    
    for (let i = 0; i < usersToRemind.length; i += batchSize) {
      const batch = usersToRemind.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          if (!user.email) {
            return { success: false, email: 'unknown', error: 'No email address' };
          }

          const userName = user.user_metadata?.name || user.user_metadata?.full_name;
          const emailContent = generateReminderEmail(userName);
          
          const { data, error } = await resend.emails.send({
            from: 'Design Journal <noreply@designjournal.net>',
            to: [user.email],
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          if (error) {
            console.error(`Failed to send reminder to ${user.email}:`, error);
            return { success: false, email: user.email, error };
          }

          console.log(`Sent reminder to ${user.email}`);
          return { success: true, email: user.email, messageId: data?.id };
        } catch (error) {
          console.error(`Error sending to ${user.email}:`, error);
          return { success: false, email: user.email, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < usersToRemind.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Reminder email results: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      message: 'Daily reminders processed',
      sent: successful,
      failed: failed,
      total_users: users.length,
      eligible_users: usersToRemind.length,
    });

  } catch (error) {
    console.error('Error in send-reminders API:', error);
    return NextResponse.json(
      { error: 'Failed to process daily reminders' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}