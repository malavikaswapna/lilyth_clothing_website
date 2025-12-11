// utils/productNotificationScheduler.js
const cron = require("node-cron");
const { sendNewArrivalsDigest } = require("./productNotificationService");

// Schedule weekly new arrivals digest
// Runs every Sunday at 10:00 AM
const scheduleNewArrivalsDigest = () => {
  // Cron format: minute hour day month weekday
  // "0 10 * * 0" = At 10:00 AM every Sunday
  cron.schedule("0 10 * * 0", async () => {
    console.log(
      "📅 Running scheduled new arrivals digest - " + new Date().toISOString()
    );

    try {
      const result = await sendNewArrivalsDigest();
      console.log(
        `✅ New arrivals digest completed: ${result.sent} emails sent`
      );
    } catch (error) {
      console.error("❌ Error in scheduled new arrivals digest:", error);
    }
  });

  console.log(
    "📅 Scheduled weekly new arrivals digest (Every Sunday at 10:00 AM)"
  );
};

// Optional: Schedule for testing (runs every hour)
// Uncomment this for testing purposes
/*
const scheduleNewArrivalsDigestHourly = () => {
  cron.schedule("0 * * * *", async () => {
    console.log(
      "🧪 Running test new arrivals digest - " + new Date().toISOString()
    );

    try {
      const result = await sendNewArrivalsDigest();
      console.log(`✅ Test digest completed: ${result.sent} emails sent`);
    } catch (error) {
      console.error("❌ Error in test digest:", error);
    }
  });

  console.log("🧪 Scheduled hourly new arrivals digest (FOR TESTING ONLY)");
};
*/

module.exports = {
  scheduleNewArrivalsDigest,
  // scheduleNewArrivalsDigestHourly, // Uncomment for testing
};
