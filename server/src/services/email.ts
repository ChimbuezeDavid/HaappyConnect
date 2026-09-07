import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'HaappyConnect <onboarding@resend.dev>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@haappy.org';

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * 1. Password Reset Email
 */
export async function sendPasswordResetEmail(toEmail: string, resetCode: string): Promise<boolean> {
  if (!resendClient) {
    console.log(`[Resend Fallback] RESEND_API_KEY not set. Password reset code for ${toEmail} is: ${resetCode}`);
    return true;
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: 'Reset Your Haappy Password',
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
            <div class="badge">Haappy Security</div>
            <h1>Password Reset Code</h1>
            <p>You recently requested to reset your password for your Haappy account. Use the 6-digit verification code below to complete the process:</p>
            <div class="code-box">
              <div class="code">${resetCode}</div>
            </div>
            <p style="font-size: 13px; color: #64748B;">This code will expire in 15 minutes. If you did not request this password reset, you can safely ignore this email.</p>
            <div class="footer">
              © ${new Date().getFullYear()} Haappy. Mentorship and Expert Consultations.
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

/**
 * 2. Haappy Support Ticket Email (Sends inquiry to support + confirmation to user)
 */
export async function sendSupportTicketEmail(params: {
  fromUserEmail: string;
  userName: string;
  userRole?: string;
  category: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const { fromUserEmail, userName, userRole = 'User', category, subject, message } = params;

  if (!resendClient) {
    console.log(`[Resend Fallback] RESEND_API_KEY not set. Support ticket from ${userName} (${fromUserEmail}): [${category}] ${subject}\n${message}`);
    return true;
  }

  try {
    // A) Send ticket alert to Haappy Support team
    await resendClient.emails.send({
      from: SENDER_EMAIL,
      to: [SUPPORT_EMAIL],
      replyTo: fromUserEmail,
      subject: `[Haappy Support - ${category}] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #FAF8F5; margin: 0; padding: 40px 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E7E1D8; padding: 36px; }
            .badge { display: inline-block; background: #0B0F14; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
            .meta { background: #FAF8F5; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px; color: #334155; }
            .content { white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #0F172A; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">New Support Request</div>
            <h2 style="margin: 0 0 16px 0; color: #0B0F14;">${subject}</h2>
            <div class="meta">
              <div><strong>Sender:</strong> ${userName} &lt;${fromUserEmail}&gt;</div>
              <div><strong>Account Role:</strong> ${userRole.toUpperCase()}</div>
              <div><strong>Category:</strong> ${category}</div>
              <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
            </div>
            <div class="content">${message}</div>
          </div>
        </body>
        </html>
      `
    });

    // B) Send automated receipt confirmation back to user
    await resendClient.emails.send({
      from: SENDER_EMAIL,
      to: [fromUserEmail],
      subject: `We've received your request: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #FAF8F5; margin: 0; padding: 40px 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E7E1D8; padding: 36px; }
            .badge { display: inline-block; background: rgba(5, 150, 105, 0.1); color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
            h1 { font-size: 22px; color: #0B0F14; margin: 0 0 12px 0; font-weight: 800; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
            .footer { font-size: 12px; color: #94A3B8; text-align: center; margin-top: 32px; border-top: 1px solid #F1ECE6; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Haappy Help Desk</div>
            <h1>We're on it, ${userName}!</h1>
            <p>Thank you for reaching out to Haappy Support. We have received your inquiry regarding <strong>"${subject}"</strong>.</p>
            <p>Our concierge support team is actively reviewing your request and will follow up with you directly at this email address within 24 hours.</p>
            <p style="font-size: 13px; color: #64748B;">Ticket Category: <strong>${category}</strong></p>
            <div class="footer">
              © ${new Date().getFullYear()} Haappy. Mentorship and Expert Consultations.
            </div>
          </div>
        </body>
        </html>
      `
    });

    return true;
  } catch (err) {
    console.error('[Resend Exception] Error sending support email:', err);
    return false;
  }
}

/**
 * 3. Consultation Notice Email (New question, answer, or booking confirmation)
 */
export async function sendConsultationNoticeEmail(params: {
  toEmail: string;
  recipientName: string;
  senderName: string;
  type: 'question' | 'booking' | 'answer';
  sessionDetails: string;
  actionUrl?: string;
}): Promise<boolean> {
  const { toEmail, recipientName, senderName, type, sessionDetails, actionUrl = 'https://haappy.org' } = params;

  if (!resendClient) {
    console.log(`[Resend Fallback] Consultation notice for ${toEmail} (${type}) from ${senderName}: ${sessionDetails}`);
    return true;
  }

  const subjectMap = {
    question: `New Consultation Question from ${senderName}`,
    booking: `1:1 Consultation Session Confirmed with ${senderName}`,
    answer: `${senderName} Answered Your Consultation Question!`
  };

  const titleMap = {
    question: 'New Question Received',
    booking: 'Session Confirmed',
    answer: 'Your Answer is Ready'
  };

  try {
    await resendClient.emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: subjectMap[type],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #FAF8F5; margin: 0; padding: 40px 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E7E1D8; padding: 36px; }
            .badge { display: inline-block; background: rgba(5, 150, 105, 0.1); color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
            h1 { font-size: 22px; color: #0B0F14; margin: 0 0 12px 0; font-weight: 800; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
            .details-box { background: #FAF8F5; border-left: 4px solid #059669; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 14px; color: #1E293B; line-height: 1.5; }
            .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-top: 10px; }
            .footer { font-size: 12px; color: #94A3B8; text-align: center; margin-top: 32px; border-top: 1px solid #F1ECE6; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Haappy Notification</div>
            <h1>${titleMap[type]}</h1>
            <p>Hello ${recipientName},</p>
            <div class="details-box">
              ${sessionDetails}
            </div>
            <p>Open Haappy to review your conversation and continue interacting:</p>
            <a href="${actionUrl}" class="btn">View in App</a>
            <div class="footer">
              © ${new Date().getFullYear()} Haappy. High-Impact Mentorship and Expert Consultations.
            </div>
          </div>
        </body>
        </html>
      `
    });
    return true;
  } catch (err) {
    console.error('[Resend Exception] Error sending consultation notice email:', err);
    return false;
  }
}

/**
 * 4. Expert Accreditation Status Email
 */
export async function sendExpertVerificationStatusEmail(params: {
  toEmail: string;
  expertName: string;
  status: 'verified' | 'rejected';
  notes?: string;
}): Promise<boolean> {
  const { toEmail, expertName, status, notes } = params;

  if (!resendClient) {
    console.log(`[Resend Fallback] Verification email for ${toEmail}: Status ${status}. Notes: ${notes || 'none'}`);
    return true;
  }

  const isApproved = status === 'verified';
  const subject = isApproved
    ? 'Congratulations! Your Haappy Expert Accreditation is Approved'
    : 'Update on Your Haappy Expert Accreditation Application';

  try {
    await resendClient.emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #FAF8F5; margin: 0; padding: 40px 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E7E1D8; padding: 36px; }
            .badge { display: inline-block; background: ${isApproved ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isApproved ? '#059669' : '#EF4444'}; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
            h1 { font-size: 22px; color: #0B0F14; margin: 0 0 12px 0; font-weight: 800; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
            .notes-box { background: #FAF8F5; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 14px; color: #1E293B; }
            .footer { font-size: 12px; color: #94A3B8; text-align: center; margin-top: 32px; border-top: 1px solid #F1ECE6; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">${isApproved ? 'Accredited' : 'Application Review'}</div>
            <h1>${isApproved ? 'Welcome to Verified Experts!' : 'Application Update'}</h1>
            <p>Hello ${expertName},</p>
            ${isApproved
              ? '<p>Your credentials, identity verification, and accreditation details have been reviewed and approved by the Haappy Executive Administration. Your profile now features the Verified Expert Badge!</p>'
              : '<p>The Haappy Executive Administration has reviewed your verification application. Further adjustments or information are needed before we can activate your verified badge.</p>'
            }
            ${notes ? `<div class="notes-box"><strong>Reviewer Notes:</strong><br>${notes}</div>` : ''}
            <div class="footer">
              © ${new Date().getFullYear()} Haappy. High-Impact Mentorship and Expert Consultations.
            </div>
          </div>
        </body>
        </html>
      `
    });
    return true;
  } catch (err) {
    console.error('[Resend Exception] Error sending verification email:', err);
    return false;
  }
}
