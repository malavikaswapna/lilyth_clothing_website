// routes/newsletter.js
const express = require("express");
const {
  subscribe,
  unsubscribe,
  getNewsletterStats,
  getAllSubscribers,
  exportSubscribers,
} = require("../controllers/newsletterController");
const {
  sendCampaign,
  getCampaignTemplates,
  previewCampaign,
} = require("../controllers/newsletterCampaignController"); // ✅ ADD THIS
const { protect, authorize } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting for newsletter subscription
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 subscription attempts per windowMs
  message: {
    success: false,
    message: "Too many subscription attempts. Please try again in 15 minutes.",
  },
});

// Public routes
router.post("/subscribe", subscribeLimiter, subscribe);
router.post("/unsubscribe", unsubscribe);

// Admin routes - Newsletter management
router.get("/stats", protect, authorize("admin"), getNewsletterStats);
router.get("/subscribers", protect, authorize("admin"), getAllSubscribers);
router.get("/export", protect, authorize("admin"), exportSubscribers);

// ✅ ADD THESE THREE ROUTES:
// Admin routes - Campaign management
router.post("/send-campaign", protect, authorize("admin"), sendCampaign);
router.get("/templates", protect, authorize("admin"), getCampaignTemplates);
router.post("/preview", protect, authorize("admin"), previewCampaign);

module.exports = router;
