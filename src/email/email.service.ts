import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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

export type OrderCustomerEmailType =
  | 'received'
  | 'packed'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

function parsePort(value?: string) {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : 587;
}

function normalizePassword(host?: string, password?: string) {
  if (!password) return undefined;
  const trimmed = password.trim();

  // Google shows app passwords grouped with spaces; SMTP auth needs the compact value.
  if (host?.toLowerCase().includes('gmail.com')) {
    return trimmed.replace(/\s+/g, '');
  }

  return trimmed;
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function siteOrigin() {
  return readEnv('WEB_ORIGIN')?.split(',')[0]?.trim() || 'http://localhost:3000';
}

function orderUrl(order: any) {
  const origin = siteOrigin().replace(/\/$/, '');
  const id = order._id?.toString?.() || order.id?.toString?.() || '';
  return `${origin}/dashboard?tab=orders${id ? `&order=${encodeURIComponent(id)}` : ''}`;
}

function absoluteImageUrl(value?: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${siteOrigin().replace(/\/$/, '')}${value}`;
  return '';
}

function orderItemsTable(order: any) {
  const rows = (order.items ?? [])
    .map((item: any) => {
      const imageUrl = absoluteImageUrl(item.image);

      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #ece8ee;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td width="64" style="width:64px;padding-right:14px;">
                  ${
                    imageUrl
                      ? `<img src="${imageUrl}" width="54" height="54" alt="" style="display:block;width:54px;height:54px;border-radius:10px;object-fit:cover;border:1px solid #ece8ee;" />`
                      : `<div style="width:54px;height:54px;border-radius:10px;background:#f2eef4;border:1px solid #ece8ee;"></div>`
                  }
                </td>
                <td style="font-size:14px;line-height:1.45;color:#2b2530;font-weight:700;">
                  ${escapeHtml(item.name)}
                  ${item.selectedVariationName ? `<div style="font-size:12px;color:#8c8192;font-weight:400;margin-top:3px;">${escapeHtml(item.selectedVariationName)}</div>` : ''}
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:16px 0;border-bottom:1px solid #ece8ee;text-align:center;color:#8c8192;font-size:13px;">x ${Number(item.quantity || 0)}</td>
          <td style="padding:16px 0;border-bottom:1px solid #ece8ee;text-align:right;color:#2b2530;font-size:14px;font-weight:700;">${formatMoney(item.total)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:0;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:0 0 10px;border-bottom:1px solid #ece8ee;text-align:left;color:#8c8192;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Item</th>
          <th style="padding:0 0 10px;border-bottom:1px solid #ece8ee;text-align:center;color:#8c8192;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Qty</th>
          <th style="padding:0 0 10px;border-bottom:1px solid #ece8ee;text-align:right;color:#8c8192;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function orderCustomerEmailCopy(order: any, type: OrderCustomerEmailType) {
  const orderNumber = order.orderNumber ?? '';
  const name = escapeHtml(order.customerName || order.billingName || 'Customer');
  const copies = {
    received: {
      subject: `Order #${orderNumber} confirmed`,
      eyebrow: 'Confirmed',
      heading: 'Thank you for your purchase!',
      message: `Hello ${name}, we have received your order and we are getting it ready.`,
    },
    packed: {
      subject: `Your order #${orderNumber} is packed`,
      eyebrow: 'Packed',
      heading: 'Your order is packed',
      message: `Hello ${name}, your order is packed and being prepared for shipment.`,
    },
    pending: {
      subject: `Payment pending for order #${orderNumber}`,
      eyebrow: 'Pending payment',
      heading: 'Payment pending',
      message: `Hello ${name}, your order is waiting for payment confirmation. Your order details are below.`,
    },
    processing: {
      subject: `Order #${orderNumber} confirmed`,
      eyebrow: 'Processing',
      heading: 'Thank you for your purchase!',
      message: `Hello ${name}, your order has been received and is now being processed. Your order details are below.`,
    },
    shipped: {
      subject: `Your order #${orderNumber} has shipped`,
      eyebrow: 'Dispatched',
      heading: 'Your order has shipped',
      message: `Hello ${name}, your order has shipped. Thank you for shopping with Asiance.`,
    },
    completed: {
      subject: `Your order #${orderNumber} is complete`,
      eyebrow: 'Completed',
      heading: 'Order complete',
      message: `Hello ${name}, your order is complete. Thank you for shopping with Asiance.`,
    },
    cancelled: {
      subject: `Your order #${orderNumber} was cancelled`,
      eyebrow: 'Cancelled',
      heading: 'Order cancelled',
      message: `Hello ${name}, your order has been cancelled. If you have questions, please contact support.`,
    },
    refunded: {
      subject: `Your order #${orderNumber} was refunded`,
      eyebrow: 'Refunded',
      heading: 'Order refunded',
      message: `Hello ${name}, your order refund has been processed. If you have questions, please contact support.`,
    },
    failed: {
      subject: `There was a problem with order #${orderNumber}`,
      eyebrow: 'Failed',
      heading: 'Order failed',
      message: `Hello ${name}, there was a problem processing your order. Please contact support if you need help.`,
    },
  };

  return copies[type];
}

