// src/pages/GuestCheckout.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  MapPin,
  User,
  Package,
  ArrowLeft,
  Lock,
  CheckCircle,
  Tag,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { useGuest } from "../context/GuestContext";
import { guestAPI, pincodeAPI, promoCodeAPI } from "../services/api";
import { useRazorpay } from "../hooks/useRazorpay";
import Button from "../components/common/Button";
import Loading from "../components/common/Loading";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import PincodeInput from "../components/common/PincodeInput";
import KeralaDistrictSelect from "../components/common/KeralaDistrictSelect";
import ServiceAreaNotice from "../components/common/ServiceAreaNotice";
import toast from "react-hot-toast";
import "./Checkout.css";

const GuestCheckout = () => {
  const navigate = useNavigate();
  const {
    guestId,
    guestItems,
    guestSubtotal,
    loading: guestLoading,
    isGuestSession,
    clearGuestCart, // ✅ ADD THIS
    clearGuestSession,
  } = useGuest();
  const { processPayment, loading: paymentLoading } = useRazorpay();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false); // ✅ NEW: Prevent redirect after order
  const [pincodeAutofilled, setPincodeAutofilled] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState({
    razorpayEnabled: true,
    codEnabled: true,
  });

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);

  // Guest information form with Kerala defaults
  const [guestInfo, setGuestInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "Kerala",
    zipCode: "",
    country: "India",
  });

  const [paymentData, setPaymentData] = useState({
    method: "razorpay",
  });

  // Redirect if no guest session or empty cart (but NOT after order placed)
  useEffect(() => {
    // ✅ NEW: Don't redirect if order was just placed successfully
    if (orderPlaced) {
      console.log("⏸️ Order placed, skipping cart validation redirect");
      return;
    }

    if (!isGuestSession || !guestId) {
      toast.error("Please add items to cart first");
      navigate("/shop");
      return;
    }

    if (!guestItems || guestItems.length === 0) {
      toast.error("Your cart is empty");
      navigate("/cart");
      return;
    }
  }, [isGuestSession, guestId, guestItems, navigate, orderPlaced]);

  // Load payment settings
  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001/api"
        }/payment-settings`
      );
      const data = await response.json();

      if (data.success) {
        setPaymentSettings({
          razorpayEnabled: data.data.razorpayEnabled,
          codEnabled: data.data.codEnabled,
        });

        // Auto-select available payment method
        if (paymentData.method === "razorpay" && !data.data.razorpayEnabled) {
          if (data.data.codEnabled) {
            setPaymentData({ method: "cash_on_delivery" });
          }
        } else if (
          paymentData.method === "cash_on_delivery" &&
          !data.data.codEnabled
        ) {
          if (data.data.razorpayEnabled) {
            setPaymentData({ method: "razorpay" });
          }
        }
      }
    } catch (error) {
      console.error("Failed to load payment settings:", error);
      setPaymentSettings({
        razorpayEnabled: true,
        codEnabled: true,
      });
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = guestSubtotal || 0;
    const discount = appliedPromo ? appliedPromo.discountAmount : 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    const shipping = subtotalAfterDiscount >= 2000 ? 0 : 99;
    const tax = Math.round(subtotalAfterDiscount * 0.18);
    const total = subtotalAfterDiscount + shipping + tax;

    return {
      subtotal,
      discount,
      subtotalAfterDiscount,
      shipping,
      tax,
      total,
    };
  };

  const totals = calculateTotals();

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    try {
      setPromoLoading(true);

      const { subtotal } = calculateTotals();

      const itemsForValidation = guestItems.map((item) => ({
        productId: item.product?._id,
        categoryId: item.product?.category,
        quantity: item.quantity,
      }));

      const response = await promoCodeAPI.validatePromoCode({
        code: promoCode.trim().toUpperCase(),
        orderAmount: subtotal,
        items: itemsForValidation,
      });

      if (response.data.success) {
        setAppliedPromo({
          code: response.data.promoCode.code,
          description: response.data.promoCode.description,
          discountAmount: response.data.discount.amount,
          discountType: response.data.discount.type,
        });

        toast.success(`🎉 ${response.data.message}`);
        setShowPromoInput(false);
      }
    } catch (error) {
      console.error("Promo code error:", error);
      const errorMessage =
        error.response?.data?.message || "Invalid promo code";

      if (error.response?.data?.minOrderAmount) {
        toast.error(
          `${errorMessage} (Min: ₹${error.response.data.minOrderAmount})`
        );
      } else {
        toast.error(errorMessage);
      }

      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  // Remove promo code
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    toast.success("Promo code removed");
  };

  // Validate guest information
  const validateGuestInfo = () => {
    const errors = [];

    if (!guestInfo.firstName.trim()) errors.push("First name is required");
    if (!guestInfo.lastName.trim()) errors.push("Last name is required");

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!guestInfo.email.trim()) {
      errors.push("Email is required");
    } else if (!emailRegex.test(guestInfo.email)) {
      errors.push("Please enter a valid email address");
    }

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!guestInfo.phone.trim()) {
      errors.push("Phone number is required");
    } else if (!phoneRegex.test(guestInfo.phone.replace(/\D/g, ""))) {
      errors.push("Please enter a valid 10-digit mobile number");
    }

    if (!guestInfo.address.trim()) errors.push("Address is required");
    if (!guestInfo.city.trim()) errors.push("City is required");

    // Kerala-specific validation
    if (guestInfo.state !== "Kerala") {
      errors.push("We currently deliver only within Kerala");
    }

    // PIN code validation
    if (!guestInfo.zipCode.trim()) {
      errors.push("PIN code is required");
    } else if (!/^\d{6}$/.test(guestInfo.zipCode)) {
      errors.push("PIN code must be 6 digits");
    }

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return false;
    }

    return true;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setGuestInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle pincode autofill
  const handlePincodeAutofill = async (pincode) => {
    try {
      const response = await pincodeAPI.autofillAddress(pincode);
      if (response.data.success) {
        const data = response.data.data;
        setGuestInfo((prev) => ({
          ...prev,
          city: data.city || prev.city,
          state: "Kerala",
          zipCode: pincode,
        }));
        setPincodeAutofilled(true);
        toast.success("Address details filled!");
      }
    } catch (error) {
      console.error("Pincode autofill error:", error);
      toast.error("Unable to fetch address details for this PIN code");
    }
  };

  // Place order
  const placeOrder = async () => {
    // Validate guest information
    if (!validateGuestInfo()) {
      return;
    }

    // Validate items
    if (!guestItems || guestItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      setProcessing(true);

      // Prepare order data
      const orderData = {
        email: guestInfo.email,
        firstName: guestInfo.firstName,
        lastName: guestInfo.lastName,
        phone: guestInfo.phone,
        shippingAddress: {
          firstName: guestInfo.firstName,
          lastName: guestInfo.lastName,
          addressLine1: guestInfo.address,
          city: guestInfo.city,
          state: "Kerala",
          postalCode: guestInfo.zipCode,
          country: "India",
        },
        billingAddress: {
          firstName: guestInfo.firstName,
          lastName: guestInfo.lastName,
          addressLine1: guestInfo.address,
          city: guestInfo.city,
          state: "Kerala",
          postalCode: guestInfo.zipCode,
          country: "India",
        },
        paymentMethod: paymentData.method === "razorpay" ? "razorpay" : "cod",
        items: guestItems.map((item) => ({
          product: item.product._id,
          size: item.variant.size,
          color: item.variant.color.name,
          quantity: item.quantity,
        })),
        promoCode: appliedPromo?.code || null,
        shipping: totals.shipping,
        discount: totals.discount,
        specialInstructions: guestInfo.specialInstructions || "",
      };

      console.log("Placing guest order:", orderData);

      if (paymentData.method === "razorpay") {
        // ✅ NEW: Flatten items structure before sending to payment
        const flattenedItems = guestItems.map((item) => {
          console.log("📦 Processing item:", {
            productId: item.product._id,
            size: item.variant.size,
            color: item.variant.color.name,
            quantity: item.quantity,
          });

          return {
            productId: item.product._id,
            product: item.product._id,
            size: item.variant.size,
            color: item.variant.color.name, // Extract string from object
            quantity: item.quantity,
            price:
              item.priceAtAdd || item.product.salePrice || item.product.price,
          };
        });

        console.log("✅ Flattened items ready for payment:", flattenedItems);

        // Process Razorpay payment with flattened structure
        processPayment(
          {
            ...orderData,
            items: flattenedItems,
            shipping: totals.shipping,
            tax: totals.tax,
            discount: totals.discount,
          },
          async (verifiedOrder) => {
            console.log("✅ Payment successful, order created:", verifiedOrder);
            console.log("📦 Order details:", {
              id: verifiedOrder._id,
              orderNumber: verifiedOrder.orderNumber,
              trackingToken: verifiedOrder.trackingToken,
              hasTrackingToken: !!verifiedOrder.trackingToken,
            });

            toast.success("Order placed successfully!");

            // ⭐ IMPORTANT — prevents "empty cart" redirection before redirect
            setOrderPlaced(true);
            console.log("🚩 Order placed flag set - preventing cart redirect");

            // ⭐ Step 1: Clear backend cart
            await guestAPI.clearGuestCartDB(guestId);
            console.log("🧹 Backend cart cleared");

            // ⭐ Step 2: Clear frontend cart state
            clearGuestCart();
            console.log("🧹 Frontend cart state cleared");

            // ⭐ Step 3: Reset guest session completely
            clearGuestSession();
            console.log(
              "🚀 Guest session cleared — new guestId will be created on next visit"
            );

            // ⭐ Step 4: Navigate to tracking page
            const trackingToken = verifiedOrder.trackingToken;
            const orderId = verifiedOrder._id;

            if (trackingToken) {
              console.log("✅ Navigating to tracking page:", trackingToken);
              navigate(`/track-order/${trackingToken}`, { replace: true });
            } else if (orderId) {
              console.log("⚠️ No tracking token, using order ID:", orderId);
              navigate(`/order-success/${orderId}`, {
                replace: true,
              });
            } else {
              console.error("❌ No tracking token or order ID!");
              navigate("/", { replace: true });
            }
          },
          (error) => {
            console.error("❌ Payment failed:", error);
            toast.error(error.message || "Payment failed. Please try again.");
            setProcessing(false);
          }
        );
      } else if (paymentData.method === "cod") {
        // Cash on Delivery
        const response = await guestAPI.guestCheckout(guestId, orderData);

        if (response.data.success) {
          toast.success("Order placed successfully!");
          navigate(`/order-success/${response.data.order._id}`, {
            state: { trackingToken: response.data.order.trackingToken },
          });
        }
      }
    } catch (error) {
      console.error("Order placement error:", error);
      const message = error.response?.data?.message || "Failed to place order";
      toast.error(message);
      setProcessing(false);
    }
  };

  if (guestLoading) {
    return <Loading size="lg" text="Loading checkout..." fullScreen />;
  }

  return (
    <BackgroundWrapper>
      <div className="checkout-page">
        <div className="container">
          <div className="checkout-header">
            <button onClick={() => navigate("/cart")} className="back-btn">
              <ArrowLeft size={20} />
              Back to Cart
            </button>
            <h1>Guest Checkout</h1>
            <div className="security-badge">
              <Lock size={16} />
              Secure Checkout
            </div>
          </div>

          {/* Service Area Notice */}
          <ServiceAreaNotice />

          <div className="checkout-content">
            <div className="checkout-main">
              {/* Guest Information */}
              <div className="checkout-section">
                <div className="section-header">
                  <User size={24} />
                  <h2>Your Information</h2>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      First Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestInfo.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      placeholder="Enter your first name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Last Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestInfo.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      placeholder="Enter your last name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Email Address <span className="required">*</span>
                    </label>
                    <div className="input-with-icon">
                      <Mail size={18} />
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                    <p className="field-note">
                      We'll send your order confirmation here
                    </p>
                  </div>

                  <div className="form-group">
                    <label>
                      Phone Number <span className="required">*</span>
                    </label>
                    <div className="input-with-icon">
                      <Phone size={18} />
                      <input
                        type="tel"
                        value={guestInfo.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="10-digit mobile number"
                        maxLength="10"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="checkout-section">
                <div className="section-header">
                  <MapPin size={24} />
                  <h2>Delivery Address</h2>
                </div>

                <div className="form-group full-width">
                  <label>
                    Address <span className="required">*</span>
                  </label>
                  <textarea
                    value={guestInfo.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="House no., Building name, Street"
                    rows="3"
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      PIN Code <span className="required">*</span>
                    </label>
                    <PincodeInput
                      value={guestInfo.zipCode}
                      onChange={(pincode) => {
                        handleInputChange("zipCode", pincode);
                        if (pincode.length === 6) {
                          handlePincodeAutofill(pincode);
                        }
                      }}
                      placeholder="6-digit PIN code"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      City/District <span className="required">*</span>
                    </label>
                    <KeralaDistrictSelect
                      value={guestInfo.city}
                      onChange={(city) => handleInputChange("city", city)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value="Kerala"
                      disabled
                      className="disabled-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      value="India"
                      disabled
                      className="disabled-input"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="checkout-section">
                <div className="section-header">
                  <CreditCard size={24} />
                  <h2>Payment Method</h2>
                </div>

                <div className="payment-methods">
                  {paymentSettings.razorpayEnabled && (
                    <label className="payment-method">
                      <input
                        type="radio"
                        name="payment"
                        value="razorpay"
                        checked={paymentData.method === "razorpay"}
                        onChange={() => setPaymentData({ method: "razorpay" })}
                      />
                      <div className="method-details">
                        <h4>Online Payment (Razorpay)</h4>
                        <p>Pay securely with UPI, Cards, or Net Banking</p>
                      </div>
                      <CreditCard size={20} />
                    </label>
                  )}

                  {paymentSettings.codEnabled && (
                    <label className="payment-method">
                      <input
                        type="radio"
                        name="payment"
                        value="cash_on_delivery"
                        checked={paymentData.method === "cash_on_delivery"}
                        onChange={() =>
                          setPaymentData({ method: "cash_on_delivery" })
                        }
                      />
                      <div className="method-details">
                        <h4>Cash on Delivery</h4>
                        <p>Pay when you receive your order</p>
                      </div>
                      <Package size={20} />
                    </label>
                  )}
                </div>

                {/* Promo Code Section */}
                <div className="promo-section">
                  {!appliedPromo ? (
                    <>
                      {!showPromoInput ? (
                        <button
                          type="button"
                          className="add-promo-btn"
                          onClick={() => setShowPromoInput(true)}
                        >
                          <Tag size={18} />
                          Have a promo code?
                        </button>
                      ) : (
                        <div className="promo-input-group">
                          <input
                            type="text"
                            placeholder="Enter promo code"
                            value={promoCode}
                            onChange={(e) =>
                              setPromoCode(e.target.value.toUpperCase())
                            }
                            disabled={promoLoading}
                          />
                          <Button
                            variant="outline"
                            onClick={handleApplyPromo}
                            loading={promoLoading}
                            disabled={promoLoading || !promoCode.trim()}
                          >
                            Apply
                          </Button>
                          <button
                            type="button"
                            className="promo-cancel-btn"
                            onClick={() => {
                              setShowPromoInput(false);
                              setPromoCode("");
                            }}
                            disabled={promoLoading}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="applied-promo">
                      <div className="promo-info">
                        <Tag size={18} className="promo-icon" />
                        <div>
                          <p className="promo-code">{appliedPromo.code}</p>
                          <p className="promo-description">
                            {appliedPromo.description}
                          </p>
                          <p className="promo-savings">
                            You saved ₹{appliedPromo.discountAmount.toFixed(2)}!
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-promo-btn"
                        onClick={handleRemovePromo}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Policy Notice */}
                <div className="policy-notice">
                  <p>
                    <strong>📋 Cancellation Policy:</strong>{" "}
                    {paymentData.method === "razorpay"
                      ? "You can cancel within 24 hours of order placement for an automatic refund."
                      : "You can cancel this order anytime before it is shipped."}
                  </p>
                </div>

                <div className="final-actions">
                  <Button
                    onClick={placeOrder}
                    loading={processing}
                    disabled={processing}
                    className="place-order-btn"
                  >
                    <Lock size={18} />
                    {processing
                      ? "Processing..."
                      : `Place Order - ₹${totals.total.toFixed(2)}`}
                  </Button>

                  <p className="guest-account-note">
                    Want to track your orders easily?{" "}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => navigate("/register")}
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="order-summary">
              <h3>Order Summary</h3>

              <div className="cart-items">
                {guestItems.map((item, index) => (
                  <div key={index} className="cart-item">
                    <img
                      src={item.product?.images?.[0]?.url}
                      alt={item.product?.name}
                    />
                    <div className="item-details">
                      <h4>{item.product?.name}</h4>
                      <p>
                        Size: {item.variant?.size} | Color:{" "}
                        {item.variant?.color?.name}
                      </p>
                      <p>Qty: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      ₹
                      {(
                        (item.product?.salePrice || item.product?.price) *
                        item.quantity
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>

                {appliedPromo && (
                  <div className="total-row discount-row">
                    <span>
                      <Tag size={14} />
                      Discount ({appliedPromo.code}):
                    </span>
                    <span className="discount-amount">
                      -₹{totals.discount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="total-row">
                  <span>Shipping:</span>
                  <span>
                    {totals.shipping === 0 ? "Free" : `₹${totals.shipping}`}
                  </span>
                </div>

                <div className="total-row">
                  <span>Tax (GST):</span>
                  <span>₹{totals.tax.toFixed(2)}</span>
                </div>

                <div className="total-row final-total">
                  <span>Total:</span>
                  <span>₹{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="delivery-notice">
                <MapPin size={16} />
                <div>
                  <strong>Kerala Delivery</strong>
                  <p>Delivering within Kerala only</p>
                  {deliveryInfo && (
                    <p className="delivery-estimate">
                      Estimated: {deliveryInfo.estimatedDays} days
                    </p>
                  )}
                </div>
              </div>

              <div className="security-notice">
                <Lock size={16} />
                <span>Your information is secure and encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default GuestCheckout;
