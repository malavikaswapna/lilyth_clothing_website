// utils/productNotificationService.js
const User = require("../models/User");
const Product = require("../models/Product");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// ========================================
// EMAIL TRANSPORTER
// ========================================
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 465,
      secure: process.env.EMAIL_SECURE === "true" || true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  } else {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
};

// ========================================
// BASE SEND EMAIL FUNCTION
// ========================================
const sendEmail = async (to, { subject, html }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"LILYTH" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    throw error;
  }
};

// ========================================
// CHECK USER NOTIFICATION PREFERENCES
// ========================================
const canSendNotification = async (userId, notificationType) => {
  try {
    const user = await User.findById(userId).select("notificationSettings");

    if (!user) {
      return true; // Send by default if user not found
    }

    const settings = user.notificationSettings || {};

    // Map notification types to settings
    const settingsMap = {
      newArrivals: settings.newUsers !== false,
      backInStock: settings.lowStock !== false,
      priceDrops: settings.salesReports !== false,
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

// ========================================
// EMAIL TEMPLATES
// ========================================

// 1️⃣ NEW ARRIVALS EMAIL TEMPLATE
const newArrivalsEmailTemplate = (userName, products) => {
  const productHTML = products
    .map(
      (product) => `
    <div style="background: white; border-radius: 8px; overflow: hidden; margin-bottom: 20px; border: 1px solid #e5e7eb;">
      <img src="${product.images[0]?.url || ""}" 
           alt="${product.name}" 
           style="width: 100%; height: 250px; object-fit: cover;" />
      <div style="padding: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #44465d; font-size: 18px;">${
          product.name
        }</h3>
        <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">${
          product.brand
        }</p>
        ${
          product.salePrice
            ? `
          <div style="margin: 10px 0;">
            <span style="font-size: 20px; font-weight: bold; color: #c98b63;">₹${
              product.salePrice
            }</span>
            <span style="font-size: 16px; color: #999; text-decoration: line-through; margin-left: 10px;">₹${
              product.price
            }</span>
            <span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;">
              ${Math.round(
                ((product.price - product.salePrice) / product.price) * 100
              )}% OFF
            </span>
          </div>
        `
            : `
          <div style="margin: 10px 0;">
            <span style="font-size: 20px; font-weight: bold; color: #44465d;">₹${product.price}</span>
          </div>
        `
        }
        <a href="${process.env.CLIENT_URL}/product/${product.slug}" 
           style="display: inline-block; background: #44465d; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; margin-top: 10px; font-size: 14px;">
          View Product
        </a>
      </div>
    </div>
  `
    )
    .join("");

  return {
    subject: "✨ New Arrivals at LILYTH - Check Out What's Fresh!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #44465d 0%, #5a5c75 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px 20px; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px; letter-spacing: 2px;">LILYTH</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">✨ New Arrivals Just Dropped!</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #44465d;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #666;">
              Exciting news! We've just added some stunning new pieces to our collection. 
              Be among the first to check them out and find your next favorite outfit! 💃
            </p>
            
            <h2 style="color: #44465d; margin: 30px 0 20px 0; text-align: center; font-size: 24px;">
              Just Added to Our Collection
            </h2>
            
            ${productHTML}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/shop?filter=new" 
                 style="display: inline-block; background: #c98b63; color: white; padding: 16px 40px; 
                        text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                View All New Arrivals
              </a>
            </div>
            
            <div class="footer">
              <p>© 2025 LILYTH. All rights reserved.</p>
              <p style="margin-top: 10px;">
                <a href="${process.env.CLIENT_URL}" style="color: #c98b63; text-decoration: none;">Visit Website</a> | 
                <a href="${process.env.CLIENT_URL}/contact" style="color: #c98b63; text-decoration: none;">Contact Us</a>
              </p>
              <p style="margin-top: 10px; color: #999; font-size: 11px;">
                You received this email because you subscribed to new arrivals notifications.<br>
                <a href="${process.env.CLIENT_URL}/account/settings" style="color: #999;">Update preferences</a> | 
                <a href="${process.env.CLIENT_URL}/unsubscribe" style="color: #999;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

// 2️⃣ BACK IN STOCK EMAIL TEMPLATE
const backInStockEmailTemplate = (userName, product) => {
  return {
    subject: `🔔 Back in Stock: ${product.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px 20px; }
          .product-card { background: white; border-radius: 12px; overflow: hidden; margin: 20px 0; border: 2px solid #10b981; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px; letter-spacing: 2px;">LILYTH</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">🔔 Good News - It's Back!</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #44465d;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #666;">
              Great news! The item you've been waiting for is back in stock. Don't miss out this time! 🎉
            </p>
            
            <div class="product-card">
              <img src="${product.images[0]?.url || ""}" 
                   alt="${product.name}" 
                   style="width: 100%; height: 350px; object-fit: cover;" />
              <div style="padding: 25px;">
                <h2 style="margin: 0 0 10px 0; color: #44465d; font-size: 24px;">${
                  product.name
                }</h2>
                <p style="color: #666; margin: 0 0 15px 0; font-size: 16px;">${
                  product.brand
                }</p>
                
                ${
                  product.shortDescription
                    ? `<p style="color: #666; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">${product.shortDescription}</p>`
                    : ""
                }
                
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0;">
                  <p style="margin: 0; color: #065f46; font-weight: bold;">✓ Now Available</p>
                  <p style="margin: 5px 0 0 0; color: #059669; font-size: 14px;">
                    ${product.totalStock} units in stock
                  </p>
                </div>
                
                ${
                  product.salePrice
                    ? `
                  <div style="margin: 15px 0;">
                    <span style="font-size: 28px; font-weight: bold; color: #c98b63;">₹${
                      product.salePrice
                    }</span>
                    <span style="font-size: 20px; color: #999; text-decoration: line-through; margin-left: 10px;">₹${
                      product.price
                    }</span>
                    <span style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px; margin-left: 10px;">
                      ${Math.round(
                        ((product.price - product.salePrice) / product.price) *
                          100
                      )}% OFF
                    </span>
                  </div>
                `
                    : `
                  <div style="margin: 15px 0;">
                    <span style="font-size: 28px; font-weight: bold; color: #44465d;">₹${product.price}</span>
                  </div>
                `
                }
                
                <a href="${process.env.CLIENT_URL}/product/${product.slug}" 
                   style="display: inline-block; background: #10b981; color: white; padding: 16px 40px; 
                          text-decoration: none; border-radius: 8px; margin-top: 15px; font-size: 16px; font-weight: bold;">
                  Shop Now - Limited Stock!
                </a>
                
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                  ⚡ Hurry! Popular items sell out fast.
                </p>
              </div>
            </div>
            
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
                You received this email because this item is in your wishlist.<br>
                <a href="${
                  process.env.CLIENT_URL
                }/account/settings" style="color: #999;">Update preferences</a> | 
                <a href="${
                  process.env.CLIENT_URL
                }/unsubscribe" style="color: #999;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

// 3️⃣ PRICE DROP EMAIL TEMPLATE
const priceDropEmailTemplate = (userName, product, oldPrice, newPrice) => {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

  return {
    subject: `💰 Price Drop Alert: ${product.name} - Save ${discount}%!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px 20px; }
          .product-card { background: white; border-radius: 12px; overflow: hidden; margin: 20px 0; border: 2px solid #ef4444; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px; letter-spacing: 2px;">LILYTH</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">💰 Price Drop Alert!</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #44465d;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #666;">
              Excellent news! An item in your wishlist just got more affordable. Now's the perfect time to buy! 🎯
            </p>
            
            <div class="product-card">
              <div style="position: relative;">
                <img src="${product.images[0]?.url || ""}" 
                     alt="${product.name}" 
                     style="width: 100%; height: 350px; object-fit: cover;" />
                <div style="position: absolute; top: 20px; right: 20px; background: #ef4444; color: white; 
                            padding: 12px 20px; border-radius: 8px; font-size: 20px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  ${discount}% OFF
                </div>
              </div>
              <div style="padding: 25px;">
                <h2 style="margin: 0 0 10px 0; color: #44465d; font-size: 24px;">${
                  product.name
                }</h2>
                <p style="color: #666; margin: 0 0 15px 0; font-size: 16px;">${
                  product.brand
                }</p>
                
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 16px;">🔥 Price Dropped!</p>
                  <div style="margin-top: 10px;">
                    <div style="margin: 5px 0;">
                      <span style="color: #999; text-decoration: line-through; font-size: 18px;">Was: ₹${oldPrice}</span>
                    </div>
                    <div style="margin: 5px 0;">
                      <span style="color: #ef4444; font-size: 32px; font-weight: bold;">Now: ₹${newPrice}</span>
                    </div>
                    <div style="margin: 10px 0 0 0;">
                      <span style="color: #059669; font-size: 18px; font-weight: bold;">You Save: ₹${
                        oldPrice - newPrice
                      }</span>
                    </div>
                  </div>
                </div>
                
                <a href="${process.env.CLIENT_URL}/product/${product.slug}" 
                   style="display: inline-block; background: #ef4444; color: white; padding: 16px 40px; 
                          text-decoration: none; border-radius: 8px; margin-top: 15px; font-size: 16px; font-weight: bold;">
                  Grab This Deal Now!
                </a>
                
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                  ⏰ Limited time offer. Price may change anytime.
                </p>
              </div>
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                💡 <strong>Pro Tip:</strong> Prices can go back up at any time. Don't miss this opportunity!
              </p>
            </div>
            
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
                You received this email because this item is in your wishlist.<br>
                <a href="${
                  process.env.CLIENT_URL
                }/account/settings" style="color: #999;">Update preferences</a> | 
                <a href="${
                  process.env.CLIENT_URL
                }/unsubscribe" style="color: #999;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

// ========================================
// NOTIFICATION FUNCTIONS
// ========================================

// 1️⃣ SEND NEW ARRIVALS DIGEST (Weekly)
const sendNewArrivalsDigest = async () => {
  try {
    console.log("📦 Starting new arrivals digest...");

    // Get products added in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newProducts = await Product.find({
      status: "active",
      createdAt: { $gte: sevenDaysAgo },
    })
      .select("name slug brand images price salePrice")
      .limit(6)
      .sort({ createdAt: -1 })
      .lean();

    if (newProducts.length === 0) {
      console.log("📦 No new products in the last 7 days");
      return { success: true, sent: 0, message: "No new products" };
    }

    // Get all users with new arrivals notifications enabled
    const users = await User.find({
      "notificationSettings.newUsers": { $ne: false },
      isActive: true,
    }).select("_id firstName email");

    console.log(
      `📦 Found ${newProducts.length} new products and ${users.length} subscribed users`
    );

    let sent = 0;
    let failed = 0;

    // Send emails to all subscribed users
    for (const user of users) {
      try {
        const canSend = await canSendNotification(user._id, "newArrivals");
        if (!canSend) continue;

        const emailTemplate = newArrivalsEmailTemplate(
          user.firstName,
          newProducts
        );

        await sendEmail(user.email, emailTemplate);
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${user.email}:`, error);
        failed++;
      }
    }

    console.log(
      `✅ New arrivals digest complete: ${sent} sent, ${failed} failed`
    );
    return { success: true, sent, failed };
  } catch (error) {
    console.error("❌ Error sending new arrivals digest:", error);
    throw error;
  }
};

// 2️⃣ SEND BACK IN STOCK NOTIFICATIONS
const sendBackInStockNotification = async (productId) => {
  try {
    console.log(
      `🔔 Checking back in stock notification for product ${productId}`
    );

    const product = await Product.findById(productId)
      .select(
        "name slug brand images price salePrice shortDescription totalStock"
      )
      .lean();

    if (!product || product.totalStock === 0) {
      console.log("Product not found or still out of stock");
      return { success: false, message: "Product not available" };
    }

    // Convert productId to ObjectId for proper comparison
    const productObjectId = mongoose.Types.ObjectId.isValid(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

    console.log("🔍 Searching for users with productId:", productObjectId);

    // Find all users with this product in wishlist
    const users = await User.find({
      wishlist: productObjectId,
      "notificationSettings.lowStock": { $ne: false },
      isActive: true,
    }).select("_id firstName email wishlist");

    console.log(`🔔 Found ${users.length} users with this product in wishlist`);

    if (users.length === 0) {
      return { success: true, sent: 0, message: "No subscribers" };
    }

    let sent = 0;
    let failed = 0;

    // Send individual emails
    for (const user of users) {
      try {
        const canSend = await canSendNotification(user._id, "backInStock");
        if (!canSend) continue;

        const emailTemplate = backInStockEmailTemplate(user.firstName, product);

        await sendEmail(user.email, emailTemplate);
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${user.email}:`, error);
        failed++;
      }
    }

    console.log(
      `✅ Back in stock notifications complete: ${sent} sent, ${failed} failed`
    );
    return { success: true, sent, failed };
  } catch (error) {
    console.error("❌ Error sending back in stock notifications:", error);
    throw error;
  }
};

// 3️⃣ SEND PRICE DROP NOTIFICATIONS
const sendPriceDropNotification = async (productId, oldPrice, newPrice) => {
  try {
    console.log(`💰 Checking price drop notification for product ${productId}`);

    // Only notify if price dropped by at least 5%
    const discountPercentage = ((oldPrice - newPrice) / oldPrice) * 100;
    if (discountPercentage < 5) {
      console.log(
        `💰 Price drop too small (${discountPercentage.toFixed(
          1
        )}%), skipping notification`
      );
      return { success: false, message: "Price drop too small" };
    }

    const product = await Product.findById(productId)
      .select("name slug brand images price salePrice")
      .lean();

    if (!product) {
      console.log("Product not found");
      return { success: false, message: "Product not found" };
    }

    // Convert productId to ObjectId for proper comparison
    const productObjectId = mongoose.Types.ObjectId.isValid(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

    console.log("🔍 Searching for users with productId:", productObjectId);

    // Find all users with this product in wishlist
    const users = await User.find({
      wishlist: productObjectId,
      "notificationSettings.salesReports": { $ne: false },
      isActive: true,
    }).select("_id firstName email wishlist");

    console.log(`💰 Found ${users.length} users with this product in wishlist`);

    // Debug: If no users found, let's check why
    if (users.length === 0) {
      const allUsersWithWishlist = await User.find({
        wishlist: { $exists: true, $ne: [] },
        isActive: true,
      }).select("_id email wishlist");

      console.log(
        `🔍 Total users with non-empty wishlist: ${allUsersWithWishlist.length}`
      );

      if (allUsersWithWishlist.length > 0) {
        console.log("🔍 Checking if any wishlist contains this product...");
        for (const u of allUsersWithWishlist) {
          const hasProduct = u.wishlist.some(
            (wId) => wId.toString() === productId.toString()
          );
          if (hasProduct) {
            console.log(
              `✅ User ${u.email} has product in wishlist but notification setting might be disabled`
            );
            const userSettings = await User.findById(u._id).select(
              "notificationSettings"
            );
            console.log(
              "   Settings:",
              userSettings.notificationSettings.salesReports
            );
          }
        }
      }
    }

    if (users.length === 0) {
      return { success: true, sent: 0, message: "No subscribers" };
    }

    let sent = 0;
    let failed = 0;

    // Send individual emails
    for (const user of users) {
      try {
        const canSend = await canSendNotification(user._id, "priceDrops");
        if (!canSend) continue;

        const emailTemplate = priceDropEmailTemplate(
          user.firstName,
          product,
          oldPrice,
          newPrice
        );

        await sendEmail(user.email, emailTemplate);
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${user.email}:`, error);
        failed++;
      }
    }

    console.log(
      `✅ Price drop notifications complete: ${sent} sent, ${failed} failed`
    );
    return { success: true, sent, failed };
  } catch (error) {
    console.error("❌ Error sending price drop notifications:", error);
    throw error;
  }
};

// ========================================
// EXPORTS
// ========================================
module.exports = {
  sendNewArrivalsDigest,
  sendBackInStockNotification,
  sendPriceDropNotification,
};
