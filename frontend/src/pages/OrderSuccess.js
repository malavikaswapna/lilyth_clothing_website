// src/pages/OrderSuccess.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  Package,
  MapPin,
  CreditCard,
  Printer,
  Home,
  Eye,
} from "lucide-react";
import { ordersAPI } from "../services/api";
import Button from "../components/common/Button";
import Loading from "../components/common/Loading";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import "./OrderSuccess.css";

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getOrder(orderId);
      if (response.data.success) {
        console.log("📦 Order data loaded:", response.data.order);
        setOrder(response.data.order);
      }
    } catch (error) {
      console.error("Failed to fetch order:", error);
      setTimeout(() => {
        navigate("/account/orders");
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    setShowReceipt(true);
  };

  const handleActualPrint = () => {
    window.print();
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodText = (order) => {
    if (!order?.payment) return "N/A";

    const method = order.payment.method;

    if (method === "cash_on_delivery" || method === "cod") {
      return "Cash on Delivery";
    } else if (method === "razorpay") {
      return "Online Payment (Razorpay)";
    } else if (method === "card") {
      return "Card Payment";
    }
    return "Online Payment";
  };

  // Calculate item total correctly
  const calculateItemTotal = (item) => {
    return item.unitPrice || item.totalPrice || 0;
  };

  if (loading) {
    return <Loading size="lg" text="Loading order details..." fullScreen />;
  }

  if (!order) {
    return (
      <BackgroundWrapper>
        <div className="order-success-page">
          <div className="container">
            <div className="success-header">
              <div className="success-icon error">
                <Package size={64} />
              </div>
              <h1>Order Not Found</h1>
              <p>We couldn't find your order. Redirecting...</p>
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="order-success-page">
        <div className="container">
          {/* Success Header */}
          <div className="success-header">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h1>Order Placed Successfully!</h1>
            <p>
              Thank you for your order. We'll send you a confirmation email
              shortly.
            </p>
            <div className="order-number">
              Order #{order._id ? order._id.slice(-8).toUpperCase() : "N/A"}
            </div>
          </div>

          {/* Receipt Printer Animation */}
          <div className="receipt-section">
            <div className={`wrapper ${showReceipt ? "printing" : ""}`}>
              <div className="printer"></div>
              <div className="printer-display">
                <span className="printer-message">Click to view receipt</span>
                <div className="letter-wrapper">
                  <span className="letter">L</span>
                  <span className="letter">o</span>
                  <span className="letter">a</span>
                  <span className="letter">d</span>
                  <span className="letter">i</span>
                  <span className="letter">n</span>
                  <span className="letter">g</span>
                  <span className="letter">.</span>
                  <span className="letter">.</span>
                  <span className="letter">.</span>
                </div>
              </div>
              <button
                className="print-button"
                onClick={handlePrintReceipt}
                tabIndex="0"
                title="View Receipt"
              >
                <Printer size={24} />
              </button>
              <div className="receipt-wrapper">
                <div className="receipt">
                  {/* Receipt Header */}
                  <div className="receipt-header">
                    <div>
                      <strong>LILYTH</strong>
                      <br />
                      Find Your Fit
                      <br />
                      Kerala, India
                    </div>
                    <div className="logo">👗</div>
                  </div>

                  {/* Order Info */}
                  <div className="receipt-subheader">
                    <div>
                      Order
                      <br />#
                      {order._id ? order._id.slice(-8).toUpperCase() : "N/A"}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {formatDate(order.createdAt)}
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="receipt-table">
                    <tbody>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                      </tr>
                      {order.items &&
                        Array.isArray(order.items) &&
                        order.items.map((item, index) => (
                          <tr key={index}>
                            <td>
                              {item.productName ||
                                item.product?.name ||
                                "Product"}
                              <br />
                              <small>
                                {item.variant?.size || "N/A"} /{" "}
                                {item.variant?.color?.name || "N/A"}
                              </small>
                            </td>
                            <td>{item.quantity || 1}x</td>
                            <td>₹{(item.unitPrice || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      <tr className="receipt-subtotal">
                        <td colSpan="2">Subtotal</td>
                        <td>₹{(order.subtotal || 0).toFixed(2)}</td>
                      </tr>
                      <tr className="receipt-tax">
                        <td colSpan="2">Shipping</td>
                        <td>
                          {(order.shipping?.cost || order.shippingCost || 0) ===
                          0
                            ? "FREE"
                            : `₹${(
                                order.shipping?.cost ||
                                order.shippingCost ||
                                0
                              ).toFixed(2)}`}
                        </td>
                      </tr>
                      <tr className="receipt-tax">
                        <td colSpan="2">Tax (GST 18%)</td>
                        <td>₹{(order.tax || 0).toFixed(2)}</td>
                      </tr>
                      <tr className="receipt-total">
                        <td colSpan="2">
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>
                            ₹
                            {(order.total || order.totalAmount || 0).toFixed(2)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Footer Message */}
                  <div className="receipt-message">
                    Thank you for shopping with us!
                    <br />
                    <small>Kerala Delivery Only</small>
                  </div>

                  {/* Print Button on Receipt */}
                  {showReceipt && (
                    <div className="receipt-actions">
                      <button
                        className="receipt-print-btn"
                        onClick={handleActualPrint}
                      >
                        <Printer size={16} />
                        Print Receipt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Details Cards */}
          <div className="order-details-grid">
            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="detail-card">
                <div className="card-header">
                  <MapPin size={20} />
                  <h3>Shipping Address</h3>
                </div>
                <div className="card-content">
                  <p>
                    <strong>
                      {order.shippingAddress.firstName || ""}{" "}
                      {order.shippingAddress.lastName || ""}
                    </strong>
                  </p>
                  <p>{order.shippingAddress.addressLine1 || "N/A"}</p>
                  {order.shippingAddress.addressLine2 && (
                    <p>{order.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {order.shippingAddress.city || "N/A"}, Kerala{" "}
                    {order.shippingAddress.postalCode || ""}
                  </p>
                  <p>India</p>
                  {order.shippingAddress.phone && (
                    <p className="phone">📞 {order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="detail-card">
              <div className="card-header">
                <CreditCard size={20} />
                <h3>Payment Information</h3>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span>Payment Method:</span>
                  <span className="payment-method">
                    {getPaymentMethodText(order)}
                  </span>
                </div>
                <div className="info-row">
                  <span>Payment Status:</span>
                  <span
                    className={`status-badge ${
                      order.payment?.status || "pending"
                    }`}
                  >
                    {order.payment?.status === "completed"
                      ? "✓ Paid"
                      : "⏳ Pending"}
                  </span>
                </div>
                <div className="info-row">
                  <span>Total Amount:</span>
                  <span className="amount">
                    ₹{(order.total || order.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Status */}
            <div className="detail-card">
              <div className="card-header">
                <Package size={20} />
                <h3>Order Status</h3>
              </div>
              <div className="card-content">
                <div className="status-timeline">
                  <div className="status-step active">
                    <div className="step-icon">✓</div>
                    <div className="step-info">
                      <strong>Order Placed</strong>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <div
                    className={`status-step ${
                      order.status === "processing" ||
                      order.status === "shipped" ||
                      order.status === "delivered"
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="step-icon">
                      {order.status === "processing" ||
                      order.status === "shipped" ||
                      order.status === "delivered"
                        ? "✓"
                        : "⏳"}
                    </div>
                    <div className="step-info">
                      <strong>Processing</strong>
                      <span>We're preparing your order</span>
                    </div>
                  </div>
                  <div
                    className={`status-step ${
                      order.status === "shipped" || order.status === "delivered"
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="step-icon">
                      {order.status === "shipped" ||
                      order.status === "delivered"
                        ? "✓"
                        : "📦"}
                    </div>
                    <div className="step-info">
                      <strong>Shipped</strong>
                      <span>On the way to you</span>
                    </div>
                  </div>
                  <div
                    className={`status-step ${
                      order.status === "delivered" ? "active" : ""
                    }`}
                  >
                    <div className="step-icon">
                      {order.status === "delivered" ? "✓" : "🎉"}
                    </div>
                    <div className="step-info">
                      <strong>Delivered</strong>
                      <span>Enjoy your purchase!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <Button
              onClick={() => navigate("/account/orders")}
              variant="outline"
              className="action-btn"
            >
              <Eye size={18} />
              View All Orders
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="action-btn primary"
            >
              <Home size={18} />
              Continue Shopping
            </Button>
          </div>

          {/* Help Section */}
          <div className="help-section">
            <h3>Need Help?</h3>
            <p>
              If you have any questions about your order, please contact our
              customer support at{" "}
              <a href="mailto:clothingbrand@lilyth.in">
                clothingbrand@lilyth.in
              </a>
            </p>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default OrderSuccess;