function orderCustomerEmailTemplate(order: any, type: OrderCustomerEmailType) {
  const copy = orderCustomerEmailCopy(order, type);
  const firstItem = order.items?.[0];
  const itemCount = (order.items ?? []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  const firstImage = absoluteImageUrl(firstItem?.image);
  const billingName = escapeHtml(order.billingName || order.customerName || 'Customer');
  const shippingAddress = escapeHtml(order.shippingAddress || order.billingAddress || 'Not provided').replace(/\n/g, '<br />');
  const billingAddress = escapeHtml(order.billingAddress || 'Not provided').replace(/\n/g, '<br />');
  const email = escapeHtml(order.billingEmail || order.email || '');
  const phone = escapeHtml(order.phone || '');
  const viewOrderUrl = orderUrl(order);

  return `
    <div style="margin:0;padding:0;background:#f5f2f6;font-family:Arial,Helvetica,sans-serif;color:#2b2530;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${copy.message}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f5f2f6;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="760" cellspacing="0" cellpadding="0" style="width:100%;max-width:760px;border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 18px;text-align:center;">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1;font-style:italic;color:#8b2b92;letter-spacing:-1px;">asiance<span style="color:#8b2b92;">.</span></div>
                  <div style="margin-top:8px;font-size:11px;line-height:1.4;color:#8c8192;text-transform:uppercase;letter-spacing:.18em;">Order update</div>
                </td>
              </tr>

              <tr>
                <td style="background:#eeeaf1;border-radius:18px;padding:18px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td width="56" style="width:56px;padding-right:14px;">
                        ${
                          firstImage
                            ? `<img src="${firstImage}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;border-radius:9px;object-fit:cover;border:1px solid #e0d8e4;" />`
                            : `<div style="width:48px;height:48px;border-radius:9px;background:#fff;border:1px solid #e0d8e4;"></div>`
                        }
                      </td>
                      <td style="font-size:14px;line-height:1.4;color:#2b2530;font-weight:700;">
                        ${escapeHtml(firstItem?.name || `Order #${order.orderNumber}`)}
                        <div style="font-size:12px;color:#6f6475;font-weight:400;margin-top:2px;">${itemCount} ${itemCount === 1 ? 'item' : 'items'} from Asiance</div>
                      </td>
                      <td align="right" style="font-size:12px;line-height:1.35;color:#6f6475;text-transform:uppercase;letter-spacing:.08em;">
                        <strong style="display:block;color:#2b2530;font-size:14px;text-transform:none;letter-spacing:0;">#${order.orderNumber}</strong>
                        Order number
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding-top:18px;">
                        <div style="font-size:24px;line-height:1.2;font-weight:500;color:#2b2530;">${copy.eyebrow}</div>
                        <a href="${viewOrderUrl}" style="display:inline-block;margin-top:20px;background:#7a2c8a;color:#fff;text-decoration:none;border-radius:999px;padding:13px 24px;font-size:14px;font-weight:700;">View order</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background:#fff;border-radius:18px;padding:42px 38px 30px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:#2b2530;">Asiance</td>
                      <td align="right" style="font-size:13px;color:#9b929f;text-transform:uppercase;letter-spacing:.08em;">Order #${order.orderNumber}</td>
                    </tr>
                  </table>

                  <h1 style="margin:28px 0 10px;font-size:24px;line-height:1.25;color:#2b2530;font-weight:500;">${copy.heading}</h1>
                  <p style="margin:0 0 24px;color:#6f6475;font-size:15px;line-height:1.65;">${copy.message}</p>
                  <a href="${viewOrderUrl}" style="display:inline-block;background:#7a2c8a;color:#fff;text-decoration:none;border-radius:6px;padding:14px 24px;font-size:14px;font-weight:700;">View your order</a>
                  <p style="margin:18px 0 0;color:#8c8192;font-size:13px;">or <a href="${siteOrigin().replace(/\/$/, '')}/shop" style="color:#7a2c8a;text-decoration:none;font-weight:700;">Visit our store</a></p>

                  <h2 style="margin:54px 0 18px;font-size:18px;line-height:1.3;color:#2b2530;">Order summary</h2>
                  ${orderItemsTable(order)}

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px;">
                    <tr>
                      <td style="padding:6px 0;color:#8c8192;font-size:14px;">Subtotal</td>
                      <td align="right" style="padding:6px 0;color:#2b2530;font-size:14px;font-weight:700;">${formatMoney(order.subtotal)}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#8c8192;font-size:14px;">Shipping</td>
                      <td align="right" style="padding:6px 0;color:#2b2530;font-size:14px;font-weight:700;">${formatMoney(order.shipping)}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding-top:12px;border-top:1px solid #ece8ee;"></td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#8c8192;font-size:15px;">Total</td>
                      <td align="right" style="padding:8px 0;color:#2b2530;font-size:24px;font-weight:800;">${formatMoney(order.total)}</td>
                    </tr>
                  </table>

                  <h2 style="margin:54px 0 18px;font-size:18px;line-height:1.3;color:#2b2530;">Customer information</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td valign="top" width="50%" style="width:50%;padding:0 18px 22px 0;color:#6f6475;font-size:14px;line-height:1.6;">
                        <strong style="display:block;color:#2b2530;margin-bottom:6px;">Shipping address</strong>
                        ${billingName}<br />${shippingAddress}${phone ? `<br />${phone}` : ''}
                      </td>
                      <td valign="top" width="50%" style="width:50%;padding:0 0 22px 18px;color:#6f6475;font-size:14px;line-height:1.6;">
                        <strong style="display:block;color:#2b2530;margin-bottom:6px;">Billing address</strong>
                        ${billingName}<br />${billingAddress}${email ? `<br />${email}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding:0 18px 0 0;color:#6f6475;font-size:14px;line-height:1.6;">
                        <strong style="display:block;color:#2b2530;margin-bottom:6px;">Shipping method</strong>
                        Delivery Charges
                      </td>
                      <td valign="top" style="padding:0 0 0 18px;color:#6f6475;font-size:14px;line-height:1.6;">
                        <strong style="display:block;color:#2b2530;margin-bottom:6px;">Payment method</strong>
                        ${escapeHtml(order.paymentMethod || 'Cash on delivery')}
                      </td>
                    </tr>
                  </table>

                  <div style="margin-top:54px;padding-top:20px;border-top:1px solid #ece8ee;color:#9b929f;font-size:12px;line-height:1.6;">
                    If you have any questions, reply to this email or contact us through Asiance support.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

@Injectable()
export class EmailService {
  private readonly from: string;
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const host = readEnv('SMTP_HOST');
    const port = parsePort(readEnv('SMTP_PORT'));
    const secureSetting = readEnv('SMTP_SECURE')?.toLowerCase();
    const secure = secureSetting ? secureSetting === 'true' : port === 465;
    const user = readEnv('SMTP_USER');
    const pass = normalizePassword(host, process.env.SMTP_PASS);

    this.from = readEnv('EMAIL_FROM') || user || '';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      logger: readEnv('SMTP_LOGGER') === 'true',
      debug: readEnv('SMTP_DEBUG') === 'true',
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  private getSender() {
    if (!this.from) {
      throw new ServiceUnavailableException('Email sender is not configured.');
    }

    return this.from;
  }

  private throwEmailError(label: string, error: unknown): never {
    const smtpError = error as {
      code?: string;
      command?: string;
      response?: string;
      responseCode?: number;
      message?: string;
    };

    console.error(`${label} EMAIL ERROR:`, {
      code: smtpError?.code,
      command: smtpError?.command,
      responseCode: smtpError?.responseCode,
      response: smtpError?.response,
      message: smtpError?.message,
    });

    throw new ServiceUnavailableException(
      `We could not send the ${label.toLowerCase()} email right now. Please try again shortly.`,
    );
  }

  async sendOtpEmail(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: this.getSender(),
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
      this.throwEmailError('OTP', error);
    }
  }

  async sendPasswordResetEmail(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: this.getSender(),
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
      this.throwEmailError('PASSWORD RESET', error);
    }
  }

  async sendInvoiceEmail(order: any) {
    try {
      await this.transporter.verify();

      const info = await this.transporter.sendMail({
        from: this.getSender(),
        to: order.email,
        subject: `Invoice for Order #${order.orderNumber}`,
        html: invoiceEmailTemplate(order),
      });

      console.log('EMAIL SENT:', info.messageId);

      return info;
    } catch (error) {
      this.throwEmailError('INVOICE', error);
    }
  }

  async sendOrderCustomerEmail(order: any, type: OrderCustomerEmailType) {
    try {
      await this.transporter.verify();

      const copy = orderCustomerEmailCopy(order, type);
      const info = await this.transporter.sendMail({
        from: this.getSender(),
        to: order.email,
        subject: copy.subject,
        html: orderCustomerEmailTemplate(order, type),
      });

      console.log('ORDER EMAIL SENT:', info.messageId);

      return info;
    } catch (error) {
      this.throwEmailError('ORDER', error);
    }
  }

  async sendContactInquiry(inquiry: ContactInquiry) {
    const to = readEnv('CONTACT_ADMIN_EMAIL') || this.from || readEnv('SMTP_USER');
    const from = this.getSender();

    if (!to || !from) {
      throw new ServiceUnavailableException('Contact email is not configured.');
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
      this.throwEmailError('CONTACT', error);
    }
  }
}
