// EMAIL TESTING SUITE FOR LILYTH - FIXED VERSION
// Save as: backend/scripts/testEmails.js
// Run with: node backend/scripts/testEmails.js

require("dotenv").config();
const mongoose = require("mongoose");
const emailService = require("../utils/emailService");

// Test email address - CHANGE THIS TO YOUR EMAIL
const TEST_EMAIL = "malavika.s212@gmail.com";

console.log("\n🧪 LILYTH Email Testing Suite");
console.log("=".repeat(60));

// Color codes for terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
};

// Test functions - Using CORRECT function names
const tests = {
  // Test 1: Email Verification
  async testEmailVerification() {
    console.log("\n📧 Test 1: Email Verification");
    console.log("-".repeat(60));

    try {
      const mockUser = {
        firstName: "Test",
        lastName: "User",
        email: TEST_EMAIL,
      };
      const mockToken = "test-verification-token-123";

      // ✅ CORRECT: sendEmailVerification (not sendVerificationEmail)
      await emailService.sendEmailVerification(mockUser, mockToken);
      log.success("Email verification sent successfully");
      log.info(`Check ${TEST_EMAIL} for verification email`);
      return true;
    } catch (error) {
      log.error(`Email verification failed: ${error.message}`);
      return false;
    }
  },

  // Test 2: Password Reset
  async testPasswordReset() {
    console.log("\n🔑 Test 2: Password Reset");
    console.log("-".repeat(60));

    try {
      const mockUser = {
        firstName: "Test",
        lastName: "User",
        email: TEST_EMAIL,
      };
      const mockToken = "test-reset-token-456";

      await emailService.sendPasswordReset(mockUser, mockToken);
      log.success("Password reset email sent successfully");
      log.info(`Check ${TEST_EMAIL} for reset email`);
      return true;
    } catch (error) {
      log.error(`Password reset failed: ${error.message}`);
      return false;
    }
  },

  // Test 3: Order Confirmation
  async testOrderConfirmation() {
    console.log("\n🛍️  Test 3: Order Confirmation");
    console.log("-".repeat(60));

    try {
      const mockUser = {
        firstName: "Test",
        lastName: "User",
        email: TEST_EMAIL,
        _id: "test-user-id",
      };

      const mockOrder = {
        orderNumber: "ORD-TEST-001",
        items: [
          {
            productName: "Elegant Summer Dress",
            variant: {
              size: "M",
              color: { name: "Blue" },
            },
            quantity: 2,
            unitPrice: 1499,
            totalPrice: 2998,
          },
        ],
        subtotal: 2998,
        shipping: { cost: 99 },
        tax: 449,
        total: 3546,
        shippingAddress: {
          firstName: "Test",
          lastName: "User",
          addressLine1: "123 Test Street",
          city: "Trivandrum",
          state: "Kerala",
          postalCode: "695001",
        },
      };

      await emailService.sendOrderConfirmation(mockOrder, mockUser);
      log.success("Order confirmation sent successfully");
      log.info(`Check ${TEST_EMAIL} for order confirmation`);
      return true;
    } catch (error) {
      log.error(`Order confirmation failed: ${error.message}`);
      return false;
    }
  },

  // Test 4: Order Status Update
  async testOrderStatusUpdate() {
    console.log("\n📦 Test 4: Order Status Update");
    console.log("-".repeat(60));

    try {
      const mockUser = {
        firstName: "Test",
        lastName: "User",
        email: TEST_EMAIL,
        _id: "test-user-id",
      };

      const mockOrder = {
        orderNumber: "ORD-TEST-001",
        items: [
          {
            productName: "Elegant Summer Dress",
            quantity: 2,
          },
        ],
        total: 3546,
        tracking: {
          trackingNumber: "TRK123456789",
          carrier: "Delhivery",
        },
      };

      await emailService.sendOrderStatusUpdate(mockOrder, mockUser, "shipped");
      log.success("Order status update sent successfully");
      log.info(`Check ${TEST_EMAIL} for shipping notification`);
      return true;
    } catch (error) {
      log.error(`Order status update failed: ${error.message}`);
      return false;
    }
  },

  // Test 5: Newsletter Welcome
  async testNewsletterWelcome() {
    console.log("\n📰 Test 5: Newsletter Welcome");
    console.log("-".repeat(60));

    try {
      await emailService.sendNewsletterWelcome({
        email: TEST_EMAIL,
        isReturning: false,
      });
      log.success("Newsletter welcome sent successfully");
      log.info(`Check ${TEST_EMAIL} for welcome email`);
      return true;
    } catch (error) {
      log.error(`Newsletter welcome failed: ${error.message}`);
      return false;
    }
  },

  // Test 6: Newsletter Campaign
  async testNewsletterCampaign() {
    console.log("\n📣 Test 6: Newsletter Campaign");
    console.log("-".repeat(60));

    try {
      await emailService.sendNewsletterCampaign({
        email: TEST_EMAIL,
        subject: "🎉 Test Campaign - Amazing Deals!",
        message: `
          <h2>Welcome to Our Test Campaign!</h2>
          <p>This is a test email to verify campaign functionality.</p>
          <p><strong>Featured Products:</strong></p>
          <ul>
            <li>Summer Collection - 30% Off</li>
            <li>New Arrivals - Fresh Styles</li>
            <li>Clearance Sale - Up to 50% Off</li>
          </ul>
        `,
        campaignType: "all",
        isPreview: true,
      });
      log.success("Newsletter campaign sent successfully");
      log.info(`Check ${TEST_EMAIL} for campaign email`);
      return true;
    } catch (error) {
      log.error(`Newsletter campaign failed: ${error.message}`);
      return false;
    }
  },

  // Test 7: Contact Form Notification (to admin)
  async testContactForm() {
    console.log("\n📮 Test 7: Contact Form Notification");
    console.log("-".repeat(60));

    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      // ✅ CORRECT: sendContactFormNotification (existing function)
      await emailService.sendContactFormNotification(adminEmail, {
        name: "Test Customer",
        email: TEST_EMAIL,
        message:
          "This is a test contact form submission from the email test suite.",
      });

      log.success("Contact form notification sent successfully");
      log.info(`Check ${adminEmail} for contact inquiry`);
      return true;
    } catch (error) {
      log.error(`Contact form notification failed: ${error.message}`);
      return false;
    }
  },

  // Test 8: Low Stock Alert (FIXED!)
  async testLowStockAlert() {
    console.log("\n⚠️  Test 8: Low Stock Alert");
    console.log("-".repeat(60));

    try {
      const mockProduct = {
        name: "Test Product - Summer Dress",
        sku: "TEST-SKU-001",
        totalStock: 5,
        _id: "test-product-id",
      };

      const mockVariant = {
        size: "M",
        color: { name: "Blue" },
        stock: 3,
      };

      // ✅ FIXED: Now accepts (product, variant) - no adminEmail param
      await emailService.sendLowStockAlert(mockProduct, mockVariant);
      log.success("Low stock alert sent successfully");
      log.info("Check admin email for low stock notification");
      return true;
    } catch (error) {
      log.error(`Low stock alert failed: ${error.message}`);
      return false;
    }
  },
  //
  // Test 9: New Order Notification (to admin)
  async testNewOrderNotification() {
    console.log("\n🛍️  Test 9: New Order Notification");
    console.log("-".repeat(60));

    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      const mockOrder = {
        orderNumber: "ORD-TEST-002",
        user: {
          firstName: "Test",
          lastName: "Customer",
          email: TEST_EMAIL,
        },
        items: [
          {
            productName: "Elegant Summer Dress",
            variant: {
              size: "M",
              color: { name: "Blue" },
            },
            quantity: 1,
            unitPrice: 1500,
            totalPrice: 1500,
          },
        ],
        subtotal: 1500,
        shipping: { cost: 99 },
        tax: 225,
        total: 1824,
        payment: {
          method: "razorpay",
          status: "completed",
        },
        shippingAddress: {
          firstName: "Test",
          lastName: "Customer",
          phone: "9876543210",
          addressLine1: "123 Test Street",
          city: "Trivandrum",
          state: "Kerala",
          postalCode: "695001",
        },
        createdAt: new Date(),
      };

      // ✅ CORRECT: sendNewOrderNotification (existing function)
      await emailService.sendNewOrderNotification(adminEmail, mockOrder);

      log.success("New order notification sent successfully");
      log.info(`Check ${adminEmail} for new order alert`);
      return true;
    } catch (error) {
      log.error(`New order notification failed: ${error.message}`);
      return false;
    }
  },

  // Test 10: Weekly Sales Report (to admin)
  async testWeeklySalesReport() {
    console.log("\n📊 Test 10: Weekly Sales Report");
    console.log("-".repeat(60));

    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      await emailService.sendWeeklySalesReport(adminEmail, {
        totalRevenue: 45000,
        totalOrders: 32,
        avgOrderValue: 1406,
        topOrders: `
          <tr><td style="padding: 10px;">ORD-001</td><td style="padding: 10px;">₹5,000</td></tr>
          <tr><td style="padding: 10px;">ORD-002</td><td style="padding: 10px;">₹4,500</td></tr>
          <tr><td style="padding: 10px;">ORD-003</td><td style="padding: 10px;">₹3,800</td></tr>
        `,
      });

      log.success("Weekly sales report sent successfully");
      log.info(`Check ${adminEmail} for sales report`);
      return true;
    } catch (error) {
      log.error(`Weekly sales report failed: ${error.message}`);
      return false;
    }
  },
};

