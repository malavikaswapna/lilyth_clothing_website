// backend/controllers/chatController.js
const asyncHandler = require("../utils/asyncHandler");
const ChatConversation = require("../models/ChatConversation");
const axios = require("axios");

// Admin's WhatsApp Number (UPDATE THIS!)
const ADMIN_WHATSAPP = "919876543210"; // ⚠️ Replace with actual admin WhatsApp number

// WhatsApp Business API Configuration
// Option 1: Using WhatsApp Business API (if you have it)
// Option 2: Using a service like Twilio, MessageBird, or Interakt
// Option 3: Simple webhook that the admin can connect to their WhatsApp Business

/**
 * Send customer message to admin via WhatsApp
 * @route   POST /api/chat/send-message
 * @access  Public
 */
exports.sendCustomerMessage = asyncHandler(async (req, res) => {
  const { customerId, customerName, customerEmail, message } = req.body;

  // Validate required fields
  if (!customerId || !message) {
    return res.status(400).json({
      success: false,
      message: "Customer ID and message are required",
    });
  }

  // Find ACTIVE conversation only (not resolved ones)
  let conversation = await ChatConversation.findOne({
    customerId,
    status: "active", // Only get active conversations
  });

  if (!conversation) {
    // Extract first name for personalized greeting
    const firstName =
      customerName && customerName !== "Guest Customer"
        ? customerName.split(" ")[0]
        : "";

    // Create new conversation with welcome messages
    conversation = await ChatConversation.create({
      customerId,
      customerName: customerName || "Guest",
      customerEmail: customerEmail || null,
      messages: [
        {
          sender: "system",
          text: firstName
            ? `Hello ${firstName}! 👋 Welcome to LILYTH Fashion!`
            : "Hello! 👋 Welcome to LILYTH Fashion!",
          timestamp: new Date(),
        },
        {
          sender: "system",
          text: "We're here to help you find your perfect style. How can we assist you today? 💖",
          timestamp: new Date(),
        },
      ],
    });
  }

  // Add customer message to conversation
  conversation.messages.push({
    sender: "customer",
    text: message,
    timestamp: new Date(),
  });

  conversation.lastMessageAt = new Date();
  conversation.status = "active";
  await conversation.save();

  // Send notification to admin's WhatsApp
  try {
    await sendWhatsAppNotification(customerId, customerName, message);
  } catch (error) {
    console.error("Failed to send WhatsApp notification:", error);
    // Don't fail the request if WhatsApp notification fails
  }

  res.status(200).json({
    success: true,
    message: "Message sent to admin",
    conversationId: conversation._id,
  });
});

/**
 * Get conversation history
 * @route   GET /api/chat/history/:customerId
 * @access  Public
 */
exports.getConversationHistory = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  // Only get active conversations for customers
  // Resolved conversations are hidden from customer view
  const conversation = await ChatConversation.findOne({
    customerId,
    status: "active", // Only show active conversations
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "No active conversation found",
    });
  }

  res.status(200).json({
    success: true,
    conversation,
  });
});

/**
 * Get specific conversation detail (Admin)
 * @route   GET /api/chat/conversations/:conversationId
 * @access  Private (Admin only)
 */
exports.getConversationDetail = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await ChatConversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found",
    });
  }

  res.status(200).json({
    success: true,
    conversation,
  });
});

/**
 * Admin sends reply to customer
 * @route   POST /api/chat/admin-reply
 * @access  Private (Admin only)
 */
exports.adminReply = asyncHandler(async (req, res) => {
  const { conversationId, message } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({
      success: false,
      message: "Conversation ID and message are required",
    });
  }

  const conversation = await ChatConversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found",
    });
  }

  // Add admin message to conversation
  conversation.messages.push({
    sender: "admin",
    text: message,
    timestamp: new Date(),
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.status(200).json({
    success: true,
    message: "Reply sent to customer",
    conversation,
  });
});

/**
 * Get all active conversations (Admin Dashboard)
 * @route   GET /api/chat/conversations
 * @access  Private (Admin only)
 */
exports.getAllConversations = asyncHandler(async (req, res) => {
  const { status = "active", page = 1, limit = 20 } = req.query;

  const query = status === "all" ? {} : { status };

  const conversations = await ChatConversation.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await ChatConversation.countDocuments(query);

  res.status(200).json({
    success: true,
    conversations,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total,
  });
});

/**
 * Mark conversation as resolved
 * @route   PUT /api/chat/:conversationId/resolve
 * @access  Private (Admin only)
 */
exports.markAsResolved = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await ChatConversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found",
    });
  }

  // Add a system message indicating conversation was resolved
  conversation.messages.push({
    sender: "system",
    text: "✅ This conversation has been resolved by our team. Thank you for contacting LILYTH!",
    timestamp: new Date(),
  });

  conversation.status = "resolved";
  conversation.resolvedAt = new Date();
  await conversation.save();

  res.status(200).json({
    success: true,
    message: "Conversation marked as resolved",
    conversation,
  });
});

/**
 * Send WhatsApp notification to admin
 * This is a simplified version - you'll need to integrate with actual WhatsApp API
 */
async function sendWhatsAppNotification(customerId, customerName, message) {
  // METHOD 1: Using WhatsApp Business API (requires setup)
  // You would need to integrate with WhatsApp Business API

  // METHOD 2: Using Twilio WhatsApp
  // const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // const authToken = process.env.TWILIO_AUTH_TOKEN;
  // const client = require('twilio')(accountSid, authToken);
  //
  // await client.messages.create({
  //   from: 'whatsapp:+14155238886', // Twilio WhatsApp number
  //   to: `whatsapp:+${ADMIN_WHATSAPP}`,
  //   body: `🔔 New message from ${customerName}\n\nCustomer ID: ${customerId}\n\nMessage: ${message}\n\nReply at: ${process.env.CLIENT_URL}/admin/chat/${customerId}`
  // });

  // METHOD 3: Using wa.me link (redirect method)
  // This is the simplest - admin clicks link to respond
  const whatsappLink = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
    `🔔 New message from ${customerName}\n\nCustomer ID: ${customerId}\n\nMessage: ${message}`
  )}`;

  console.log("WhatsApp notification link:", whatsappLink);

  // You could store this link in the database or send via email
  // For now, we're just logging it

  return whatsappLink;
}

module.exports = {
  sendCustomerMessage: exports.sendCustomerMessage,
  getConversationHistory: exports.getConversationHistory,
  getConversationDetail: exports.getConversationDetail,
  adminReply: exports.adminReply,
  getAllConversations: exports.getAllConversations,
  markAsResolved: exports.markAsResolved,
};
