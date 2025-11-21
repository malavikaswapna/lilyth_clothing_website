// config/razorpay.js
const Razorpay = require("razorpay");

// validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error(
    "❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined in .env file"
  );
  process.exit(1);
}

// initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// log mode (test/live)
const mode = process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_")
  ? "TEST"
  : "LIVE";
console.log(`🔐 Razorpay initialized in ${mode} mode`);

// verify credentials on start
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