// Run all tests
async function runAllTests() {
  console.log("\n🎯 Starting Email Testing Suite");
  console.log(`📧 Test emails will be sent to: ${TEST_EMAIL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📮 Email Service: ${process.env.EMAIL_SERVICE || "SMTP"}`);
  console.log(`👤 Email User: ${process.env.EMAIL_USER || "NOT SET"}`);
  console.log(
    `🔑 Email Pass: ${process.env.EMAIL_PASS ? "SET ✅" : "NOT SET ❌"}`
  );
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || "NOT SET"}`);
  console.log(`👨‍💼 Admin Email: ${process.env.ADMIN_EMAIL || "NOT SET"}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    log.error(
      "Email credentials not configured! Please set EMAIL_USER and EMAIL_PASS in .env"
    );
    process.exit(1);
  }

  try {
    // Connect to database
    console.log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    log.success("Connected to MongoDB");

    // Run all tests
    const testNames = Object.keys(tests);
    let passed = 0;
    let failed = 0;

    for (const testName of testNames) {
      try {
        const result = await tests[testName]();
        if (result) {
          passed++;
        } else {
          failed++;
        }
        // Wait 2 seconds between tests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        log.error(`Test ${testName} crashed: ${error.message}`);
        failed++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST RESULTS SUMMARY");
    console.log("=".repeat(60));
    log.info(`Total Tests: ${testNames.length}`);
    log.success(`Passed: ${passed}`);
    if (failed > 0) {
      log.error(`Failed: ${failed}`);
    }

    console.log("\n✉️  Check your email inboxes:");
    console.log(`   📧 ${TEST_EMAIL} (user emails)`);
    console.log(
      `   👨‍💼 ${process.env.ADMIN_EMAIL || "Admin email not set"} (admin emails)`
    );
    console.log("\n💡 Tips:");
    console.log("   - Check spam folder if emails are missing");
    console.log("   - Admin emails go to ADMIN_EMAIL address");
    console.log("   - User emails go to TEST_EMAIL address");
    console.log("   - Email delivery may take a few seconds");

    // Disconnect
    await mongoose.disconnect();
    log.success("Disconnected from MongoDB");

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { tests, runAllTests };
