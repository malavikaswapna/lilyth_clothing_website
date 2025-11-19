// utils/emailService.js
const nodemailer = require("nodemailer");

// Create reusable transporter
const createTransporter = () => {
  // Check if using a service (like Gmail) or custom SMTP
  if (process.env.EMAIL_SERVICE) {
    // Using email service (Gmail, Outlook, etc.)
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else if (process.env.EMAIL_HOST) {
    // Using custom SMTP server (cPanel, GoDaddy, etc.)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 465,
      secure: process.env.EMAIL_SECURE === "true" || true, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Helpful for self-signed certificates
      },
    });
  } else {
    // Fallback to Gmail
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
};

// Email templates
const emailTemplates = {
  emailVerification: (userName, verificationUrl) => ({
    subject: "Verify Your Email - LILYTH",
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
    `,
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
            ${order.items
              .map(
                (item) => `
              <div class="order-item">
                <p><strong>${item.productName}</strong></p>
                <p>Size: ${item.variant.size} | Color: ${item.variant.color.name}</p>
                <p>Quantity: ${item.quantity} × ₹${item.unitPrice} = ₹${item.totalPrice}</p>
              </div>
            `
              )
              .join("")}
            
            <div class="total">
              <p>Subtotal: ₹${order.subtotal}</p>
              <p>Shipping: ₹${order.shipping.cost}</p>
              <p>Tax: ₹${order.tax}</p>
              <p>Total: ₹${order.total}</p>
            </div>
            
            <h3>Shipping Address:</h3>
            <p>
              ${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }<br>
              ${order.shippingAddress.addressLine1}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.postalCode
    }
            </p>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
        </div>
      </body>
      </html>
    `,
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
            
            ${
              newStatus === "shipped" && order.tracking?.trackingNumber
                ? `
              <h3>Tracking Information:</h3>
              <p>Carrier: ${order.tracking.carrier}</p>
              <p>Tracking Number: ${order.tracking.trackingNumber}</p>
              <p><a href="${order.tracking.trackingUrl}">Track Your Package</a></p>
            `
                : ""
            }
            
            <p>Thank you for shopping with LILYTH!</p>
          </div>
        </div>
      </body>
      </html>
    `,
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
            ${
              variant
                ? `
              <p><strong>Variant:</strong> ${variant.size} - ${variant.color.name}</p>
              <p><strong>Remaining Stock:</strong> ${variant.stock}</p>
            `
                : `
              <p><strong>Total Stock:</strong> ${product.totalStock}</p>
            `
            }
            <p>Please restock this item soon to avoid stockouts.</p>
          </div>
        </div>
      </body>
      </html>
    `,
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
          </div>
          <div class="content">
            <div class="field">
              <div class="label">From:</div>
              <div class="value">${data.name}</div>
            </div>
            
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${data.email}">${
      data.email
    }</a></div>
            </div>
            
            ${
              data.phone
                ? `
            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">${data.phone}</div>
            </div>
            `
                : ""
            }
            
            ${
              data.orderNumber
                ? `
            <div class="field">
              <div class="label">Order Number:</div>
              <div class="value">${data.orderNumber}</div>
            </div>
            `
                : ""
            }
            
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${data.subject}</div>
            </div>
            
            <div class="field">
              <div class="label">Message:</div>
              <div class="message-box">${data.message}</div>
            </div>
            
            <div class="field">
              <div class="label">Submitted:</div>
              <div class="value">${new Date(
                data.submittedAt
              ).toLocaleString()}</div>
            </div>
            
            ${
              data.ipAddress
                ? `
            <div class="field">
              <div class="label">IP Address:</div>
              <div class="value">${data.ipAddress}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  contactAutoReply: (data) => ({
    subject: `We received your message - LILYTH`,
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
            <h1>LILYTH</h1>
            <h2>Thank You for Contacting Us</h2>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>Thank you for reaching out to LILYTH. We've received your message regarding: <strong>${data.subject}</strong></p>
            <p>Our team will review your inquiry and respond within 24 hours.</p>
                        <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our customer service team will review your message</li>
              <li>You'll receive a response within 24 hours (Monday-Friday)</li>
              <li>For urgent matters, please text us directly</li>
            </ul>
            
            <p><strong>Contact Information:</strong></p>
            <p>
              Email: clothingbrand@lilyth.in<br>
              Phone: +91 9447598431<br>
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
    `,
  }),
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const transporter = createTransporter();
    const emailContent =
      typeof template === "function" ? template(data) : template;

    const mailOptions = {
      from: `"LILYTH" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${emailContent.subject}`);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};

