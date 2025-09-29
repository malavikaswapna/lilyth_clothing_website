// utils/emailService.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  emailVerification: (userName, verificationUrl) => ({
    subject: 'Verify Your Email - LILYTH',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px 20px; }
          .button { display: inline-block; background: #44465d; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LILYTH</h1>
            <h2>Email Verification</h2>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Thank you for registering with LILYTH! Please verify your email address to complete your registration.</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </div>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <div class="footer">
              <p>© 2025 LILYTH. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  orderConfirmation: (order, user) => ({
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px 20px; }
          .order-item { border-bottom: 1px solid #ddd; padding: 15px 0; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>Thank you for your order! We've received it and will process it shortly.</p>
            
            <h3>Order Details:</h3>
            ${order.items.map(item => `
              <div class="order-item">
                <p><strong>${item.productName}</strong></p>
                <p>Size: ${item.variant.size} | Color: ${item.variant.color.name}</p>
                <p>Quantity: ${item.quantity} × ₹${item.unitPrice} = ₹${item.totalPrice}</p>
              </div>
            `).join('')}
            
            <div class="total">
              <p>Subtotal: ₹${order.subtotal}</p>
              <p>Shipping: ₹${order.shipping.cost}</p>
              <p>Tax: ₹${order.tax}</p>
              <p>Total: ₹${order.total}</p>
            </div>
            
            <h3>Shipping Address:</h3>
            <p>
              ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
              ${order.shippingAddress.addressLine1}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}
            </p>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  orderStatusUpdate: (order, user, newStatus) => ({
    subject: `Order ${newStatus.toUpperCase()} - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px 20px; }
          .status { font-size: 24px; font-weight: bold; color: #44465d; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Update</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p class="status">Your order is now: ${newStatus.toUpperCase()}</p>
            
            ${newStatus === 'shipped' && order.tracking?.trackingNumber ? `
              <h3>Tracking Information:</h3>
              <p>Carrier: ${order.tracking.carrier}</p>
              <p>Tracking Number: ${order.tracking.trackingNumber}</p>
              <p><a href="${order.tracking.trackingUrl}">Track Your Package</a></p>
            ` : ''}
            
            <p>Thank you for shopping with LILYTH!</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  lowStockAlert: (product, variant) => ({
    subject: `Low Stock Alert - ${product.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #ff4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h1>⚠️ Low Stock Alert</h1>
          </div>
          <div class="content">
            <p><strong>Product:</strong> ${product.name}</p>
            <p><strong>SKU:</strong> ${product.sku}</p>
            ${variant ? `
              <p><strong>Variant:</strong> ${variant.size} - ${variant.color.name}</p>
              <p><strong>Remaining Stock:</strong> ${variant.stock}</p>
            ` : `
              <p><strong>Total Stock:</strong> ${product.totalStock}</p>
            `}
            <p>Please restock this item soon to avoid stockouts.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  contactForm: (data) => ({
    subject: `New Contact Form Submission: ${data.subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #44465d; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #44465d; }
          .value { margin-top: 5px; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #44465d; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Contact Form Submission</h1>
            <p>LILYTH Customer Support</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${data.name}</div>
            </div>
            
            <div class="field">
              <div class="label">Email:</div>
              <div class="value">${data.email}</div>
            </div>
            
            ${data.phone ? `
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${data.phone}</div>
              </div>
            ` : ''}
            
            ${data.orderNumber ? `
              <div class="field">
                <div class="label">Order Number:</div>
                <div class="value">${data.orderNumber}</div>
              </div>
            ` : ''}
            
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${data.subject}</div>
            </div>
            
            <div class="field">
              <div class="label">Message:</div>
              <div class="message-box">${data.message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="field">
              <div class="label">Submitted:</div>
              <div class="value">${data.submittedAt.toLocaleString()}</div>
            </div>
            
            <div class="field">
              <div class="label">IP Address:</div>
              <div class="value">${data.ipAddress}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  contactAutoReply: (data) => ({
    subject: `Thank you for contacting LILYTH - We've received your message`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You!</h1>
            <p>We've received your message</p>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>Thank you for reaching out to LILYTH. We've received your message about "${data.subject}" and our team will get back to you within 24 hours.</p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our customer service team will review your message</li>
              <li>You'll receive a response within 24 hours (Monday-Friday)</li>
              <li>For urgent matters, please call us directly</li>
            </ul>
            
            <p><strong>Contact Information:</strong></p>
            <p>
              Email: support@lilyth.com<br>
              Phone: +1 (555) 123-4567<br>
              Hours: Monday-Friday, 9AM-6PM
            </p>
            
            <p>Thank you for choosing LILYTH!</p>
            
            <div class="footer">
              <p>© 2025 LILYTH. All rights reserved.</p>
              <p>This is an automated response. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const transporter = createTransporter();
    const emailContent = typeof template === 'function' ? template(data) : template;
    
    const mailOptions = {
      from: `"LILYTH" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${emailContent.subject}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Specific email functions
const emailService = {
  sendVerificationEmail: async (user, token) => {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    const template = emailTemplates.emailVerification(user.firstName, verificationUrl);
    return sendEmail(user.email, template);
  },

  sendOrderConfirmation: async (order, user) => {
    const template = emailTemplates.orderConfirmation(order, user);
    return sendEmail(user.email, template);
  },

  sendOrderStatusUpdate: async (order, user, newStatus) => {
    const template = emailTemplates.orderStatusUpdate(order, user, newStatus);
    return sendEmail(user.email, template);
  },

  sendLowStockAlert: async (product, variant = null) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const template = emailTemplates.lowStockAlert(product, variant);
    return sendEmail(adminEmail, template);
  },

  sendContactFormEmail: async (data) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const template = emailTemplates.contactForm(data);
    return sendEmail(adminEmail, template);
  },

  sendContactAutoReply: async (data) => {
    const template = emailTemplates.contactAutoReply(data);
    return sendEmail(data.email, template);
  }
};

module.exports = emailService;