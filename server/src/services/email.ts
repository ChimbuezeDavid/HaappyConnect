import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'HaappyConnect <onboarding@resend.dev>';

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(toEmail: string, resetCode: string): Promise<boolean> {
  if (!resendClient) {
    console.log(`[Resend Fallback] RESEND_API_KEY not set. Password reset code for ${toEmail} is: ${resetCode}`);
    return true;
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: 'Reset Your HaappyConnect Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #FAF8F5; margin: 0; padding: 40px 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E7E1D8; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
            .badge { display: inline-block; background: rgba(5, 150, 105, 0.1); color: #059669; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
            h1 { font-size: 24px; color: #0B0F14; margin: 0 0 12px 0; font-weight: 800; }
            p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
            .code-box { background: #FAF8F5; border: 2px dashed #059669; border-radius: 16px; text-align: center; padding: 20px; margin: 24px 0; }
            .code { font-size: 36px; font-weight: 900; letter-spacing: 0.25em; color: #059669; font-family: monospace; }
            .footer { font-size: 12px; color: #94A3B8; text-align: center; margin-top: 32px; border-top: 1px solid #F1ECE6; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">HaappyConnect Security</div>
            <h1>Password Reset Code</h1>
            <p>You recently requested to reset your password for your HaappyConnect account. Use the 6-digit verification code below to complete the process:</p>
            <div class="code-box">
              <div class="code">${resetCode}</div>
            </div>
            <p style="font-size: 13px; color: #64748B;">This code will expire in 15 minutes. If you did not request this password reset, you can safely ignore this email.</p>
            <div class="footer">
              © ${new Date().getFullYear()} HaappyConnect. High-Impact Mentorship and Expert Consultations.
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[Resend Error] Failed to send password reset email:', error);
      return false;
    }

    console.log('[Resend] Password reset email sent successfully to:', toEmail, 'ID:', data?.id);
    return true;
  } catch (err) {
    console.error('[Resend Exception] Error sending email:', err);
    return false;
  }
}
