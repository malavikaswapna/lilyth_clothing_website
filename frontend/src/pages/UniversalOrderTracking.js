// src/pages/GuestOrderTrackingLookup.js
// ✨ ANIMATED VERSION with ScrollReveal

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Mail,
  Hash,
  Search,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { guestAPI } from "../services/api";
import Button from "../components/common/Button";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import ScrollReveal from "../components/common/ScrollReveal"; // ✅ ADDED
import toast from "react-hot-toast";
import "./GuestOrderTrackingLookup.css";

const GuestOrderTrackingLookup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    orderNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.orderNumber) {
      setError("Please enter both email and order number");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      const response = await guestAPI.trackOrderByEmail({
        email: formData.email.toLowerCase().trim(),
        orderNumber: formData.orderNumber.trim().toUpperCase(),
      });

      if (response.data.success && response.data.trackingToken) {
        navigate(`/track-order/${response.data.trackingToken}`);
      } else {
        setError("Order not found. Please check your details and try again.");
      }
    } catch (error) {
      console.error("Order lookup failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Order not found. Please check your email and order number.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <div className="guest-tracking-lookup-page">
        <div className="container">
          {/* ✅ ADDED: Animate header */}
          <ScrollReveal direction="fade" delay={0.1}>
            <div className="tracking-lookup-header">
              <button onClick={() => navigate("/")} className="back-btn">
                <ArrowLeft size={20} />
                Back to Home
              </button>
            </div>
          </ScrollReveal>

          <div className="tracking-lookup-container">
            {/* ✅ ADDED: Animate main card */}
            <ScrollReveal direction="up" delay={0.2}>
              <div className="tracking-lookup-card">
                <div className="card-icon">
                  <Package size={48} />
                </div>

                <h1>Track Your Order</h1>
                <p className="subtitle">
                  Enter your email and order number to track your order status
                </p>

                <form onSubmit={handleSubmit} className="tracking-form">
                  <div className="form-group">
                    <label htmlFor="email">
                      <Mail size={18} />
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      required
                    />
                    <small className="form-help">
                      Use the email you provided during checkout
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="orderNumber">
                      <Hash size={18} />
                      Order Number
                    </label>
                    <input
                      type="text"
                      id="orderNumber"
                      name="orderNumber"
                      value={formData.orderNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., 000123"
                      autoComplete="off"
                      required
                    />
                    <small className="form-help">
                      Found in your order confirmation email
                    </small>
                  </div>

                  {error && (
                    <div className="error-message">
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="track-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search size={20} />
                        Track Order
                      </>
                    )}
                  </Button>
                </form>

                {/* ✅ ADDED: Animate help section */}
                <ScrollReveal direction="up" delay={0.3}>
                  <div className="help-section">
                    <h3>Need Help?</h3>
                    <div className="help-items">
                      <div className="help-item">
                        <strong>Can't find your order number?</strong>
                        <p>
                          Check your email inbox for the order confirmation from
                          LILYTH. The order number starts with a hash (#).
                        </p>
                      </div>
                      <div className="help-item">
                        <strong>Still having trouble?</strong>
                        <p>
                          Contact our support team at{" "}
                          <a href="mailto:support@lilyth.in">
                            support@lilyth.in
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* ✅ ADDED: Animate CTA */}
                <ScrollReveal direction="up" delay={0.4}>
                  <div className="create-account-note">
                    <p>
                      <strong>Want easier order tracking?</strong>
                    </p>
                    <p>
                      Create an account to view all your orders in one place and
                      get exclusive benefits!
                    </p>
                    <Button
                      onClick={() => navigate("/register")}
                      variant="outline"
                      className="register-btn"
                    >
                      Create Account
                    </Button>
                  </div>
                </ScrollReveal>
              </div>
            </ScrollReveal>

            {/* ✅ ADDED: Animate info cards with stagger */}
            <div className="info-cards">
              <ScrollReveal direction="left" delay={0.3}>
                <div className="info-card">
                  <div className="info-icon">
                    <Package size={24} />
                  </div>
                  <h4>Real-Time Updates</h4>
                  <p>Get live updates on your order status and delivery</p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.4}>
                <div className="info-card">
                  <div className="info-icon">
                    <Mail size={24} />
                  </div>
                  <h4>Email Notifications</h4>
                  <p>Receive updates directly to your inbox</p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.5}>
                <div className="info-card">
                  <div className="info-icon">
                    <Search size={24} />
                  </div>
                  <h4>Easy Tracking</h4>
                  <p>Track your order anytime with just your email</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default GuestOrderTrackingLookup;
