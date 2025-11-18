// config/razorpay.js
const Razorpay = require("razorpay");

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error(
    "❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined in .env file"
  );
  process.exit(1);
}

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Log mode (test/live)
const mode = process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_")
  ? "TEST"
  : "LIVE";
console.log(`🔐 Razorpay initialized in ${mode} mode`);

// Verify credentials on startup
razorpay.payments
  .all({ count: 1 })
  .then(() => {
    console.log("✅ Razorpay credentials verified successfully");
  })
  .catch((error) => {
    console.error("❌ Razorpay credential verification failed:", error.message);
    console.error("Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
  });

module.exports = razorpay;
