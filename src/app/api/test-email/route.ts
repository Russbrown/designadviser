import { NextRequest, NextResponse } from 'next/server';
import { resend, generateReminderEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Generate the reminder email content
    const emailContent = generateReminderEmail(userName || 'Test User');
    
    // Send the test email
    const { data, error } = await resend.emails.send({
      from: 'Design Journal <noreply@designjournal.net>',
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (error) {
      console.error('Failed to send test email:', error);
      return NextResponse.json(
        { error: 'Failed to send test email', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Test email sent successfully',
      emailId: data?.id,
      sentTo: email
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
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