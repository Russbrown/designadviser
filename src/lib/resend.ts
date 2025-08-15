import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email template for daily design journal reminders
export const generateReminderEmail = (userName?: string) => {
  const greeting = userName ? `Hi ${userName}` : 'Hi there';
  
  return {
    subject: '✨ Time to add to your Design Journal',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333;">
        <div style="text-align: center; padding: 40px 20px;">
          <h1 style="color: #2563eb; margin-bottom: 8px; font-size: 28px;">Design Journal</h1>
          <p style="color: #6b7280; margin: 0; font-size: 16px;">Daily design reflection reminder</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px; margin: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">${greeting}! 👋</h2>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            It's time for your daily design reflection. Take a few minutes to document your creative journey today.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #2563eb;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">💡 Today's prompts:</h3>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li>What design challenge are you working on?</li>
              <li>Upload a work-in-progress for AI feedback</li>
              <li>Document an iteration or design decision</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.designjournal.net'}" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Open Design Journal →
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 24px 0;">
            Consistent documentation helps track your design evolution and growth
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>You're receiving this because you have daily reminders enabled in Design Journal.</p>
          <p style="margin: 8px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.designjournal.net'}" style="color: #6b7280;">Manage preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `
${greeting}! 

It's time for your daily design reflection. Take a few minutes to document your creative journey today.

Today's prompts:
• What design challenge are you working on?
• Upload a work-in-progress for AI feedback  
• Document an iteration or design decision

Open Design Journal: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.designjournal.net'}

Consistent documentation helps track your design evolution and growth.

---
You're receiving this because you have daily reminders enabled in Design Journal.
Manage preferences: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.designjournal.net'}
    `.trim()
  };
};