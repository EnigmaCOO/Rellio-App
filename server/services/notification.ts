import nodemailer from 'nodemailer';
import twilio from 'twilio';

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

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Initialize Twilio client if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER) {
        console.log('Email simulation (no SMTP configured):', options);
        return true; // Simulate success for development
      }

      await this.emailTransporter.sendMail({
        from: `"Rellio" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
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