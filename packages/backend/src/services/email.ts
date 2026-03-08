import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface NotificationTemplate {
  studentName: string;
  className: string;
  date: string;
  parentEmail?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      logger.warn('Email service not configured - notifications will be disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.info('Email service disabled - skipping notification');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'EduGuard <noreply@eduguard.app>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  private getAbsenceNotificationTemplate(data: NotificationTemplate): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .alert { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Attendance Alert - EduGuard</h2>
            </div>
            <div class="content">
              <p>Dear Parent/Guardian,</p>
              
              <div class="alert">
                <strong>Absence Detected</strong><br>
                ${data.studentName} was marked absent in ${data.className} on ${data.date}.
              </div>

              <p>If you believe this is an error or would like to discuss this attendance record, please contact the school administration.</p>

              <p>
                <a href="https://eduguard.app/dashboard" class="button">View Attendance Records</a>
              </p>

              <div class="footer">
                <p>This is an automated message from EduGuard AI. Please do not reply to this email.</p>
                <p>&copy; 2024 EduGuard AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getWelcomeTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to EduGuard AI</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <p>Your account has been successfully created. Welcome to EduGuard AI - the modern attendance management system with face recognition.</p>

              <h3>Getting Started:</h3>
              <ul>
                <li>Set up your classes and students</li>
                <li>Register student faces for recognition</li>
                <li>Start automated attendance sessions</li>
                <li>Track attendance and generate reports</li>
              </ul>

              <p>
                <a href="https://eduguard.app/dashboard" class="button">Go to Dashboard</a>
              </p>

              <div class="footer">
                <p>&copy; 2024 EduGuard AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendAbsenceNotification(data: NotificationTemplate & { parentEmail: string }): Promise<boolean> {
    return this.sendEmail({
      to: data.parentEmail,
      subject: `Attendance Alert: ${data.studentName} Marked Absent`,
      html: this.getAbsenceNotificationTemplate(data),
    });
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to EduGuard AI',
      html: this.getWelcomeTemplate(userName),
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
            .warning { color: #ef4444; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              
              <p>We received a request to reset your password. Click the button below to set a new password.</p>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>

              <p>This link will expire in 1 hour.</p>

              <p class="warning">If you didn't request this, please ignore this email.</p>

              <div class="footer">
                <p>&copy; 2024 EduGuard AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - EduGuard',
      html,
    });
  }
}

export const emailService = new EmailService();
