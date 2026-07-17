import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { invoiceEmailTemplate } from './templates/invoice-email.template';

type ContactInquiry = {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  topic?: string;
};

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  async sendContactInquiry(inquiry: ContactInquiry) {
    const to = process.env.CONTACT_ADMIN_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER;
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

    if (!to || !from) {
      throw new Error('Contact email is not configured.');
    }

    const safe = {
      name: escapeHtml(inquiry.name),
      email: escapeHtml(inquiry.email),
      subject: escapeHtml(inquiry.subject),
      topic: escapeHtml(inquiry.topic || 'General question'),
      phone: escapeHtml(inquiry.phone || 'Not provided'),
      message: escapeHtml(inquiry.message).replace(/\n/g, '<br />'),
    };

    try {
      await this.transporter.sendMail({
        from,
        to,
        replyTo: inquiry.email,
        subject: `New Asiance contact: ${inquiry.subject}`,
        text: [
          `Name: ${inquiry.name}`,
          `Email: ${inquiry.email}`,
          `Phone: ${inquiry.phone || 'Not provided'}`,
          `Topic: ${inquiry.topic || 'General question'}`,
          `Subject: ${inquiry.subject}`,
          '',
          inquiry.message,
        ].join('\n'),
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:32px;background:#faf7fb;color:#1a1320;">
            <div style="background:#fff;border:1px solid #e6dfe8;border-radius:14px;padding:28px;">
              <p style="margin:0 0 8px;color:#7a2c8a;font-size:12px;letter-spacing:.14em;text-transform:uppercase;">Asiance contact form</p>
              <h2 style="margin:0 0 18px;font-size:24px;line-height:1.2;">${safe.subject}</h2>
              <table style="width:100%;border-collapse:collapse;margin:0 0 22px;font-size:14px;">
                <tr><td style="padding:8px 0;color:#7a6f80;">Name</td><td style="padding:8px 0;font-weight:600;">${safe.name}</td></tr>
                <tr><td style="padding:8px 0;color:#7a6f80;">Email</td><td style="padding:8px 0;font-weight:600;">${safe.email}</td></tr>
                <tr><td style="padding:8px 0;color:#7a6f80;">Phone</td><td style="padding:8px 0;font-weight:600;">${safe.phone}</td></tr>
                <tr><td style="padding:8px 0;color:#7a6f80;">Topic</td><td style="padding:8px 0;font-weight:600;">${safe.topic}</td></tr>
              </table>
              <div style="padding:18px;border-radius:12px;background:#f1ebf2;line-height:1.65;font-size:15px;">${safe.message}</div>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('CONTACT EMAIL ERROR:', error);
      throw error;
    }
  }
}
