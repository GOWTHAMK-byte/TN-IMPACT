import nodemailer from 'nodemailer';
import { config } from './config';

// Helper to create a reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  return transporter;
}

export async function sendOtpEmail(toEmail: string, otpCode: string) {
  try {
    if (!config.gmailUser || !config.gmailAppPassword) {
      console.warn("⚠️ GMAIL_USER or GMAIL_APP_PASSWORD missing. OTP not sent to email.");
      console.log(`📱 [MOBILE OTP] Login code for ${toEmail} is: ${otpCode}`);
      return false;
    }

    const mailer = getTransporter();

    const info = await mailer.sendMail({
      from: `"Impact Hub Security" <${config.gmailUser}>`,
      to: toEmail,
      subject: 'Your Login Verification Code',
      text: `Your Impact Hub verification code is: ${otpCode}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Impact Hub Login Verification</h2>
          <p style="color: #334155; font-size: 16px;">
            You are attempting to sign in to your account. Please use the verification code below to complete the process.
          </p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
            This code will expire in 5 minutes. If you did not request this, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`\n\n----------------------------------------`);
    console.log(`📧 [EMAIL SENT TO]: ${toEmail}`);
    console.log(`🆔 [MESSAGE ID]: ${info.messageId}`);
    console.log(`----------------------------------------\n\n`);

    return true;
  } catch (err) {
    console.error('Failed to send OTP email via Gmail Nodemailer:', err);
    return false;
  }
}
