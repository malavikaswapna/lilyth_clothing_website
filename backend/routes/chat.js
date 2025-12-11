// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  sendCustomerMessage,
  getConversationHistory,
  adminReply,
  getAllConversations,
  markAsResolved,
  getConversationDetail,
} = require("../controllers/chatController");

// Public route - Customer sends message
router.post("/send-message", sendCustomerMessage);

// Public route - Get conversation history by customer ID
router.get("/history/:customerId", getConversationHistory);

// Admin routes
router.get("/conversations", protect, authorize("admin"), getAllConversations);
router.get(
  "/conversations/:conversationId",
  protect,
  authorize("admin"),
  getConversationDetail
);
router.post("/admin-reply", protect, authorize("admin"), adminReply);
router.put(
  "/:conversationId/resolve",
  protect,
  authorize("admin"),
  markAsResolved
);

module.exports = router;
