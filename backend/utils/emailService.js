// backend/utils/emailService.js
const nodemailer = require("nodemailer");
const User = require("../models/User");

// Create reusable transporter
const createTransporter = () => {
  // Priority: Custom SMTP (GoDaddy, cPanel, etc.)
  if (process.env.EMAIL_HOST) {
    console.log(`📧 Using custom SMTP: ${process.env.EMAIL_HOST}`);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 465,
      secure:
        process.env.EMAIL_SECURE === "true" || process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000, // 10 seconds
    });
  }
  // Fallback: Email service (Gmail, Outlook, etc.)
  else if (process.env.EMAIL_SERVICE) {
    console.log(`📧 Using email service: ${process.env.EMAIL_SERVICE}`);
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  // Last resort: Error
  else {
    throw new Error(
      "❌ Email configuration missing! Set EMAIL_HOST or EMAIL_SERVICE in .env"
    );
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

// add retry mechanism
const sendEmailWithRetry = async (emailOptions, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(emailOptions);
      console.log(`✅ Email sent successfully on attempt ${attempt}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Email attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        // Log to database for manual retry
        await logFailedEmail(emailOptions, error);
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
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

  lowStockAlert: (product, variant = null) => ({
    subject: `⚠️ Low Stock Alert - ${product.name}`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #f59e0b; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .alert h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; background: #f9fafb; border-radius: 0 0 8px 8px; }
        .product-info { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .stock-level { font-size: 24px; color: #dc2626; font-weight: bold; margin: 10px 0; }
        .warning { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 3px solid #dc2626; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="alert">
          <h1>⚠️ Low Stock Alert</h1>
        </div>
        <div class="content">
          <div class="product-info">
            <h2 style="margin-top: 0; color: #44465d;">${product.name}</h2>
            <p><strong>SKU:</strong> ${product.sku || "N/A"}</p>
            ${
              variant
                ? `
              <p><strong>Size:</strong> ${variant.size}</p>
              <p><strong>Color:</strong> ${variant.color?.name || "N/A"}</p>
              <p class="stock-level">Current Stock: ${variant.stock} units</p>
            `
                : `
              <p class="stock-level">Total Stock: ${product.totalStock} units</p>
            `
            }
          </div>
          
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Action Required</strong></p>
            <p style="margin: 5px 0 0 0;">This ${
              variant ? "variant" : "product"
            } is running low on stock. Consider restocking soon to avoid stockouts.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL}/admin/products" class="button">
              Manage Inventory
            </a>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            This is an automated alert from your LILYTH inventory monitoring system.
          </p>
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

  // ✅ ADD THIS NEW FUNCTION HERE - Guest Order Confirmation
  sendGuestOrderConfirmation: async (order, guestInfo) => {
    const { firstName, lastName, email } = guestInfo;

    const itemsList = order.items
      .map(
        (item) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 15px 10px;">
          <div style="display: flex; align-items: center;">
            <img src="${item.productImage}" 
                 alt="${item.productName}" 
                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
            <div>
              <div style="font-weight: 600; color: #1f2937;">${
                item.productName
              }</div>
              <div style="font-size: 14px; color: #6b7280;">
                Size: ${item.variant.size} | Color: ${item.variant.color.name}
              </div>
              <div style="font-size: 14px; color: #6b7280;">Qty: ${
                item.quantity
              }</div>
            </div>
          </div>
        </td>
        <td style="padding: 15px 10px; text-align: right; font-weight: 600;">
          ₹${item.totalPrice.toLocaleString()}
        </td>
      </tr>
    `
      )
      .join("");

    const trackingUrl = `${process.env.CLIENT_URL}/track-order/${order.trackingToken}`;

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #44465d 0%, #c98b63 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Thank You for Your Order!</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Order #${
              order.orderNumber
            }</p>
          </div>

          <!-- Guest Banner -->
          <div style="background: #fef3c7; padding: 15px 20px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>📧 Guest Checkout:</strong> You checked out as a guest. 
              <a href="${trackingUrl}" style="color: #d97706; text-decoration: underline;">
                Track your order here
              </a> or 
              <a href="${
                process.env.CLIENT_URL
              }/register?email=${encodeURIComponent(email)}" 
                 style="color: #d97706; text-decoration: underline;">
                create an account
              </a> to save your order history!
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px;">
              Hi ${firstName},
            </p>
            <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
              Thank you for shopping with LILYTH! We've received your order and ${
                order.paymentMethod === "cod"
                  ? "will start preparing it for shipment."
                  : "are waiting for payment confirmation."
              }
            </p>

            <!-- Order Items -->
            <h2 style="font-size: 18px; color: #1f2937; margin: 30px 0 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              Order Details
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsList}
            </table>

            <!-- Order Summary -->
            <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
              <h3 style="margin: 0 0 15px; font-size: 16px; color: #1f2937;">Order Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #4b5563;">
                <span>Subtotal:</span>
                <span>₹${order.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #4b5563;">
                <span>Shipping:</span>
                <span>₹${order.shipping.cost.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #4b5563;">
                <span>Tax (GST 18%):</span>
                <span>₹${order.tax.toLocaleString()}</span>
              </div>
              ${
                order.discount.amount > 0
                  ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #10b981;">
                <span>Discount:</span>
                <span>-₹${order.discount.amount.toLocaleString()}</span>
              </div>
              `
                  : ""
              }
              <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: bold; color: #1f2937;">
                <span>Total:</span>
                <span>₹${order.total.toLocaleString()}</span>
              </div>
            </div>

            <!-- Shipping Address -->
            <div style="margin-top: 30px;">
              <h3 style="font-size: 16px; color: #1f2937; margin: 0 0 10px;">Shipping Address</h3>
              <div style="color: #4b5563; line-height: 1.6;">
                ${order.shippingAddress.firstName} ${
      order.shippingAddress.lastName
    }<br>
                ${order.shippingAddress.addressLine1}<br>
                ${
                  order.shippingAddress.addressLine2
                    ? order.shippingAddress.addressLine2 + "<br>"
                    : ""
                }
                ${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.postalCode
    }<br>
                ${order.shippingAddress.country}
              </div>
            </div>

            <!-- Payment Method -->
            <div style="margin-top: 20px;">
              <h3 style="font-size: 16px; color: #1f2937; margin: 0 0 10px;">Payment Method</h3>
              <div style="color: #4b5563;">
                ${
                  order.paymentMethod === "cod"
                    ? "💵 Cash on Delivery"
                    : "💳 Online Payment"
                }
              </div>
            </div>

            <!-- Track Order Button -->
            <div style="margin-top: 30px; text-align: center;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #44465d 0%, #c98b63 100%); 
                        color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                        font-weight: 600; font-size: 16px;">
                Track Your Order
              </a>
            </div>

            <!-- Create Account CTA -->
            <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 16px;">Want to track all your orders in one place?</h3>
              <p style="margin: 0 0 15px; color: #3b82f6; font-size: 14px;">
                Create an account to save your order history and enjoy faster checkout next time!
              </p>
              <a href="${
                process.env.CLIENT_URL
              }/register?email=${encodeURIComponent(email)}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; font-weight: 600;">
                Create Account
              </a>
            </div>

            <!-- Help Section -->
            <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                <strong>Need help?</strong> Contact us at 
                <a href="mailto:support@lilyth.in" style="color: #c98b63;">support@lilyth.in</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              © 2024 LILYTH. All rights reserved.
            </p>
            <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
              This email was sent to ${email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail(email, {
      subject: `Order Confirmation - ${order.orderNumber} - LILYTH`,
      html: emailContent,
    });
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

  // Admin notifications (always send)
  sendLowStockAlert: async (product, variant = null) => {
    try {
      // Get admin email
      const User = require("../models/User");
      const admin = await User.findOne({
        role: "admin",
        "notificationSettings.lowStock": true,
      });

      if (!admin || !admin.email) {
        console.log(
          "⚠️ No admin email configured or low stock notifications disabled"
        );
        return { success: false, reason: "No admin email" };
      }

      const template = emailTemplates.lowStockAlert(product, variant);
      return sendEmail(admin.email, template);
    } catch (error) {
      console.error("Error sending low stock alert:", error);
      throw error;
    }
  },

  // Send new order notification to admin
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

  // ✅ NEW: Welcome back email for converted guest users
  sendWelcomeBackEmail: async (user, options = {}) => {
    const { ordersFound = 0 } = options;

    const subject = "Welcome Back to LILYTH! 🎉";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f2eb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #b87049 0%, #8b5a3c 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 400;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            margin: 0 0 15px 0;
            line-height: 1.8;
          }
          .highlight-box {
            background: #f0f7ff;
            border-left: 4px solid #b87049;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .highlight-box strong {
            color: #b87049;
            font-size: 16px;
            display: block;
            margin-bottom: 10px;
          }
          .benefits {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .benefits ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .benefits li {
            margin: 8px 0;
            color: #555;
          }
          .button {
            display: inline-block;
            padding: 14px 35px;
            background: #b87049;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 25px 0;
            font-weight: 500;
            text-align: center;
          }
          .button:hover {
            background: #8b5a3c;
          }
          .button-container {
            text-align: center;
          }
          .footer {
            background: #f4f2eb;
            text-align: center;
            padding: 30px 20px;
            color: #666;
            font-size: 13px;
          }
          .footer p {
            margin: 5px 0;
          }
          .footer a {
            color: #b87049;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome Back to LILYTH! 🎉</h1>
          </div>
          
          <div class="content">
            <p>Hi ${user.firstName},</p>
            
            <p>Great news! We've successfully created your account and linked your previous order${
              ordersFound > 1 ? "s" : ""
            }.</p>
            
            ${
              ordersFound > 0
                ? `
              <div class="highlight-box">
                <strong>📦 Your Order History Linked</strong>
                <p style="margin: 0;">
                  We found <strong style="color: #b87049;">${ordersFound}</strong> previous order${
                    ordersFound > 1 ? "s" : ""
                  } 
                  and linked ${
                    ordersFound > 1 ? "them" : "it"
                  } to your new account. 
                  You can now view and track ${
                    ordersFound > 1 ? "all your orders" : "your order"
                  } 
                  from your account dashboard!
                </p>
              </div>
            `
                : ""
            }
            
            <div class="benefits">
              <p><strong>What you can do now:</strong></p>
              <ul>
                <li>✅ View and track all your orders in one place</li>
                <li>✅ Save multiple addresses for faster checkout</li>
                <li>✅ Create and manage your wishlist</li>
                <li>✅ Get exclusive member-only offers</li>
                <li>✅ Easy returns and hassle-free refunds</li>
                <li>✅ Early access to new arrivals</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="${process.env.CLIENT_URL}/account/orders" class="button">
                View My Orders
              </a>
            </div>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, our support team is here to help! Just reply to this email or contact us at <a href="mailto:support@lilyth.in" style="color: #b87049;">support@lilyth.in</a></p>
            
            <p style="margin-top: 30px;">Happy shopping!</p>
            <p><strong>The LILYTH Team</strong></p>
          </div>
          
          <div class="footer">
            <p><strong>LILYTH</strong></p>
            <p>Premium Women's Fashion</p>
            <p>Kerala, India</p>
            <p style="margin-top: 15px;">
              <a href="${process.env.CLIENT_URL}">Visit Our Store</a> | 
              <a href="${process.env.CLIENT_URL}/contact">Contact Us</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome Back to LILYTH!

Hi ${user.firstName},

Great news! We've successfully created your account and linked your previous order${
      ordersFound > 1 ? "s" : ""
    }.

${
  ordersFound > 0
    ? `
📦 Your Order History Linked
We found ${ordersFound} previous order${
        ordersFound > 1 ? "s" : ""
      } and linked ${ordersFound > 1 ? "them" : "it"} to your new account.
You can now view and track ${
        ordersFound > 1 ? "all your orders" : "your order"
      } from your account dashboard!
`
    : ""
}

What you can do now:
✅ View and track all your orders in one place
✅ Save multiple addresses for faster checkout
✅ Create and manage your wishlist
✅ Get exclusive member-only offers
✅ Easy returns and hassle-free refunds
✅ Early access to new arrivals

View your orders: ${process.env.CLIENT_URL}/account/orders

If you have any questions, contact us at clothingbrand@lilyth.in

Happy shopping!
The LILYTH Team

---
LILYTH - Premium Women's Fashion
Kerala, India
    `;

    return sendEmail(user.email, {
      subject,
      html,
      text,
    });
  },

  // ✅ NEW: Guest order status update email
  sendGuestOrderStatusUpdate: async (order, guestInfo, newStatus) => {
    const { firstName, lastName, email } = guestInfo;

    const trackingUrl = `${process.env.CLIENT_URL}/track-order/${order.trackingToken}`;

    // Status-specific messages
    const statusMessages = {
      confirmed: {
        emoji: "✅",
        title: "Order Confirmed!",
        message:
          "Great news! We've confirmed your order and will start preparing it for shipment.",
        action: "Track Your Order",
      },
      processing: {
        emoji: "📦",
        title: "Order Processing",
        message: "Your order is being prepared and will be shipped soon.",
        action: "Track Your Order",
      },
      shipped: {
        emoji: "🚚",
        title: "Order Shipped!",
        message: "Exciting! Your order is on its way to you.",
        action: "Track Shipment",
      },
      delivered: {
        emoji: "🎉",
        title: "Order Delivered!",
        message: "Your order has been delivered. We hope you love it!",
        action: "View Order Details",
      },
      cancelled: {
        emoji: "❌",
        title: "Order Cancelled",
        message:
          "Your order has been cancelled. If you paid online, your refund will be processed within 5-7 business days.",
        action: "View Order Details",
      },
    };

    const statusInfo = statusMessages[newStatus] || {
      emoji: "📋",
      title: "Order Update",
      message: `Your order status has been updated to: ${newStatus}`,
      action: "View Order",
    };

    const subject = `${statusInfo.emoji} ${statusInfo.title} - Order #${order.orderNumber}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f2eb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #44465d 0%, #c98b63 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 400;
          }
          .status-badge {
            display: inline-block;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            margin-top: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .content {
            padding: 40px 30px;
          }
          .status-icon {
            text-align: center;
            font-size: 60px;
            margin: 20px 0;
          }
          .message-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            text-align: center;
          }
          .message-box h3 {
            margin: 0 0 10px 0;
            color: #44465d;
          }
          .message-box p {
            margin: 0;
            color: #6b7280;
          }
          .tracking-info {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .tracking-info strong {
            color: #1e40af;
            display: block;
            margin-bottom: 10px;
          }
          .button {
            display: inline-block;
            padding: 14px 35px;
            background: #44465d;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 25px 0;
            font-weight: 500;
          }
          .button:hover {
            background: #2d2f3d;
          }
          .button-container {
            text-align: center;
          }
          .order-summary {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .order-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .order-row:last-child {
            border-bottom: none;
          }
          .create-account-cta {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
          }
          .create-account-cta h4 {
            margin: 0 0 10px 0;
            color: #92400e;
          }
          .footer {
            background: #f4f2eb;
            text-align: center;
            padding: 30px 20px;
            color: #666;
            font-size: 13px;
          }
          .footer a {
            color: #c98b63;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.emoji} ${statusInfo.title}</h1>
            <div class="status-badge">Order #${order.orderNumber}</div>
          </div>
          
          <div class="content">
            <div class="status-icon">${statusInfo.emoji}</div>
            
            <p>Hi ${firstName},</p>
            
            <div class="message-box">
              <h3>${statusInfo.title}</h3>
              <p>${statusInfo.message}</p>
            </div>

            ${
              newStatus === "shipped" && order.tracking?.trackingNumber
                ? `
              <div class="tracking-info">
                <strong>📦 Tracking Information</strong>
                <p><strong>Carrier:</strong> ${
                  order.tracking.carrier || "Standard Shipping"
                }</p>
                <p><strong>Tracking Number:</strong> ${
                  order.tracking.trackingNumber
                }</p>
                ${
                  order.tracking.trackingUrl
                    ? `
                  <p><a href="${order.tracking.trackingUrl}" style="color: #3b82f6; text-decoration: underline;">Track Your Package</a></p>
                `
                    : ""
                }
                ${
                  order.tracking.estimatedDelivery
                    ? `
                  <p><strong>Estimated Delivery:</strong> ${new Date(
                    order.tracking.estimatedDelivery
                  ).toLocaleDateString()}</p>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            <div class="order-summary">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">Order Summary</h3>
              <div class="order-row">
                <span>Order Number:</span>
                <strong>#${order.orderNumber}</strong>
              </div>
              <div class="order-row">
                <span>Order Date:</span>
                <span>${new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div class="order-row">
                <span>Items:</span>
                <span>${order.items.length} item${
      order.items.length > 1 ? "s" : ""
    }</span>
              </div>
              <div class="order-row">
                <span>Total:</span>
                <strong>₹${order.total.toLocaleString()}</strong>
              </div>
            </div>

            <div class="button-container">
              <a href="${trackingUrl}" class="button">
                ${statusInfo.action}
              </a>
            </div>

            ${
              newStatus !== "cancelled"
                ? `
              <div class="create-account-cta">
                <h4>💡 Track All Your Orders Easily</h4>
                <p style="margin: 0 0 15px 0; color: #78350f;">
                  Create an account to view all your orders in one place, save addresses, and get exclusive offers!
                </p>
                <a href="${
                  process.env.CLIENT_URL
                }/register?email=${encodeURIComponent(email)}" 
                   style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px; font-weight: 600;">
                  Create Free Account
                </a>
              </div>
            `
                : ""
            }

            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Need help? Contact us at <a href="mailto:support@lilyth.in" style="color: #c98b63;">support@lilyth.in</a>
            </p>
          </div>
          
          <div class="footer">
            <p><strong>LILYTH</strong></p>
            <p>Premium Women's Fashion</p>
            <p>Kerala, India</p>
            <p style="margin-top: 15px;">
              <a href="${trackingUrl}">Track Order</a> | 
              <a href="${process.env.CLIENT_URL}/contact">Contact Us</a>
            </p>
            <p style="margin-top: 10px; color: #9ca3af; font-size: 12px;">
              This email was sent to ${email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${statusInfo.emoji} ${statusInfo.title} - Order #${order.orderNumber}

Hi ${firstName},

${statusInfo.message}

Order Details:
- Order Number: #${order.orderNumber}
- Order Date: ${new Date(order.createdAt).toLocaleDateString()}
- Items: ${order.items.length}
- Total: ₹${order.total.toLocaleString()}

${
  newStatus === "shipped" && order.tracking?.trackingNumber
    ? `
Tracking Information:
- Carrier: ${order.tracking.carrier || "Standard Shipping"}
- Tracking Number: ${order.tracking.trackingNumber}
${order.tracking.trackingUrl ? `- Track: ${order.tracking.trackingUrl}` : ""}
`
    : ""
}

Track your order: ${trackingUrl}

${
  newStatus !== "cancelled"
    ? `
Create an account to view all your orders in one place:
${process.env.CLIENT_URL}/register?email=${encodeURIComponent(email)}
`
    : ""
}

Need help? Contact: support@lilyth.in

LILYTH - Premium Women's Fashion
Kerala, India
    `;

    return sendEmail(email, {
      subject,
      html,
      text,
    });
  },
};

module.exports = emailService;
