// src/pages/Unsubscribe.js
import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import api from "../services/api";
import Loading from "../components/common/Loading";
import "./Unsubscribe.css";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  const [status, setStatus] = useState("confirming"); // confirming, success, error, already
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!email) {
      setStatus("error");
      setMessage("No email address provided");
    }
  }, [email]);

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      const response = await api.post("/newsletter/unsubscribe", { email });

      if (response.data.success) {
        if (response.data.message.includes("already unsubscribed")) {
          setStatus("already");
          setMessage("You are already unsubscribed from our newsletter.");
        } else {
          setStatus("success");
          setMessage("You have been successfully unsubscribed.");
        }
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          "Failed to unsubscribe. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="unsubscribe-page">
        <div className="unsubscribe-container">
          <div className="unsubscribe-icon error">
            <AlertCircle size={64} />
          </div>
          <h1>Invalid Link</h1>
          <p>This unsubscribe link is invalid or has expired.</p>
          <Link to="/" className="home-link">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="unsubscribe-page">
      <div className="unsubscribe-container">
        {status === "confirming" && (
          <>
            <div className="unsubscribe-icon">
              <Mail size={64} />
            </div>
            <h1>Unsubscribe from Newsletter</h1>
            <p className="email-display">{email}</p>
            <p className="confirmation-text">
              Are you sure you want to unsubscribe from our newsletter? You'll
              no longer receive updates about new arrivals, sales, and exclusive
              offers.
            </p>

            <div className="unsubscribe-actions">
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="unsubscribe-btn"
              >
                {loading ? "Processing..." : "Yes, Unsubscribe"}
              </button>
              <Link to="/" className="cancel-link">
                No, Keep Me Subscribed
              </Link>
            </div>

            <div className="what-youll-miss">
              <h3>What you'll miss:</h3>
              <ul>
                <li>✨ Early access to new collections</li>
                <li>🎉 Exclusive subscriber-only discounts</li>
                <li>💝 Special offers and promotions</li>
                <li>📰 Style tips and fashion updates</li>
              </ul>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="unsubscribe-icon success">
              <CheckCircle size={64} />
            </div>
            <h1>Successfully Unsubscribed</h1>
            <p>{message}</p>
            <p className="goodbye-text">
              We're sad to see you go, but we understand. You can always
              resubscribe from our website if you change your mind.
            </p>
            <div className="unsubscribe-actions">
              <Link to="/" className="home-link">
                Return to Homepage
              </Link>
              <Link to="/shop" className="shop-link">
                Continue Shopping
              </Link>
            </div>
          </>
        )}

        {status === "already" && (
          <>
            <div className="unsubscribe-icon info">
              <CheckCircle size={64} />
            </div>
            <h1>Already Unsubscribed</h1>
            <p>{message}</p>
            <p className="resubscribe-text">
              Would you like to resubscribe to our newsletter?
            </p>
            <div className="unsubscribe-actions">
              <Link to="/" className="home-link">
                Yes, Resubscribe from Homepage
              </Link>
              <Link to="/shop" className="shop-link">
                No, Continue Shopping
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="unsubscribe-icon error">
              <AlertCircle size={64} />
            </div>
            <h1>Oops! Something Went Wrong</h1>
            <p>{message}</p>
            <div className="unsubscribe-actions">
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="retry-btn"
              >
                Try Again
              </button>
              <Link to="/" className="home-link">
                Return to Homepage
              </Link>
            </div>
          </>
        )}

        <div className="help-text">
          <p>
            Need help? <Link to="/contact">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;
