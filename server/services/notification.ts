import nodemailer from 'nodemailer';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmsOptions {
  to: string;
  body: string;
}

// ─── Provider resolution ────────────────────────────────────────────────────
//
// SMTP-first by design: SendGrid is geo-restricted in some regions where
// Rellio operates (notably PK), so the canonical email path is now generic
// SMTP via nodemailer. SendGrid remains as an optional fallback so existing
// deployments continue to work without forced migration.
//
// Order:
//   1. EMAIL_PROVIDER === 'smtp'                        → smtp
//   2. SMTP_HOST + SMTP_USER + SMTP_PASS all set        → smtp
//      (unless EMAIL_PROVIDER is explicitly 'sendgrid')
//   3. SENDGRID_API_KEY                                 → sendgrid
//   4. otherwise                                        → disabled

type EmailProvider = 'smtp' | 'sendgrid' | 'disabled';

const EXPLICIT_PROVIDER = (process.env.EMAIL_PROVIDER || '').toLowerCase();
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE_RAW = (process.env.SMTP_SECURE || '').toLowerCase();
const SMTP_SECURE =
  SMTP_SECURE_RAW === 'true'
    ? true
    : SMTP_SECURE_RAW === 'false'
      ? false
      : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `Rellio <${SMTP_USER}>` : null);

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
// Canonical env names: SENDGRID_FROM_EMAIL / SENDGRID_SENDER_NAME / APP_URL.
// Legacy aliases (SENDGRID_SENDER_EMAIL, FROM_EMAIL) silently still work.
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL ||
  process.env.SENDGRID_SENDER_EMAIL ||
  process.env.FROM_EMAIL ||
  'welcome@rellio.co';
const SENDGRID_SENDER_NAME = process.env.SENDGRID_SENDER_NAME || 'Rellio';
const FROM_EMAIL_ALIAS_USED = !process.env.SENDGRID_FROM_EMAIL && !!(
  process.env.SENDGRID_SENDER_EMAIL || process.env.FROM_EMAIL
);

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function smtpFullyConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function resolveProvider(): EmailProvider {
  if (EXPLICIT_PROVIDER === 'smtp') return 'smtp';
  if (EXPLICIT_PROVIDER === 'sendgrid') return SENDGRID_API_KEY ? 'sendgrid' : 'disabled';
  if (smtpFullyConfigured()) return 'smtp';
  if (SENDGRID_API_KEY) return 'sendgrid';
  return 'disabled';
}

const ACTIVE_PROVIDER: EmailProvider = resolveProvider();

/**
 * Pretty-print SendGrid error responses. SendGrid surfaces structured
 * delivery failures (403 sender-not-verified, 401 invalid-api-key, etc.)
 * on `error.response.body` — without this, the only visible signal is a
 * generic stack trace which makes the operator chase ghosts.
 */
function describeSendGridError(error: unknown): string {
  const e = error as { code?: number; message?: string; response?: { statusCode?: number; body?: unknown } };
  const status = e?.response?.statusCode ?? e?.code;
  const body = e?.response?.body;
  const bodyStr = body
    ? typeof body === 'string'
      ? body
      : JSON.stringify(body)
    : '';
  return `SendGrid${status ? ` [${status}]` : ''}: ${e?.message ?? 'unknown'}${bodyStr ? ` :: ${bodyStr}` : ''}`;
}

/**
 * Single-line startup banner for the email subsystem so operators can
 * tell at a glance whether welcome/verification emails will actually
 * leave the server. Called once from server/index.ts after env validation.
 */
export function logEmailStatus(): void {
  if (ACTIVE_PROVIDER === 'smtp') {
    // If the operator explicitly set EMAIL_PROVIDER=smtp but didn't fully
    // populate the SMTP creds, the resolver still parks us at 'smtp' (so we
    // don't silently fall back to SendGrid). Sending will then fail closed,
    // but the banner needs to make that visible — never optimistic.
    if (!smtpFullyConfigured() || !SMTP_FROM) {
      console.error(
        '📧 Email: SMTP MISCONFIGURED — EMAIL_PROVIDER=smtp but SMTP creds incomplete. ' +
          `Missing: ${[
            !SMTP_HOST && 'SMTP_HOST',
            !SMTP_USER && 'SMTP_USER',
            !SMTP_PASS && 'SMTP_PASS',
            !SMTP_FROM && 'SMTP_FROM',
          ]
            .filter(Boolean)
            .join(', ')}. ` +
          'Welcome and password-reset emails will FAIL until fixed.',
      );
      return;
    }
    console.log(
      `📧 Email: SMTP ON · host=${SMTP_HOST}:${SMTP_PORT} · secure=${SMTP_SECURE} · user=${SMTP_USER} · from=${SMTP_FROM}`,
    );
  } else if (ACTIVE_PROVIDER === 'sendgrid') {
    const aliasNote = FROM_EMAIL_ALIAS_USED ? ' (legacy alias)' : '';
    console.log(
      `📧 Email: SendGrid ON · sender=${SENDGRID_FROM_EMAIL}${aliasNote} · name="${SENDGRID_SENDER_NAME}"`,
    );
  } else if (process.env.NODE_ENV === 'production') {
    console.error(
      '📧 Email: NOT CONFIGURED — welcome and password-reset emails will be DROPPED. ' +
        'Set SMTP_HOST/SMTP_USER/SMTP_PASS (preferred) or SENDGRID_API_KEY to enable delivery.',
    );
  } else {
    console.warn(
      '📧 Email: NOT CONFIGURED — emails will be simulated to the console. ' +
        'Set SMTP_HOST/SMTP_USER/SMTP_PASS (preferred) or SENDGRID_API_KEY to enable real delivery.',
    );
  }
}