// Specific email functions
const emailService = {
  sendVerificationEmail: async (user, token) => {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    const template = emailTemplates.emailVerification(
      user.firstName,
      verificationUrl
    );
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
  },

  sendAdminOrderNotification: async ({ adminEmail, order }) => {
    const template = {
      subject: `🎉 New Order #${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
            <h1>New Order Received!</h1>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <h2>Order #${order.orderNumber}</h2>
            <p><strong>Customer:</strong> ${
              order.shippingAddress?.firstName || "N/A"
            } ${order.shippingAddress?.lastName || ""}</p>
            <p><strong>Total:</strong> ₹${
              order.total?.toLocaleString() || 0
            }</p>
            <p><strong>Items:</strong> ${order.items?.length || 0}</p>
            <p><strong>Date:</strong> ${new Date(
              order.createdAt
            ).toLocaleString()}</p>
            <a href="${process.env.CLIENT_URL}/admin/orders" 
               style="display: inline-block; background: #3b82f6; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Orders
            </a>
          </div>
        </div>
      `,
    };
    return sendEmail(adminEmail, template);
  },

  sendNewUserNotification: async ({ adminEmail, user }) => {
    const template = {
      subject: `👤 New User Registration`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>New User Registered!</h1>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Date:</strong> ${new Date(
              user.createdAt
            ).toLocaleString()}</p>
            <a href="${process.env.CLIENT_URL}/admin/users" 
               style="display: inline-block; background: #10b981; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Users
            </a>
          </div>
        </div>
      `,
    };
    return sendEmail(adminEmail, template);
  },

  sendWeeklySalesReport: async ({
    adminEmail,
    startDate,
    endDate,
    totalRevenue,
    totalOrders,
    orders,
  }) => {
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const topOrders = orders
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(
        (o) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px;">#${o.orderNumber}</td>
          <td style="padding: 10px;">₹${o.total.toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const template = {
      subject: `📊 Weekly Sales Report - ${totalOrders} Orders`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8b5cf6; color: white; padding: 20px; text-align: center;">
            <h1>📊 Weekly Sales Report</h1>
            <p style="margin: 0;">
              ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
            </p>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">₹${totalRevenue.toLocaleString()}</div>
                <div style="color: #6b7280; font-size: 14px;">Total Revenue</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${totalOrders}</div>
                <div style="color: #6b7280; font-size: 14px;">Total Orders</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">₹${Math.round(
                  avgOrderValue
                )}</div>
                <div style="color: #6b7280; font-size: 14px;">Avg Order</div>
              </div>
            </div>
            
            ${
              topOrders
                ? `
              <h3 style="color: #1f2937;">Top Orders</h3>
              <table style="width: 100%; border-collapse: collapse; background: white;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Order</th>
                    <th style="padding: 10px; text-align: left;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${topOrders}
                </tbody>
              </table>
            `
                : ""
            }
            
            <a href="${process.env.CLIENT_URL}/admin/reports" 
               style="display: inline-block; background: #8b5cf6; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Full Report
            </a>
          </div>
        </div>
      `,
    };
    return sendEmail(adminEmail, template);
  },

  // Newsletter welcome email
  sendNewsletterWelcome: async ({ email, isReturning = false }) => {
    const template = {
      subject: isReturning
        ? "Welcome Back to LILYTH!"
        : "Welcome to LILYTH Newsletter!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #44465d; color: white; padding: 40px 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .button { display: inline-block; background: #c98b63; color: white; padding: 15px 30px; 
                     text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .benefit-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .benefit-item:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LILYTH</h1>
              <h2>${
                isReturning ? "Welcome Back!" : "Welcome to Our Newsletter!"
              }</h2>
            </div>
            <div class="content">
              <p>${
                isReturning
                  ? "We're thrilled to have you back! You'll once again receive the latest updates from LILYTH."
                  : "Thank you for subscribing to our newsletter! We're excited to have you join our fashion community."
              }</p>
              
              <div class="benefits">
                <h3 style="margin-top: 0; color: #44465d;">What You'll Receive:</h3>
                <div class="benefit-item">
                  <strong>✨ Exclusive Offers</strong><br>
                  <span style="color: #666;">Be the first to know about special discounts and promotions</span>
                </div>
                <div class="benefit-item">
                  <strong>🆕 New Arrivals</strong><br>
                  <span style="color: #666;">Get early access to our latest collections</span>
                </div>
                <div class="benefit-item">
                  <strong>📦 Sale Alerts</strong><br>
                  <span style="color: #666;">Never miss out on our seasonal sales</span>
                </div>
                <div class="benefit-item">
                  <strong>💡 Style Tips</strong><br>
                  <span style="color: #666;">Fashion inspiration and styling advice</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${
                  process.env.CLIENT_URL
                }/shop" class="button">Start Shopping</a>
              </div>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                We respect your inbox. You can update your preferences or unsubscribe at any time.
              </p>

              <div class="footer">
                <p>© 2025 LILYTH. All rights reserved.</p>
                <p style="margin-top: 10px;">
                  <a href="${
                    process.env.CLIENT_URL
                  }" style="color: #c98b63; text-decoration: none;">Visit Website</a> | 
                  <a href="${
                    process.env.CLIENT_URL
                  }/contact" style="color: #c98b63; text-decoration: none;">Contact Us</a>
                </p>
                <p style="margin-top: 10px; color: #999; font-size: 11px;">
                  This email was sent to ${email} because you subscribed to our newsletter.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    return sendEmail(email, template);
  },

  // Newsletter campaign email
  sendNewsletterCampaign: async ({
    email,
    subject,
    message,
    campaignType,
    isPreview = false,
  }) => {
    const template = {
      subject: isPreview ? `[PREVIEW] ${subject}` : subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #44465d; color: white; padding: 40px 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .button { display: inline-block; background: #c98b63; color: white; padding: 15px 30px; 
                     text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666; }
            ${
              isPreview
                ? ".preview-banner { background: #fbbf24; color: #78350f; padding: 10px; text-align: center; font-weight: bold; }"
                : ""
            }
          </style>
        </head>
        <body>
          ${
            isPreview
              ? '<div class="preview-banner">⚠️ THIS IS A PREVIEW EMAIL - NOT SENT TO SUBSCRIBERS ⚠️</div>'
              : ""
          }
          <div class="container">
            <div class="header">
              <h1>LILYTH</h1>
            </div>
            <div class="content">
              ${message}
              
              <div class="footer">
                <p>© 2025 LILYTH. All rights reserved.</p>
                <p style="margin-top: 10px;">
                  <a href="${
                    process.env.CLIENT_URL
                  }" style="color: #c98b63; text-decoration: none;">Visit Website</a> | 
                  <a href="${
                    process.env.CLIENT_URL
                  }/contact" style="color: #c98b63; text-decoration: none;">Contact Us</a>
                </p>
                <p style="margin-top: 10px; color: #999; font-size: 11px;">
                  You received this email because you subscribed to LILYTH newsletter.<br>
                  <a href="${
                    process.env.CLIENT_URL
                  }/unsubscribe?email=${email}" style="color: #999;">Unsubscribe</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    return sendEmail(email, template);
  },

  // Generic send email for custom notifications
  sendEmail: async ({ to, subject, html, text }) => {
    const template = { subject, html };
    return sendEmail(to, template);
  },
};

module.exports = emailService;
