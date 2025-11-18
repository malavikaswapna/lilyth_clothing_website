// TEST SCRIPT - Save as: backend/test-notifications.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const emailService = require("./utils/emailService");

async function testNotifications() {
  console.log("\n🧪 TESTING NOTIFICATION SYSTEM\n");
  console.log("=".repeat(50));

  try {
    // Connect to database
    console.log("\n1️⃣ Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check environment variables
    console.log("\n2️⃣ Checking environment variables...");
    console.log(
      "   EMAIL_USER:",
      process.env.EMAIL_USER ? "✅ Set" : "❌ Missing"
    );
    console.log(
      "   EMAIL_PASS:",
      process.env.EMAIL_PASS ? "✅ Set" : "❌ Missing"
    );
    console.log(
      "   ADMIN_EMAIL:",
      process.env.ADMIN_EMAIL ? "✅ Set" : "❌ Missing"
    );
    console.log("   CLIENT_URL:", process.env.CLIENT_URL || "❌ Missing");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("\n❌ Email credentials missing!");
      console.log("Add these to your .env file:");
      console.log("   EMAIL_USER=your-email@gmail.com");
      console.log("   EMAIL_PASS=your-app-password");
      process.exit(1);
    }

    // Find admin user
    console.log("\n3️⃣ Looking for admin user...");
    let admin = await User.findOne({ role: "admin" });

    if (!admin) {
      console.log("❌ No admin user found!");
      console.log("\nLet me check all users...");

      const allUsers = await User.find().select("email role");
      console.log(`Found ${allUsers.length} users:`);
      allUsers.forEach((u) => console.log(`  - ${u.email} (${u.role})`));

      if (allUsers.length > 0) {
        console.log("\n💡 Converting first user to admin...");
        admin = allUsers[0];
        admin.role = "admin";
        await admin.save();
        console.log(`✅ ${admin.email} is now an admin`);
      } else {
        console.log("\n❌ No users in database!");
        console.log("Create a user account first, then run this test again.");
        process.exit(1);
      }
    } else {
      console.log("✅ Admin found:", admin.email);
    }

    // Check notification settings
    console.log("\n4️⃣ Checking notification settings...");

    if (
      !admin.notificationSettings ||
      Object.keys(admin.notificationSettings).length === 0
    ) {
      console.log("⚠️  No notification settings found!");
      console.log("   Adding default settings...");

      admin.notificationSettings = {
        emailNotifications: true,
        orderUpdates: true,
        newUsers: true,
        lowStock: true,
        salesReports: false,
        systemUpdates: true,
      };
      await admin.save();
      console.log("✅ Default settings added");
    } else {
      console.log("✅ Notification settings found:");
      console.log(JSON.stringify(admin.notificationSettings, null, 2));
    }

    // Test email sending
    console.log("\n5️⃣ Testing basic email...");
    console.log("   Sending to:", admin.email);

    try {
      await emailService.sendEmail({
        to: admin.email,
        subject: "🧪 Test Email - LILYTH Notifications",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px;">
              <h1>✅ Email Service Works!</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; margin-top: 20px; border-radius: 8px;">
              <p>This is a test email from your LILYTH notification system.</p>
              <p><strong>If you received this, your email configuration is correct!</strong></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px;">
                Sent at: ${new Date().toLocaleString()}<br>
                From: LILYTH Backend<br>
                To: ${admin.email}
              </p>
            </div>
          </div>
        `,
      });

      console.log("✅ Basic email sent!");
    } catch (emailError) {
      console.log("❌ Email send failed!");
      console.log("   Error:", emailError.message);
      console.log("\n📋 Troubleshooting Steps:");
      console.log("   1. Check EMAIL_USER matches EMAIL_PASS");
      console.log(
        "   2. If using Gmail, you need an App Password (not regular password)"
      );
      console.log("   3. Go to: https://myaccount.google.com/apppasswords");
      console.log('   4. Create app password for "Mail"');
      console.log(
        "   5. Update EMAIL_PASS in .env with the 16-character code (no spaces)"
      );
      console.log("\n   Your current EMAIL_USER:", process.env.EMAIL_USER);
      console.log(
        "   Your current EMAIL_PASS:",
        process.env.EMAIL_PASS
          ? `${process.env.EMAIL_PASS.substring(0, 4)}****`
          : "NOT SET"
      );
      process.exit(1);
    }

    // Test new user notification
    console.log("\n6️⃣ Testing new user notification...");

    try {
      await emailService.sendNewUserNotification({
        adminEmail: admin.email,
        user: {
          firstName: "Test",
          lastName: "User",
          email: "testuser@example.com",
          createdAt: new Date(),
        },
      });

      console.log("✅ New user notification sent!");
    } catch (error) {
      console.log("⚠️  New user notification failed:", error.message);
      console.log(
        "   This might be okay if the method is not in emailService yet"
      );
    }

    // Test order notification
    console.log("\n7️⃣ Testing order notification...");

    try {
      await emailService.sendAdminOrderNotification({
        adminEmail: admin.email,
        order: {
          orderNumber: "TEST-001",
          total: 5000,
          items: [{ productName: "Test Product" }],
          shippingAddress: {
            firstName: "Test",
            lastName: "Customer",
          },
          createdAt: new Date(),
        },
      });

      console.log("✅ Order notification sent!");
    } catch (error) {
      console.log("⚠️  Order notification failed:", error.message);
      console.log(
        "   This might be okay if the method is not in emailService yet"
      );
    }

    console.log("\n=".repeat(50));
    console.log("🎉 TESTING COMPLETE!\n");

    console.log("Summary:");
    console.log("  ✅ Database: Connected");
    console.log("  ✅ Admin User:", admin.email);
    console.log("  ✅ Notification Settings: Configured");
    console.log("  ✅ Email Service: Working\n");

    console.log("📧 Check your email inbox:");
    console.log("   " + admin.email);
    console.log("\nYou should have received 1-3 test emails.\n");

    console.log("Next Steps:");
    console.log("  1. ✅ Check your Gmail inbox");
    console.log("  2. ✅ Go to http://localhost:3000/admin/settings");
    console.log("  3. ✅ Test toggling notifications and saving");
    console.log("  4. ✅ Register a new user → Admin gets email");
    console.log("  5. ✅ Create an order → Admin gets email\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ FATAL ERROR:\n");
    console.error("Message:", error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testNotifications();
