// utils/emailService.js
const nodemailer = require("nodemailer");
const User = require("../models/User");

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

// ✨ NEW: Check user notification preferences before sending
const canSendNotification = async (userId, notificationType) => {
  try {
    const user = await User.findById(userId).select("notificationSettings");

    if (!user) {
      console.log(`⚠️ User ${userId} not found, defaulting to send`);
      return true; // Send by default if user not found
    }

    const settings = user.notificationSettings || {};

    // Map notification types to settings
    const settingsMap = {
      orderUpdates: settings.orderUpdates !== false, // Order confirmations, shipping, delivery
      promotions: settings.emailNotifications !== false, // Sales & promotions
      newArrivals: settings.newUsers !== false, // New products
      backInStock: settings.lowStock !== false, // Back in stock alerts
      priceDrops: settings.salesReports !== false, // Price drop alerts
      system: settings.systemUpdates !== false, // System/critical notifications
    };

    const canSend = settingsMap[notificationType] !== false;

    if (!canSend) {
      console.log(
        `🔕 User ${userId} has disabled ${notificationType} notifications`
      );
    }

    return canSend;
  } catch (error) {
    console.error("Error checking notification settings:", error);
    return true; // Send by default on error
  }
};

// Base send email function
const sendEmail = async (to, { subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"LILYTH" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
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
            <h2>${product.name}</h2>
            <p><strong>Size:</strong> ${variant.size}</p>
            <p><strong>Color:</strong> ${variant.color.name}</p>
            <p><strong>Current Stock:</strong> ${variant.stock} units</p>
            <p style="color: #ff4444; font-weight: bold;">Action may be required!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  newOrderNotification: (order) => ({
    subject: `🛍️ New Order #${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .header h2 { margin: 0; font-size: 20px; font-weight: normal; }
          .content { padding: 20px; background: #f9fafb; }
          .order-info { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #10b981; }
          .order-info h3 { margin: 0 0 15px 0; color: #10b981; font-size: 18px; }
          .order-info p { margin: 8px 0; }
          .order-info strong { color: #374151; }
          .items-list { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; }
          .item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .item:last-child { border-bottom: none; }
          .item-name { font-weight: bold; color: #374151; }
          .item-details { color: #6b7280; font-size: 14px; margin-top: 4px; }
          .total-box { background: #ecfdf5; padding: 20px; margin: 15px 0; border-radius: 8px; border: 2px solid #10b981; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-label { color: #374151; }
          .total-value { font-weight: bold; color: #374151; }
          .total-final { font-size: 20px; color: #10b981; margin-top: 12px; padding-top: 12px; border-top: 2px solid #10b981; }
          .button { display: inline-block; background: #44465d; color: white; padding: 14px 28px; 
                   text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; }
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ New Order Received!</h1>
            <h2>Order #${order.orderNumber}</h2>
          </div>
          <div class="content">
            <div class="order-info">
              <h3>👤 Customer Details</h3>
              <p><strong>Name:</strong> ${order.user.firstName} ${
      order.user.lastName
    }</p>
              <p><strong>Email:</strong> <a href="mailto:${
                order.user.email
              }" style="color: #10b981; text-decoration: none;">${
      order.user.email
    }</a></p>
              <p><strong>Phone:</strong> ${
                order.shippingAddress.phone || "Not provided"
              }</p>
            </div>
            
            <div class="order-info">
              <h3>💰 Payment Information</h3>
              <p><strong>Payment Method:</strong> ${order.payment.method
                .toUpperCase()
                .replace(/_/g, " ")}</p>
              <p><strong>Payment Status:</strong> 
                <span class="status-badge status-${order.payment.status}">
                  ${
                    order.payment.status === "completed" ||
                    order.payment.status === "paid"
                      ? "✅ Paid"
                      : "⏳ Pending"
                  }
                </span>
              </p>
              ${
                order.payment.transactionId
                  ? `<p><strong>Transaction ID:</strong> ${order.payment.transactionId}</p>`
                  : ""
              }
            </div>

            <div class="items-list">
              <h3 style="margin: 0 0 15px 0; color: #374151;">📦 Order Items (${
                order.items.length
              })</h3>
              ${order.items
                .map(
                  (item) => `
                <div class="item">
                  <div class="item-name">${item.productName}</div>
                  <div class="item-details">
                    Size: ${item.variant.size} | Color: ${item.variant.color.name} | 
                    Qty: ${item.quantity} × ₹${item.unitPrice} = ₹${item.totalPrice}
                  </div>
                </div>
              `
                )
                .join("")}
            </div>

            <div class="total-box">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">₹${order.subtotal}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Shipping:</span>
                <span class="total-value">₹${order.shipping.cost}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Tax:</span>
                <span class="total-value">₹${order.tax}</span>
              </div>
              ${
                order.discount && order.discount.amount > 0
                  ? `
                <div class="total-row">
                  <span class="total-label">Discount${
                    order.discount.code ? ` (${order.discount.code})` : ""
                  }:</span>
                  <span class="total-value" style="color: #10b981;">-₹${
                    order.discount.amount
                  }</span>
                </div>
              `
                  : ""
              }
              <div class="total-row total-final">
                <span class="total-label">Total:</span>
                <span class="total-value">₹${order.total}</span>
              </div>
            </div>

            <div class="order-info">
              <h3>📍 Shipping Address</h3>
              <p>
                ${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }<br>
                ${
                  order.shippingAddress.company
                    ? `${order.shippingAddress.company}<br>`
                    : ""
                }
                ${order.shippingAddress.addressLine1}<br>
                ${
                  order.shippingAddress.addressLine2
                    ? `${order.shippingAddress.addressLine2}<br>`
                    : ""
                }
                ${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.postalCode
    }<br>
                ${order.shippingAddress.country}
              </p>
            </div>

            ${
              order.specialInstructions
                ? `
              <div class="order-info">
                <h3>📝 Special Instructions</h3>
                <p>${order.specialInstructions}</p>
              </div>
            `
                : ""
            }

            ${
              order.isGift && order.giftMessage
                ? `
              <div class="order-info">
                <h3>🎁 Gift Message</h3>
                <p>${order.giftMessage}</p>
              </div>
            `
                : ""
            }

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/admin/orders/${
      order._id
    }" class="button">
                View Order in Admin Panel
              </a>
            </div>

            <div class="footer">
              <p><strong>Action Required:</strong> Process this order and update shipping status.</p>
              <p>Order received at: ${new Date(
                order.createdAt
              ).toLocaleString()}</p>
              <p>© 2025 LILYTH. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordReset: (userName, resetUrl) => ({
    subject: "Password Reset Request - LILYTH",
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
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  contactFormSubmission: (name, email, message) => ({
    subject: `New Contact Form Submission from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #44465d; color: white; padding: 20px; }
          .content { background: #f9f9f9; padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #44465d; }
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
              <div>${name}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div>${email}</div>
            </div>
            <div class="field">
              <div class="label">Message:</div>
              <div>${message}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  orderCancellation: (order, user, reason) => ({
    subject: `Order Cancelled - ${order.orderNumber}`,
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Cancelled</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>Your order has been cancelled.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
            <p>If you paid for this order, your refund will be processed within 5-7 business days.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// ✨ ENHANCED: Email service with notification settings check
const emailService = {
  // ✅ System emails (always send - critical)
  sendEmailVerification: async (user, verificationToken) => {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const template = emailTemplates.emailVerification(
      user.firstName,
      verificationUrl
    );
    return sendEmail(user.email, template);
  },

  sendPasswordReset: async (user, resetToken) => {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const template = emailTemplates.passwordReset(user.firstName, resetUrl);
    return sendEmail(user.email, template);
  },

  // ✅ Order Confirmation (ALWAYS SEND - Critical transaction receipt)
  sendOrderConfirmation: async (order, user) => {
    // ⚠️ ALWAYS send order confirmation - it's a transaction receipt
    // Users need proof of purchase regardless of preferences
    console.log(`📧 Sending order confirmation to ${user.email} (always sent)`);

    const template = emailTemplates.orderConfirmation(order, user);
    return sendEmail(user.email, template);
  },

  // ✅ Order Status Updates (respect orderUpdates setting for non-critical updates)
  sendOrderStatusUpdate: async (order, user, newStatus) => {
    // Check if user wants order status update emails
    const canSend = await canSendNotification(user._id, "orderUpdates");
    if (!canSend) {
      console.log(
        `📧 Skipping order status update for user ${user._id} (disabled)`
      );
      return {
        success: true,
        skipped: true,
        reason: "User disabled order notifications",
      };
    }

    const template = emailTemplates.orderStatusUpdate(order, user, newStatus);
    return sendEmail(user.email, template);
  },

  // ✅ Order Cancellation (ALWAYS SEND - Critical transaction notification)
  sendOrderCancellation: async (order, user, reason) => {
    // ⚠️ ALWAYS send cancellation - users need to know about refunds
    console.log(`📧 Sending order cancellation to ${user.email} (always sent)`);

    const template = emailTemplates.orderCancellation(order, user, reason);
    return sendEmail(user.email, template);
  },

  // ✅ Admin notifications (always send)
  sendLowStockAlert: async (adminEmail, product, variant) => {
    const template = emailTemplates.lowStockAlert(product, variant);
    return sendEmail(adminEmail, template);
  },

  // ✅ NEW: Send new order notification to admin
  sendNewOrderNotification: async (adminEmail, order) => {
    // ⚠️ Always send - admins need to know about new orders
    console.log(`📧 Sending new order notification to admin (always sent)`);

    const template = emailTemplates.newOrderNotification(order);
    return sendEmail(adminEmail, template);
  },

  sendContactFormNotification: async (adminEmail, { name, email, message }) => {
    const template = emailTemplates.contactFormSubmission(name, email, message);
    return sendEmail(adminEmail, template);
  },

  // Weekly sales report
  sendWeeklySalesReport: async (
    adminEmail,
    { totalRevenue, totalOrders, avgOrderValue, topOrders = null }
  ) => {
    const template = {
      subject: `Weekly Sales Report - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8b5cf6; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">📊 Weekly Sales Report</h1>
            <p style="margin: 10px 0 0 0;">${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Summary</h2>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">₹${Math.round(
                  totalRevenue
                )}</div>
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

  // ✅ Newsletter emails (respect emailNotifications/promotions setting)
  sendNewsletterWelcome: async ({
    email,
    isReturning = false,
    userId = null,
  }) => {
    // If userId provided, check preferences
    if (userId) {
      const canSend = await canSendNotification(userId, "promotions");
      if (!canSend) {
        console.log(
          `📧 Skipping newsletter welcome for user ${userId} (disabled)`
        );
        return {
          success: true,
          skipped: true,
          reason: "User disabled promotional emails",
        };
      }
    }

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
    userId = null,
  }) => {
    // If userId provided and not preview, check preferences
    if (userId && !isPreview) {
      const canSend = await canSendNotification(userId, "promotions");
      if (!canSend) {
        console.log(
          `📧 Skipping newsletter campaign for user ${userId} (disabled)`
        );
        return {
          success: true,
          skipped: true,
          reason: "User disabled promotional emails",
        };
      }
    }

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
  sendEmail: async ({
    to,
    subject,
    html,
    text,
    userId = null,
    notificationType = "system",
  }) => {
    // If userId provided, check preferences (unless it's a system notification)
    if (userId && notificationType !== "system") {
      const canSend = await canSendNotification(userId, notificationType);
      if (!canSend) {
        console.log(
          `📧 Skipping email for user ${userId} (disabled ${notificationType})`
        );
        return {
          success: true,
          skipped: true,
          reason: `User disabled ${notificationType} notifications`,
        };
      }
    }

    const template = { subject, html };
    return sendEmail(to, template);
  },
};

module.exports = emailService;
