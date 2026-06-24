import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { invoiceEmailTemplate } from './templates/invoice-email.template';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
  });

  async sendOtpEmail(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your verification code',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:40px 24px;background:#fff;">
            <h2 style="margin:0 0 8px;color:#111;">Verify your email</h2>
            <p style="color:#555;margin:0 0 24px;">Enter this code on the verification page. It expires in <strong>5 minutes</strong>.</p>
            <div style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1d4ed8;padding:20px;background:#f0f4ff;border-radius:8px;text-align:center;">${code}</div>
            <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't sign up, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('OTP EMAIL ERROR:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Reset your password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:40px 24px;background:#fff;">
            <h2 style="margin:0 0 8px;color:#111;">Reset your password</h2>
            <p style="color:#555;margin:0 0 24px;">Enter this code on the password reset page. It expires in <strong>5 minutes</strong>.</p>
            <div style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1d4ed8;padding:20px;background:#f0f4ff;border-radius:8px;text-align:center;">${code}</div>
            <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('PASSWORD RESET EMAIL ERROR:', error);
      throw error;
    }
  }

  async sendInvoiceEmail(order: any) {
    try {
      await this.transporter.verify();

      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: order.email,
        subject: `Invoice for Order #${order.orderNumber}`,
        html: invoiceEmailTemplate(order),
      });

      console.log('EMAIL SENT:', info.messageId);

      return info;
    } catch (error) {
      console.error('EMAIL ERROR:', error);
      throw error;
    }
  }
}