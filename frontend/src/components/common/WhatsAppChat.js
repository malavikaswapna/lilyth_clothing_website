// src/components/common/WhatsAppChat.js
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Check, CheckCheck } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "./WhatsAppChat.css";

const WhatsAppChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [conversationStarted, setConversationStarted] = useState(false);
  const [firstMessageSent, setFirstMessageSent] = useState(false);

  const chatBodyRef = useRef(null);
  const pollingInterval = useRef(null);
  const { user, isAuthenticated } = useAuth();

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

  /* ---------------------------------------------
     GENERATE CUSTOMER ID (logged in OR guest)
  ---------------------------------------------- */
  useEffect(() => {
    let custId;

    if (isAuthenticated && user) {
      custId = `user_${user._id}`;
    } else {
      custId = sessionStorage.getItem("guestChatId");

      if (!custId) {
        custId =
          "guest_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem("guestChatId", custId);
      }
    }

    setCustomerId(custId);
    loadConversationHistory(custId);

    return () => clearInterval(pollingInterval.current);
  }, [isAuthenticated, user]);

  /* ---------------------------------------------
     LOAD EXISTING CONVERSATION
  ---------------------------------------------- */
  const loadConversationHistory = async (custId) => {
    try {
      const res = await axios.get(`${API_BASE}/chat/history/${custId}`);

      if (res.data.success && res.data.conversation) {
        const formatted = res.data.conversation.messages.map((msg) => ({
          id: msg._id || `${Date.now()}_${Math.random()}`,
          text: msg.text,
          sender: msg.sender === "customer" ? "sent" : "received",
          time: new Date(msg.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "read",
        }));

        setMessages(formatted);
        setConversationStarted(true);

        if (formatted.some((m) => m.sender === "sent")) {
          setFirstMessageSent(true);
        }
      } else {
        // No active conversation - show welcome messages immediately
        showWelcomeMessages();
      }
    } catch (err) {
      // 404 means no active conversation (previous was resolved)
      // Show welcome messages immediately
      showWelcomeMessages();
    }
  };

  /* ---------------------------------------------
     SHOW WELCOME MESSAGES
  ---------------------------------------------- */
  const showWelcomeMessages = () => {
    const userName = isAuthenticated && user ? user.firstName : "";

    const welcome = [
      {
        id: "welcome1",
        text: userName
          ? `Hello ${userName}! 👋 Welcome to LILYTH Fashion!`
          : "Hello! 👋 Welcome to LILYTH Fashion!",
        sender: "received",
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "read",
      },
      {
        id: "welcome2",
        text: "We're here to help you find your perfect style. How can we assist you today? 💖",
        sender: "received",
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "read",
      },
    ];

    setMessages(welcome);
    setConversationStarted(false); // Not started until they send a message
    setFirstMessageSent(false);
  };

  /* ---------------------------------------------
     POLLING FOR ADMIN MESSAGES (ONLY WHEN OPEN)
  ---------------------------------------------- */
  useEffect(() => {
    if (!isOpen || !conversationStarted) return;

    pollingInterval.current = setInterval(checkForNewMessages, 5000);

    return () => clearInterval(pollingInterval.current);
  }, [isOpen, conversationStarted, customerId]);

  const checkForNewMessages = async () => {
    try {
      const res = await axios.get(`${API_BASE}/chat/history/${customerId}`);

      if (!res.data.success || !res.data.conversation) return;

      const serverMessages = res.data.conversation.messages;
      const lastServerMsg = serverMessages[serverMessages.length - 1];
      const lastLocalMsg = messages[messages.length - 1];

      if (
        lastServerMsg &&
        lastServerMsg.sender === "admin" &&
        (!lastLocalMsg || lastLocalMsg.id !== lastServerMsg._id)
      ) {
        const newMsg = {
          id: lastServerMsg._id,
          text: lastServerMsg.text,
          sender: "received",
          time: new Date(lastServerMsg.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "read",
        };

        setMessages((prev) => [...prev, newMsg]);

        if (!isOpen) setHasUnread(true);
      }
    } catch (err) {
      console.error("Error checking for new messages:", err);
    }
  };

  /* ---------------------------------------------
     AUTO-SCROLL ON NEW MESSAGE
  ---------------------------------------------- */
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /* ---------------------------------------------
     CLEAR UNREAD WHEN OPEN
  ---------------------------------------------- */
  useEffect(() => {
    if (isOpen) setHasUnread(false);
  }, [isOpen]);

  /* ---------------------------------------------
     SEND MESSAGE TO ADMIN
  ---------------------------------------------- */
  const sendMessageToAdmin = async (messageText) => {
    try {
      const customerName =
        isAuthenticated && user
          ? `${user.firstName} ${user.lastName}`
          : "Guest Customer";

      const customerEmail = isAuthenticated && user ? user.email : null;

      await axios.post(`${API_BASE}/chat/send-message`, {
        customerId,
        customerName,
        customerEmail,
        message: messageText,
      });

      setConversationStarted(true);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  /* ---------------------------------------------
     HANDLE SEND MESSAGE
  ---------------------------------------------- */
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const msgId = `${Date.now()}_${Math.random()}`;

    const userMessage = {
      id: msgId,
      text: message.trim(),
      sender: "sent",
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };

    setMessages((prev) => [...prev, userMessage]);

    const toSend = message.trim();
    setMessage("");

    // Send to backend
    await sendMessageToAdmin(toSend);

    // If this is the first message of a new conversation,
    // reload to get the conversation from backend (with welcome messages saved)
    if (!conversationStarted) {
      setTimeout(() => {
        loadConversationHistory(customerId);
      }, 800);
    } else {
      // Update message status for existing conversations
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: "delivered" } : m))
        );
      }, 500);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: "read" } : m))
        );
      }, 1000);
    }

    // Show confirmation only for first message
    if (!firstMessageSent) {
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);

        const confirmation = {
          id: "firstReply_" + Date.now(),
          text: "Thanks for your message! Our team will respond shortly. You'll see their reply right here. 💬",
          sender: "received",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "read",
        };

        setMessages((prev) => [...prev, confirmation]);
        setFirstMessageSent(true);
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageText = (text) =>
    text.split("\n").map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split("\n").length - 1 && <br />}
      </React.Fragment>
    ));

  /* ---------------------------------------------
     UI RENDER
  ---------------------------------------------- */
  return (
    <>
      <div className={`whatsapp-float ${isOpen ? "active" : ""}`}>
        <button
          className="whatsapp-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Chat with us"
        >
          {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
        </button>

        {isOpen && (
          <div className="whatsapp-chat-popup">
            <div className="whatsapp-header">
              <div className="whatsapp-header-content">
                <div className="whatsapp-avatar">
                  <img
                    src="https://i.postimg.cc/zfHqxsrc/IMG-1138.jpg"
                    alt="LILYTH"
                  />
                  <span className="online-indicator"></span>
                </div>
                <div className="whatsapp-info">
                  <h4>LILYTH Fashion</h4>
                  <p>{isTyping ? "typing..." : "Online now"}</p>
                </div>
              </div>
            </div>

            <div className="whatsapp-body" ref={chatBodyRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`whatsapp-message ${
                    msg.sender === "sent" ? "sent" : "received"
                  }`}
                >
                  <div className="message-bubble">
                    <p className="message-text">
                      {formatMessageText(msg.text)}
                    </p>
                    <div className="message-meta">
                      <span className="message-time">{msg.time}</span>

                      {msg.sender === "sent" && (
                        <span className="message-status">
                          {msg.status === "sent" && <Check size={16} />}
                          {msg.status === "delivered" && (
                            <CheckCheck size={16} />
                          )}
                          {msg.status === "read" && (
                            <CheckCheck size={16} className="read" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="whatsapp-message received">
                  <div className="message-bubble typing-indicator">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="whatsapp-footer">
              <textarea
                className="whatsapp-input"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows="1"
              />
              <button
                className="whatsapp-send-button"
                onClick={handleSendMessage}
                disabled={!message.trim()}
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </div>

            <div className="whatsapp-branding">
              <span>Chat with us</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <strong>LILYTH Support</strong>
            </div>
          </div>
        )}

        {!isOpen && hasUnread && (
          <div className="whatsapp-notification-badge">
            <span>1</span>
          </div>
        )}
      </div>
    </>
  );
};

export default WhatsAppChat;
