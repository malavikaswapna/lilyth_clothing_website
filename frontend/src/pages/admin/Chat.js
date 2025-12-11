// src/pages/admin/Chat.js
import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Send,
  ExternalLink,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import axios from "axios";
import "./Chat.css";

const AdminChat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const chatBodyRef = useRef(null);
  const ADMIN_WHATSAPP = "919876543210"; // ⚠️ Replace with your WhatsApp number

  useEffect(() => {
    loadConversations();
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationDetail(selectedConversation._id);
    }
  }, [selectedConversation?._id]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  const loadConversations = async () => {
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001/api"
        }/chat/conversations`,
        {
          params: { status: statusFilter },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        setConversations(response.data.conversations);
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setLoading(false);
    }
  };

  const loadConversationDetail = async (conversationId) => {
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001/api"
        }/chat/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        setSelectedConversation(response.data.conversation);
      }
    } catch (error) {
      console.error("Failed to load conversation detail:", error);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation) return;

    try {
      const response = await axios.post(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001/api"
        }/chat/admin-reply`,
        {
          conversationId: selectedConversation._id, // Use conversation ID, not customer ID
          message: replyMessage.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        setReplyMessage("");
        // Refresh conversation
        loadConversationDetail(selectedConversation._id);
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply. Please try again.");
    }
  };

  const handleResolveConversation = async (conversationId) => {
    if (
      !window.confirm(
        "Are you sure you want to mark this conversation as resolved? The customer will start a fresh conversation on their next message."
      )
    ) {
      return;
    }

    try {
      const response = await axios.put(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001/api"
        }/chat/${conversationId}/resolve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        // Refresh conversation list
        loadConversations();
        // Refresh current conversation to show the closure message
        if (selectedConversation?._id === conversationId) {
          loadConversationDetail(conversationId);
        }
        alert(
          "Conversation marked as resolved! Customer will start a new conversation on their next message."
        );
      }
    } catch (error) {
      console.error("Failed to resolve conversation:", error);
      alert("Failed to resolve conversation. Please try again.");
    }
  };

  const openWhatsAppChat = (customerId, customerName) => {
    const message = encodeURIComponent(
      `Re: Chat with ${customerName} (ID: ${customerId})\n\nHi! This is in response to your message on LILYTH website.`
    );
    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.customerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUnreadCount = (conversation) => {
    return conversation.messages.filter(
      (msg) => msg.sender === "customer" && !msg.read
    ).length;
  };

  if (loading) {
    return (
      <div className="admin-chat-loading">
        <MessageCircle size={48} />
        <p>Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="admin-chat-container">
      <div className="chat-header">
        <h1>Customer Chats</h1>
        <p>Manage customer inquiries and conversations</p>
      </div>

      <div className="chat-layout">
        {/* Conversations Sidebar */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${
                  statusFilter === "active" ? "active" : ""
                }`}
                onClick={() => setStatusFilter("active")}
              >
                Active (
                {conversations.filter((c) => c.status === "active").length})
              </button>
              <button
                className={`filter-tab ${
                  statusFilter === "resolved" ? "active" : ""
                }`}
                onClick={() => setStatusFilter("resolved")}
              >
                Resolved
              </button>
              <button
                className={`filter-tab ${
                  statusFilter === "all" ? "active" : ""
                }`}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
            </div>
          </div>

          <div className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="no-conversations">
                <MessageCircle size={48} />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const unreadCount = getUnreadCount(conversation);
                const lastMessage =
                  conversation.messages[conversation.messages.length - 1];

                return (
                  <div
                    key={conversation._id}
                    className={`conversation-item ${
                      selectedConversation?._id === conversation._id
                        ? "selected"
                        : ""
                    } ${unreadCount > 0 ? "unread" : ""} ${
                      conversation.status === "resolved" ? "resolved" : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="conversation-avatar">
                      {conversation.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header-row">
                        <h4>
                          {conversation.customerName}
                          {conversation.status === "resolved" && (
                            <span className="resolved-badge">✓ Resolved</span>
                          )}
                        </h4>
                        <span className="conversation-time">
                          {new Date(
                            conversation.lastMessageAt
                          ).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <p>{lastMessage?.text.substring(0, 50)}...</p>
                        {unreadCount > 0 && (
                          <span className="unread-badge">{unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-area-header">
                <div className="customer-info">
                  <div className="customer-avatar-large">
                    {selectedConversation.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedConversation.customerName}</h3>
                    <p className="customer-id">
                      ID: {selectedConversation.customerId}
                    </p>
                    {selectedConversation.customerEmail && (
                      <p className="customer-email">
                        {selectedConversation.customerEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="chat-actions">
                  <button
                    className="btn-whatsapp"
                    onClick={() =>
                      openWhatsAppChat(
                        selectedConversation.customerId,
                        selectedConversation.customerName
                      )
                    }
                    title="Open in WhatsApp"
                  >
                    <ExternalLink size={18} />
                    WhatsApp
                  </button>
                  {selectedConversation.status === "active" && (
                    <button
                      className="btn-resolve"
                      onClick={() =>
                        handleResolveConversation(selectedConversation._id)
                      }
                    >
                      <CheckCircle size={18} />
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              <div className="chat-messages" ref={chatBodyRef}>
                {selectedConversation.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      msg.sender === "system"
                        ? "system"
                        : msg.sender === "admin"
                        ? "admin"
                        : "customer"
                    }`}
                  >
                    <div className="message-bubble">
                      <p>{msg.text}</p>
                      <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-area">
                <textarea
                  className="chat-input"
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  rows="3"
                />
                <button
                  className="btn-send"
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim()}
                >
                  <Send size={20} />
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <MessageCircle size={64} />
              <h3>Select a conversation</h3>
              <p>
                Choose a conversation from the left to view and reply to
                messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
