// backend/models/ChatConversation.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["customer", "admin", "system"],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

const chatConversationSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      index: true, // Keep index for performance, but remove unique
    },
    customerName: {
      type: String,
      default: "Guest",
    },
    customerEmail: {
      type: String,
      sparse: true,
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["active", "resolved", "archived"],
      default: "active",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
chatConversationSchema.index({ status: 1, lastMessageAt: -1 });
chatConversationSchema.index({ customerId: 1, status: 1 });

// Get unread message count
chatConversationSchema.methods.getUnreadCount = function () {
  return this.messages.filter((msg) => !msg.read && msg.sender === "customer")
    .length;
};

// Mark all messages as read
chatConversationSchema.methods.markAllAsRead = async function () {
  this.messages.forEach((msg) => {
    if (msg.sender === "customer") {
      msg.read = true;
    }
  });
  await this.save();
};

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