/**
 * Snapshot of email-subsystem config for the dev-only diagnostics
 * endpoint. Never includes secrets (no SMTP_PASS / API key values).
 */
export function getEmailStatusSnapshot() {
  return {
    provider: ACTIVE_PROVIDER,
    smtpConfigured: smtpFullyConfigured(),
    smtpHost: SMTP_USER ? SMTP_HOST : null,
    smtpPort: SMTP_USER ? SMTP_PORT : null,
    smtpSecure: SMTP_USER ? SMTP_SECURE : null,
    smtpUser: SMTP_USER ?? null,
    smtpFrom: SMTP_FROM,
    sendgridConfigured: !!SENDGRID_API_KEY,
    fromEmail: ACTIVE_PROVIDER === 'sendgrid' ? SENDGRID_FROM_EMAIL : SMTP_FROM,
    senderName: SENDGRID_SENDER_NAME,
    fromEmailAliasUsed: FROM_EMAIL_ALIAS_USED,
    appUrl: process.env.APP_URL || 'https://rellio.co',
    mode: process.env.NODE_ENV || 'development',
  };
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    // Lazy-initialize SMTP transporter only when SMTP credentials are present.
    // Constructing one without auth causes nodemailer to log warnings on
    // every connect; gating it keeps the dev console clean.
    if (smtpFullyConfigured()) {
      this.emailTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER!, pass: SMTP_PASS! },
      });
    }

    // Initialize Twilio client if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  /**
   * Provider-agnostic email send. Routes through SMTP when configured
   * (or `EMAIL_PROVIDER=smtp`), otherwise SendGrid, otherwise simulates
   * in dev / errors in prod. Never throws — auth flows depend on this
   * not blocking on transient delivery failures.
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (ACTIVE_PROVIDER === 'smtp') {
        if (this.emailTransporter && SMTP_FROM) {
          await this.emailTransporter.sendMail({
            from: SMTP_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
          });
          return true;
        }
        // Provider explicitly resolved to SMTP but creds are incomplete — do
        // NOT fall through to dev simulation (returning true would falsely
        // mark users as "welcomed" without delivery).
        console.error(
          '[email] FAILED — provider=smtp but transporter unavailable ' +
            '(check SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM). Email NOT sent: ' +
            JSON.stringify({ to: options.to, subject: options.subject }),
        );
        return false;
      }

      if (ACTIVE_PROVIDER === 'sendgrid') {
        if (SENDGRID_API_KEY) {
          await sgMail.send({
            to: options.to,
            from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_SENDER_NAME },
            subject: options.subject,
            text: options.text,
            html: options.html,
          });
          return true;
        }
        console.error(
          '[email] FAILED — provider=sendgrid but SENDGRID_API_KEY is missing. ' +
            'Email NOT sent: ' +
            JSON.stringify({ to: options.to, subject: options.subject }),
        );
        return false;
      }

      // ACTIVE_PROVIDER === 'disabled'
      if (process.env.NODE_ENV === 'production') {
        console.error(
          '[email] DROPPED in production (no provider configured): ' +
            JSON.stringify({ to: options.to, subject: options.subject }),
        );
        return false;
      }

      console.log('[email] simulation (no provider configured):', {
        to: options.to,
        subject: options.subject,
      });
      return true;
    } catch (error) {
      // Surface SendGrid's structured error body so 403 sender-not-verified
      // and 401 invalid-api-key are visible at a glance. SMTP errors
      // already carry meaningful messages (auth failed, EHOSTUNREACH, etc.).
      const detail =
        ACTIVE_PROVIDER === 'sendgrid'
          ? describeSendGridError(error)
          : (error as Error)?.message ?? String(error);
      console.error(`Failed to send email via ${ACTIVE_PROVIDER}:`, detail);
      return false;
    }
  }

  /**
   * Send SMS
   */
  async sendSms(options: SmsOptions): Promise<boolean> {
    try {
      if (!this.twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
        console.log('SMS simulation (no Twilio configured):', options);
        return true; // Simulate success for development
      }

      await this.twilioClient.messages.create({
        body: options.body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: options.to,
      });

      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send the one-time welcome email after a user signs up (email verify or social).
   *
   * Returns true only when the active provider accepts the message. When
   * no provider is configured, logs a clear warning and returns false so
   * callers (which gate `markWelcomeEmailSent` on this value) do not mark
   * the user as already welcomed in environments where nothing was actually
   * delivered. Never throws — auth flows must not block on email delivery.
   */
  async sendWelcomeEmail(
    email: string,
    firstName?: string | null,
    username?: string | null,
  ): Promise<boolean> {
    if (ACTIVE_PROVIDER === 'disabled') {
      console.warn(
        `[notification] Welcome email NOT sent to ${email}: no email provider is configured. ` +
          'Set SMTP_HOST/SMTP_USER/SMTP_PASS (preferred) or SENDGRID_API_KEY. ' +
          'The user will not be marked as welcomed so the email can be retried once a provider is configured.',
      );
      return false;
    }

    const appUrl = process.env.APP_URL || 'https://rellio.co';
    const greetingName =
      (firstName || '').trim() || (username || '').trim() || 'there';
    const subject = 'Welcome to Rellio — Your spiritual journey begins';
    const text = `Hi ${greetingName},

Welcome to Rellio. We're so glad you're here.

Rellio is a calm, respectful place to read sacred scriptures across traditions, ask questions, and explore the wisdom that resonates with you.

Start exploring: ${appUrl}

With warmth,
The Rellio team`;
    const html = this.getWelcomeEmailTemplate(greetingName, appUrl);

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send OTP via email
   */
  async sendOtpEmail(email: string, code: string, purpose: string): Promise<boolean> {
    const subject = this.getOtpSubject(purpose);
    const html = this.getOtpEmailTemplate(code, purpose);
    const text = `Your Rellio verification code is: ${code}. This code expires in 5 minutes.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send OTP via SMS
   */
  async sendOtpSms(phone: string, code: string, purpose: string): Promise<boolean> {
    const body = `Your Rellio verification code is: ${code}. This code expires in 5 minutes.`;

    return this.sendSms({
      to: phone,
      body,
    });
  }

  /**
   * Send notification update to users
   */
  async sendNotificationUpdate(
    users: { email?: string; phone?: string; notificationPreferences: any }[],
    subject: string,
    message: string
  ): Promise<{ emailsSent: number; smsSent: number }> {
    let emailsSent = 0;
    let smsSent = 0;

    for (const user of users) {
      // Send email notification if user has opted in
      if (user.email && user.notificationPreferences?.email) {
        const success = await this.sendEmail({
          to: user.email,
          subject: `Rellio: ${subject}`,
          html: this.getNotificationTemplate(subject, message),
          text: message,
        });
        if (success) emailsSent++;
      }

      // Send SMS notification if user has opted in
      if (user.phone && user.notificationPreferences?.sms) {
        const success = await this.sendSms({
          to: user.phone,
          body: `Rellio: ${subject}\n\n${message}`,
        });
        if (success) smsSent++;
      }
    }

    return { emailsSent, smsSent };
  }

  /**
   * Get OTP email subject based on purpose
   */
  private getOtpSubject(purpose: string): string {
    switch (purpose) {
      case 'signup':
        return 'Welcome to Rellio - Verify Your Account';
      case 'login':
        return 'Rellio - Verify Your Login';
      case 'reset':
        return 'Rellio - Reset Your Password';
      default:
        return 'Rellio - Verification Code';
    }
  }

  /**
   * Get OTP email template
   */
  private getOtpEmailTemplate(code: string, purpose: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rellio Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00D5FF; }
          .code-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
          }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔮 Rellio</div>
            <h1>Verification Code</h1>
          </div>

          <p>Hello,</p>
          <p>Your Rellio verification code is:</p>

          <div class="code-box">
            <div class="code">${code}</div>
          </div>

          <p><strong>This code expires in 5 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>

          <div class="footer">
            <p>Best regards,<br>The Rellio Team</p>
            <p><em>Explore sacred scriptures with spiritual guidance</em></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get welcome email template
   */
  private getWelcomeEmailTemplate(name: string, appUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Rellio</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #111827; }
          h1 { font-size: 22px; margin: 16px 0 8px; color: #111827; }
          p { font-size: 15px; color: #374151; margin: 12px 0; }
          .cta { display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 12px; font-weight: 600; margin: 20px 0; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Rellio</div>
          </div>
          <h1>Welcome, ${name}.</h1>
          <p>We're so glad you're here.</p>
          <p>Rellio is a calm, respectful place to read sacred scriptures across traditions, ask questions, and explore the wisdom that resonates with you. Take your time — there's no rush.</p>
          <p style="text-align:center;">
            <a href="${appUrl}" class="cta">Start Exploring Rellio</a>
          </p>
          <p>If you have feedback or questions, just reply to this email — a real person will read it.</p>
          <div class="footer">
            <p>With warmth,<br/>The Rellio team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get notification email template
   */
  private getNotificationTemplate(subject: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rellio Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00D5FF; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 12px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔮 Rellio</div>
            <h1>${subject}</h1>
          </div>

          <div class="content">
            <p>${message}</p>
          </div>

          <div class="footer">
            <p>Best regards,<br>The Rellio Team</p>
            <p><em>Explore sacred scriptures with spiritual guidance</em></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const notificationService = new NotificationService();
