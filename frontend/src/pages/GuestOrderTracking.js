// src/pages/GuestOrderTracking.js
// ✨ ANIMATED VERSION with ScrollReveal

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Package,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  Truck,
  Home,
  XCircle,
  ArrowLeft,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { guestAPI } from "../services/api";
import Loading from "../components/common/Loading";
import Button from "../components/common/Button";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import ScrollReveal from "../components/common/ScrollReveal"; // ✅ ADDED
import toast from "react-hot-toast";
import "./OrderTracking.css";

const GuestOrderTracking = () => {
  const { trackingToken } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (trackingToken) {
      loadOrderDetails();
    } else {
      setError("No tracking token provided");
      setLoading(false);
    }
  }, [trackingToken]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await guestAPI.trackGuestOrder(trackingToken);

      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        setError("Order not found");
      }
    } catch (error) {
      console.error("Failed to load order:", error);
      setError(error.response?.data?.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={24} className="status-icon pending" />;
      case "confirmed":
        return <CheckCircle size={24} className="status-icon confirmed" />;
      case "processing":
        return <Package size={24} className="status-icon processing" />;
      case "shipped":
        return <Truck size={24} className="status-icon shipped" />;
      case "delivered":
        return <Home size={24} className="status-icon delivered" />;
      case "cancelled":
        return <XCircle size={24} className="status-icon cancelled" />;
      default:
        return <Package size={24} />;
    }
  };

  const getStatusSteps = () => {
    const allSteps = [
      { key: "pending", label: "Order Placed", icon: CheckCircle },
      { key: "confirmed", label: "Confirmed", icon: CheckCircle },
      { key: "processing", label: "Processing", icon: Package },
      { key: "shipped", label: "Shipped", icon: Truck },
      { key: "delivered", label: "Delivered", icon: Home },
    ];

    const statusOrder = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];
    const currentIndex = statusOrder.indexOf(order?.status);

    return allSteps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  if (loading) {
    return <Loading size="lg" text="Loading order details..." fullScreen />;
  }

  if (error || !order) {
    return (
      <BackgroundWrapper>
        <div className="order-tracking-page">
          <div className="container">
            <ScrollReveal direction="fade">
              <div className="error-state">
                <XCircle size={64} />
                <h2>Order Not Found</h2>
                <p>{error || "Unable to load order details"}</p>
                <Button onClick={() => navigate("/shop")}>
                  Continue Shopping
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  const steps = getStatusSteps();

  return (
    <BackgroundWrapper>
      <div className="order-tracking-page">
        <div className="container">
          {/* ✅ ADDED: Animate header */}
          <ScrollReveal direction="fade">
            <div className="tracking-header">
              <button onClick={() => navigate("/shop")} className="back-btn">
                <ArrowLeft size={20} />
                Back to Shop
              </button>
              <h1>Track Your Order</h1>
            </div>
          </ScrollReveal>

          {/* ✅ ADDED: Animate order overview */}
          <ScrollReveal direction="up" delay={0.1}>
            <div className="order-overview">
              <div className="order-info-card">
                <div className="order-number">
                  <h2>Order #{order.orderNumber}</h2>
                  {getStatusIcon(order.status)}
                </div>
                <div className="order-meta">
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="meta-item">
                    <CreditCard size={16} />
                    <span>₹{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* ✅ ADDED: Animate status timeline */}
          {order.status !== "cancelled" && (
            <ScrollReveal direction="up" delay={0.2}>
              <div className="status-timeline">
                <h3>Order Status</h3>
                <div className="timeline-steps">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.key}
                        className={`timeline-step ${
                          step.completed ? "completed" : ""
                        } ${step.current ? "current" : ""}`}
                      >
                        <div className="step-icon">
                          <Icon size={24} />
                        </div>
                        <div className="step-label">{step.label}</div>
                        {index < steps.length - 1 && (
                          <div
                            className={`step-line ${
                              step.completed ? "completed" : ""
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ✅ ADDED: Animate cancelled notice */}
          {order.status === "cancelled" && (
            <ScrollReveal direction="up" delay={0.2}>
              <div className="cancelled-notice">
                <XCircle size={48} />
                <h3>Order Cancelled</h3>
                <p>This order has been cancelled</p>
                {order.cancelReason && (
                  <p className="cancel-reason">Reason: {order.cancelReason}</p>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* ✅ ADDED: Animate tracking info */}
          {order.tracking?.trackingNumber && (
            <ScrollReveal direction="up" delay={0.3}>
              <div className="tracking-info-card">
                <h3>Shipping Information</h3>
                <div className="tracking-details">
                  <div className="tracking-item">
                    <strong>Carrier:</strong>
                    <span>{order.tracking.carrier}</span>
                  </div>
                  <div className="tracking-item">
                    <strong>Tracking Number:</strong>
                    <span>{order.tracking.trackingNumber}</span>
                  </div>
                  {order.tracking.estimatedDelivery && (
                    <div className="tracking-item">
                      <strong>Estimated Delivery:</strong>
                      <span>
                        {new Date(
                          order.tracking.estimatedDelivery
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          )}

          <div className="order-details-grid">
            {/* ✅ ADDED: Animate order items */}
            <ScrollReveal direction="right" delay={0.4}>
              <div className="order-items-card">
                <h3>Order Items ({order.items.length})</h3>
                <div className="items-list">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <img
                        src={
                          item.productImage || item.product?.images?.[0]?.url
                        }
                        alt={item.productName || item.product?.name}
                      />
                      <div className="item-info">
                        <h4>{item.productName || item.product?.name}</h4>
                        <p>
                          Size: {item.variant.size} | Color:{" "}
                          {item.variant.color.name}
                        </p>
                        <p>Quantity: {item.quantity}</p>
                      </div>
                      <div className="item-price">
                        ₹{item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* ✅ ADDED: Animate info cards with stagger */}
            <div className="info-cards">
              <ScrollReveal direction="left" delay={0.5}>
                <div className="info-card">
                  <h3>
                    <MapPin size={20} />
                    Shipping Address
                  </h3>
                  <div className="address-details">
                    <p>
                      <strong>
                        {order.shippingAddress.firstName}{" "}
                        {order.shippingAddress.lastName}
                      </strong>
                    </p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.state}{" "}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
              </ScrollReveal>

              {order.guestEmail && (
                <ScrollReveal direction="left" delay={0.6}>
                  <div className="info-card">
                    <h3>
                      <User size={20} />
                      Contact Information
                    </h3>
                    <div className="contact-details">
                      <div className="contact-item">
                        <Mail size={16} />
                        <span>{order.guestEmail}</span>
                      </div>
                      {order.shippingAddress.phone && (
                        <div className="contact-item">
                          <Phone size={16} />
                          <span>{order.shippingAddress.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              <ScrollReveal direction="left" delay={0.7}>
                <div className="info-card">
                  <h3>Order Summary</h3>
                  <div className="summary-details">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>₹{order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.discount.amount > 0 && (
                      <div className="summary-row discount">
                        <span>Discount:</span>
                        <span>-₹{order.discount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="summary-row">
                      <span>Shipping:</span>
                      <span>₹{order.shipping.cost.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Tax (GST):</span>
                      <span>₹{order.tax.toFixed(2)}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total:</span>
                      <span>₹{order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.8}>
                <div className="info-card">
                  <h3>
                    <CreditCard size={20} />
                    Payment Details
                  </h3>
                  <div className="payment-details">
                    <div className="payment-row">
                      <span>Method:</span>
                      <span className="payment-method">
                        {order.payment.method === "cash_on_delivery"
                          ? "Cash on Delivery"
                          : "Online Payment"}
                      </span>
                    </div>
                    <div className="payment-row">
                      <span>Status:</span>
                      <span
                        className={`payment-status ${order.payment.status}`}
                      >
                        {order.payment.status}
                      </span>
                    </div>
                    {order.payment.paidAt && (
                      <div className="payment-row">
                        <span>Paid On:</span>
                        <span>
                          {new Date(order.payment.paidAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* ✅ ADDED: Animate CTA */}
          {order.status !== "cancelled" && (
            <ScrollReveal direction="up" delay={0.9}>
              <div className="create-account-cta">
                <h3>Want to track all your orders in one place?</h3>
                <p>
                  Create an account to easily manage your orders and get
                  exclusive benefits
                </p>
                <Button onClick={() => navigate("/register")} variant="primary">
                  Create Account
                </Button>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default GuestOrderTracking;
