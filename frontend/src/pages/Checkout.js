// src/pages/Checkout.js
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
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { userAPI, ordersAPI, pincodeAPI, promoCodeAPI } from "../services/api";
import { useRazorpay } from "../hooks/useRazorpay";
import Button from "../components/common/Button";
import Loading from "../components/common/Loading";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import PincodeInput from "../components/common/PincodeInput";
import KeralaDistrictSelect from "../components/common/KeralaDistrictSelect";
import ServiceAreaNotice from "../components/common/ServiceAreaNotice";
import toast from "react-hot-toast";
import "./Checkout.css";

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, items, cartTotal, clearCart, loading: cartLoading } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { processPayment, loading: paymentLoading } = useRazorpay();

  // Use items array as the actual cart data
  const actualCart = items || [];
  const actualTotal = cartTotal || 0;

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [pincodeAutofilled, setPincodeAutofilled] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  // ✅ NEW: Payment settings state
  const [paymentSettings, setPaymentSettings] = useState({
    razorpayEnabled: true,
    codEnabled: true,
  });

  // ✅ NEW: Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);

  // Form data with Kerala defaults
  const [shippingData, setShippingData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
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

  // Redirect if not authenticated or empty cart
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }

    if (!actualCart || !Array.isArray(actualCart) || actualCart.length === 0) {
      navigate("/cart");
      return;
    }

    loadUserData();
  }, [isAuthenticated, actualCart]);

  // ✅ NEW: Load payment settings
  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/payment-settings"
      );
      const data = await response.json();

      if (data.success) {
        setPaymentSettings({
          razorpayEnabled: data.data.razorpayEnabled,
          codEnabled: data.data.codEnabled,
        });

        // If current selection is disabled, switch to available method
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
      // Fallback: enable both if API fails
      setPaymentSettings({
        razorpayEnabled: true,
        codEnabled: true,
      });
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);

      const response = await userAPI.getProfile();
      console.log("User data response:", response.data);

      if (
        response.data.success &&
        response.data.user &&
        response.data.user.addresses
      ) {
        // Filter only Kerala addresses
        const keralaAddresses = response.data.user.addresses.filter(
          (addr) => addr.state === "Kerala"
        );
        setUserAddresses(keralaAddresses);
        console.log("Found Kerala addresses:", keralaAddresses);

        // Pre-fill with default Kerala address if available
        const defaultAddress = keralaAddresses.find((addr) => addr.isDefault);
        if (defaultAddress) {
          setShippingData({
            firstName: defaultAddress.firstName || user?.firstName || "",
            lastName: defaultAddress.lastName || user?.lastName || "",
            email: user?.email || "",
            phone: defaultAddress.phone || "",
            address: defaultAddress.addressLine1 || "",
            city: defaultAddress.city || "",
            state: "Kerala",
            zipCode: defaultAddress.postalCode || "",
            country: "India",
          });
        }
      } else {
        console.log("No addresses found in user data");
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    try {
      setPromoLoading(true);

      const { subtotal } = calculateTotals();

      // Prepare items for validation
      const itemsForValidation = actualCart.map((item) => ({
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

  // ✅ NEW: Remove promo code
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    toast.success("Promo code removed");
  };

  const handleAddressSelection = (address, index) => {
    if (address === null || index === null) {
      setSelectedAddressIndex(null);
      setShippingData({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: "",
        address: "",
        city: "",
        state: "Kerala",
        zipCode: "",
        country: "India",
      });
      setPincodeAutofilled(false);
      return;
    }

    if (selectedAddressIndex === index) {
      setSelectedAddressIndex(null);
      setShippingData({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: "",
        address: "",
        city: "",
        state: "Kerala",
        zipCode: "",
        country: "India",
      });
      setPincodeAutofilled(false);
    } else {
      setSelectedAddressIndex(index);
      setShippingData({
        firstName: address.firstName || user?.firstName || "",
        lastName: address.lastName || user?.lastName || "",
        email: user?.email || "",
        phone: address.phone || "",
        address: address.addressLine1 || address?.address || "",
        city: address.city || "",
        state: "Kerala",
        zipCode: address.postalCode || address?.zipCode || "",
        country: "India",
      });
      setPincodeAutofilled(true);
    }
  };

  const handlePincodeAutofill = (locationData) => {
    setShippingData((prev) => ({
      ...prev,
      city: locationData.city,
      state: "Kerala",
      country: "India",
    }));
    setPincodeAutofilled(true);
    toast.success(`Location detected: ${locationData.city}, Kerala`, {
      duration: 3000,
    });
  };

  const calculateTotals = () => {
    if (!actualCart || !Array.isArray(actualCart) || actualCart.length === 0) {
      return { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 };
    }

    let subtotal;
    if (actualTotal && actualTotal > 0) {
      subtotal = actualTotal;
    } else {
      subtotal = actualCart.reduce((sum, item) => {
        const price = item.product?.salePrice || item.product?.price || 0;
        return sum + price * (item.quantity || 1);
      }, 0);
    }

    // Dynamic shipping based on delivery info or default
    const shipping = deliveryInfo?.deliveryCharge ?? (subtotal > 2000 ? 0 : 99);

    // ✅ NEW: Apply discount if promo code applied
    const discount = appliedPromo?.discountAmount || 0;

    // Calculate tax on subtotal minus discount
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.18); // 18% GST

    const total = subtotal + shipping + tax - discount;

    return { subtotal, shipping, tax, discount, total };
  };

  const handleShippingSubmit = async (e) => {
    e.preventDefault();

    // If a saved address is selected, use it directly
    if (selectedAddressIndex !== null) {
      setCurrentStep(2);
      return;
    }

    // Validate the manual form
    const required = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "city",
      "zipCode",
    ];
    const missing = required.filter((field) => !shippingData[field]?.trim());

    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    // Verify address with backend
    try {
      const verifyResponse = await pincodeAPI.verifyAddress({
        pincode: shippingData.zipCode,
        city: shippingData.city,
        state: "Kerala",
      });

      if (!verifyResponse.data.success) {
        if (verifyResponse.data.isOutsideServiceArea) {
          toast.error("We currently deliver only within Kerala");
          return;
        }

        if (verifyResponse.data.suggestions) {
          const confirmMessage =
            `Address mismatch detected!\n\n` +
            `Your entered: ${shippingData.city}\n` +
            `Suggested: ${verifyResponse.data.suggestions.correctCity}\n\n` +
            `Do you want to continue?`;

          if (!window.confirm(confirmMessage)) {
            return;
          }
        }
      }
    } catch (error) {
      console.warn("Address verification failed:", error);
      toast.error(
        "Unable to verify PIN code. Please ensure it's a valid Kerala PIN code."
      );
    }

    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setCurrentStep(3);
  };

  const placeOrder = async () => {
    try {
      setProcessing(true);

      // Final Kerala address verification
      try {
        const verificationResponse = await pincodeAPI.verifyAddress({
          pincode: shippingData.zipCode,
          city: shippingData.city,
          state: "Kerala",
        });

        if (!verificationResponse.data.success) {
          if (verificationResponse.data.isOutsideServiceArea) {
            toast.error("We currently deliver only within Kerala");
            setProcessing(false);
            return;
          }
        }
      } catch (verificationError) {
        console.warn("Address verification failed:", verificationError);
      }

      const { subtotal, shipping, tax, discount, total } = calculateTotals();

      const orderData = {
        items: actualCart.map((item) => {
          const productId = item.product?._id || item.productId || item.product;
          const itemSize = item.size || item.selectedSize || item.variant?.size;
          const itemColor =
            item.color ||
            item.selectedColor ||
            item.variant?.color?.name ||
            item.variant?.color;

          return {
            product: productId,
            quantity: item.quantity || 1,
            size: itemSize,
            color: itemColor,
            price: item.product?.salePrice || item.product?.price || 0,
          };
        }),
        shippingAddress: {
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          email: shippingData.email,
          phone: shippingData.phone,
          addressLine1: shippingData.address,
          city: shippingData.city,
          state: "Kerala",
          postalCode: shippingData.zipCode,
          country: "India",
        },
        billingAddress: {
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          email: shippingData.email,
          phone: shippingData.phone,
          addressLine1: shippingData.address,
          city: shippingData.city,
          state: "Kerala",
          postalCode: shippingData.zipCode,
          country: "India",
        },
        paymentMethod: paymentData.method,
        shippingMethod: "standard",
        subtotal,
        shipping,
        tax,
        total,
        discount,
        promoCode: appliedPromo?.code || null,
      };

      // ✅ CHECK PAYMENT METHOD AND HANDLE ACCORDINGLY
      if (paymentData.method === "razorpay") {
        // RAZORPAY FLOW - Open payment modal
        console.log("💳 Initiating Razorpay payment...");

        await processPayment(
          orderData,
          // Success callback
          (order) => {
            console.log("✅ Payment successful, order created:", order);
            toast.success("🎉 Order placed successfully!");

            // Clear cart
            clearCart().catch((err) => console.warn("Cart clear error:", err));

            // Navigate to success page
            navigate(`/order-success/${order._id}`, {
              state: {
                orderSuccess: true,
                fromCheckout: true,
                paymentMethod: "razorpay",
              },
              replace: true,
            });
          },
          // Failure callback
          (error) => {
            console.error("❌ Payment failed:", error);
            setProcessing(false);
            // Error toast already shown by useRazorpay hook
          }
        );
      } else if (paymentData.method === "cash_on_delivery") {
        // COD FLOW - Create order directly
        console.log("📦 Creating COD order...");

        const response = await ordersAPI.createOrder(orderData);

        if (response?.data?.success && response.data.order) {
          const orderId = response.data.order._id;

          console.log("✅ COD order created successfully with ID:", orderId);

          toast.success("🎉 Order placed successfully!");

          // Clear cart
          clearCart().catch((err) => console.warn("Cart clear error:", err));

          // Navigate to success page
          navigate(`/order-success/${orderId}`, {
            state: {
              orderSuccess: true,
              fromCheckout: true,
              paymentMethod: "cod",
            },
            replace: true,
          });
        } else {
          throw new Error("Failed to create order");
        }
      }
    } catch (error) {
      console.error("❌ Order placement error:", error);

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        toast.error(
          "Request timeout. Your order may have been created. Please check your orders page.",
          { duration: 5000 }
        );
        setTimeout(() => {
          navigate("/account/orders", { replace: true });
        }, 2000);
        return;
      }

      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message;
        if (Array.isArray(errorMessage)) {
          toast.error(errorMessage.join(", "));
        } else {
          toast.error(errorMessage || "Invalid order data");
        }
      } else if (error.response?.status === 401) {
        toast.error("Please login to place an order");
        navigate("/login");
      } else if (error.response?.data?.isOutsideServiceArea) {
        toast.error("We currently deliver only within Kerala");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to place order. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return <Loading size="lg" text="Loading checkout..." fullScreen />;
  }

  return (
    <BackgroundWrapper>
      <div className="checkout-page">
        <div className="container">
          {/* Header */}
          <div className="checkout-header">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Checkout</h1>
            <div className="step-indicator">
              <span className={currentStep >= 1 ? "active" : ""}>1</span>
              <span className={currentStep >= 2 ? "active" : ""}>2</span>
              <span className={currentStep >= 3 ? "active" : ""}>3</span>
            </div>
          </div>

          <div className="checkout-content">
            {/* Main Content */}
            <div className="checkout-main">
              {/* Step 1: Shipping Information */}
              {currentStep === 1 && (
                <div className="checkout-step">
                  <div className="step-header">
                    <MapPin size={24} />
                    <h2>Shipping Information</h2>
                    <div className="kerala-badge">
                      <MapPin size={14} />
                      <span>Kerala Delivery Only</span>
                    </div>
                  </div>

                  <ServiceAreaNotice variant="info" />

                  {userAddresses && userAddresses.length > 0 && (
                    <div className="saved-addresses">
                      <h3>Use Saved Address</h3>
                      <div className="address-options">
                        {userAddresses.map((address, index) => (
                          <div
                            key={index}
                            className={`address-option ${
                              selectedAddressIndex === index ? "selected" : ""
                            }`}
                          >
                            <label>
                              <input
                                type="radio"
                                name="savedAddress"
                                checked={selectedAddressIndex === index}
                                onChange={() =>
                                  handleAddressSelection(address, index)
                                }
                              />
                              <div className="address-display">
                                <p>
                                  <strong>
                                    {address.firstName} {address.lastName}
                                  </strong>
                                </p>
                                <p>{address.addressLine1}</p>
                                {address.addressLine2 && (
                                  <p>{address.addressLine2}</p>
                                )}
                                <p>
                                  {address.city}, Kerala {address.postalCode}
                                </p>
                                <p>{address.phone}</p>
                                {address.isDefault && (
                                  <span className="default-badge">Default</span>
                                )}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>

                      {selectedAddressIndex !== null && (
                        <div className="address-actions">
                          <button
                            type="button"
                            className="clear-selection-btn"
                            onClick={() => handleAddressSelection(null, null)}
                          >
                            Clear Selection & Enter New Address
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedAddressIndex === null && (
                    <>
                      <div className="form-divider">
                        <span>Enter New Address</span>
                      </div>

                      <form
                        onSubmit={handleShippingSubmit}
                        className="checkout-form"
                      >
                        <div className="form-row">
                          <div className="form-group">
                            <label>First Name *</label>
                            <input
                              type="text"
                              value={shippingData.firstName}
                              onChange={(e) =>
                                setShippingData({
                                  ...shippingData,
                                  firstName: e.target.value,
                                })
                              }
                              placeholder="Enter first name"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Last Name *</label>
                            <input
                              type="text"
                              value={shippingData.lastName}
                              onChange={(e) =>
                                setShippingData({
                                  ...shippingData,
                                  lastName: e.target.value,
                                })
                              }
                              placeholder="Enter last name"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Email *</label>
                            <input
                              type="email"
                              value={shippingData.email}
                              onChange={(e) =>
                                setShippingData({
                                  ...shippingData,
                                  email: e.target.value,
                                })
                              }
                              placeholder="your@email.com"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Phone *</label>
                            <input
                              type="tel"
                              value={shippingData.phone}
                              onChange={(e) =>
                                setShippingData({
                                  ...shippingData,
                                  phone: e.target.value,
                                })
                              }
                              placeholder="+91 9876543210"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Street Address *</label>
                          <input
                            type="text"
                            value={shippingData.address}
                            onChange={(e) =>
                              setShippingData({
                                ...shippingData,
                                address: e.target.value,
                              })
                            }
                            placeholder="House number, street name, area"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Kerala PIN Code *</label>
                          <PincodeInput
                            value={shippingData.zipCode}
                            onChange={(value) => {
                              setShippingData({
                                ...shippingData,
                                zipCode: value,
                              });
                              setPincodeAutofilled(false);
                            }}
                            onAutofill={handlePincodeAutofill}
                            showDeliveryInfo={true}
                            required
                          />
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>District *</label>
                            {pincodeAutofilled ? (
                              <div className="autofilled-field">
                                <input
                                  type="text"
                                  value={shippingData.city}
                                  disabled
                                  className="autofilled-input"
                                />
                                <small className="autofilled-label">
                                  ✓ Auto-filled from PIN code
                                </small>
                              </div>
                            ) : (
                              <KeralaDistrictSelect
                                value={shippingData.city}
                                onChange={(value) =>
                                  setShippingData({
                                    ...shippingData,
                                    city: value,
                                  })
                                }
                                required
                              />
                            )}
                          </div>

                          <div className="form-group">
                            <label>State</label>
                            <input
                              type="text"
                              value="Kerala"
                              disabled
                              className="disabled-input kerala-field"
                            />
                            <small className="field-note">
                              We deliver within Kerala only
                            </small>
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

                        <Button type="submit" className="continue-btn">
                          Continue to Payment
                        </Button>
                      </form>
                    </>
                  )}

                  {selectedAddressIndex !== null && (
                    <div className="selected-address-actions">
                      <Button
                        type="button"
                        className="continue-btn"
                        onClick={() => setCurrentStep(2)}
                      >
                        Continue with Selected Address
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Payment Information */}
              {currentStep === 2 && (
                <div className="checkout-step">
                  <div className="step-header">
                    <CreditCard size={24} />
                    <h2>Payment Information</h2>
                  </div>

                  <form
                    onSubmit={handlePaymentSubmit}
                    className="checkout-form"
                  >
                    <div className="payment-methods">
                      {/* ✅ Only show Razorpay if enabled */}
                      {paymentSettings.razorpayEnabled && (
                        <label className="payment-method">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="razorpay"
                            checked={paymentData.method === "razorpay"}
                            onChange={(e) =>
                              setPaymentData({
                                ...paymentData,
                                method: e.target.value,
                              })
                            }
                          />
                          <CreditCard size={20} />
                          Pay Online (Cards/UPI/Netbanking)
                        </label>
                      )}

                      {/* ✅ Only show COD if enabled */}
                      {paymentSettings.codEnabled && (
                        <label className="payment-method">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cash_on_delivery"
                            checked={paymentData.method === "cash_on_delivery"}
                            onChange={(e) =>
                              setPaymentData({
                                ...paymentData,
                                method: e.target.value,
                              })
                            }
                          />
                          <Package size={20} />
                          Cash on Delivery
                        </label>
                      )}

                      {/* ✅ Show warning if no payment methods available */}
                      {!paymentSettings.razorpayEnabled &&
                        !paymentSettings.codEnabled && (
                          <div
                            className="alert warning"
                            style={{
                              padding: "15px",
                              background: "#fff3cd",
                              border: "1px solid #ffc107",
                              borderRadius: "8px",
                              color: "#856404",
                            }}
                          >
                            <strong>⚠️ No payment methods available</strong>
                            <p style={{ margin: "5px 0 0 0" }}>
                              Please contact support or try again later.
                            </p>
                          </div>
                        )}
                    </div>

                    {paymentData.method === "razorpay" && (
                      <div
                        className="payment-info"
                        style={{
                          padding: "20px",
                          background: "#f9fafb",
                          borderRadius: "8px",
                          marginTop: "20px",
                          marginBottom: "20px",
                        }}
                      >
                        <h4 style={{ marginBottom: "10px" }}>
                          Secure Payment via Razorpay
                        </h4>
                        <p style={{ marginBottom: "15px", color: "#666" }}>
                          After clicking "Review Order", you'll be able to
                          choose from multiple payment options including
                          credit/debit cards, UPI, net banking, and wallets.
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            flexWrap: "wrap",
                            fontSize: "14px",
                            color: "#444",
                          }}
                        >
                          <span>💳 Credit/Debit Cards</span>
                          <span>📱 UPI</span>
                          <span>🏦 Net Banking</span>
                          <span>💰 Wallets</span>
                        </div>

                        {/* Cancellation Policy Notice */}
                        <div
                          style={{
                            marginTop: "15px",
                            padding: "12px",
                            background: "#fff3cd",
                            border: "1px solid #ffc107",
                            borderRadius: "6px",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: "#856404",
                              lineHeight: "1.5",
                            }}
                          >
                            <strong>⏰ Cancellation Policy:</strong> You can
                            cancel this order within <strong>24 hours</strong>{" "}
                            of placement for an automatic refund (5-7 business
                            days). After 24 hours, you can still return the
                            product within 30 days of delivery.
                          </p>
                        </div>
                      </div>
                    )}

                    {paymentData.method === "cash_on_delivery" && (
                      <div
                        className="payment-info"
                        style={{
                          padding: "20px",
                          background: "#f0f9ff",
                          borderRadius: "8px",
                          marginTop: "20px",
                          marginBottom: "20px",
                        }}
                      >
                        <h4 style={{ marginBottom: "10px" }}>
                          Cash on Delivery
                        </h4>
                        <p style={{ marginBottom: "10px", color: "#666" }}>
                          Pay with cash when your order is delivered to your
                          doorstep.
                        </p>

                        {/* COD Cancellation Policy Notice */}
                        <div
                          style={{
                            marginTop: "15px",
                            padding: "12px",
                            background: "#d1fae5",
                            border: "1px solid #10b981",
                            borderRadius: "6px",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: "#065f46",
                              lineHeight: "1.5",
                            }}
                          >
                            <strong>✓ Flexible Cancellation:</strong> COD orders
                            can be cancelled anytime before shipping. You'll
                            receive a confirmation email once cancelled.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="checkout-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                      >
                        Back to Shipping
                      </Button>
                      <Button type="submit" className="continue-btn">
                        Review Order
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 3: Order Review */}
              {currentStep === 3 && (
                <div className="checkout-step">
                  <div className="step-header">
                    <CheckCircle size={24} />
                    <h2>Review Your Order</h2>
                  </div>

                  <div className="order-review">
                    {/* Shipping Address */}
                    <div className="review-section">
                      <h3>Shipping Address</h3>
                      <div className="address-display">
                        <p>
                          <strong>
                            {shippingData.firstName} {shippingData.lastName}
                          </strong>
                          <br />
                          {shippingData.address}
                        </p>
                        <p>
                          {shippingData.city}, Kerala {shippingData.zipCode}
                        </p>
                        <p>India</p>
                        <p>{shippingData.phone}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="edit-btn"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Payment Method */}
                    <div className="review-section">
                      <h3>Payment Method</h3>
                      <p>
                        {paymentData.method === "razorpay"
                          ? "Pay Online (Cards/UPI/Netbanking)"
                          : "Cash on Delivery"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="edit-btn"
                      >
                        Edit
                      </button>
                    </div>

                    {/* ✅ NEW: Promo Code Section */}
                    <div className="review-section promo-section">
                      <h3>
                        <Tag size={20} />
                        Have a Promo Code?
                      </h3>

                      {!appliedPromo ? (
                        <>
                          {!showPromoInput ? (
                            <button
                              type="button"
                              className="promo-toggle-btn"
                              onClick={() => setShowPromoInput(true)}
                            >
                              + Add Promo Code
                            </button>
                          ) : (
                            <div className="promo-input-group">
                              <input
                                type="text"
                                value={promoCode}
                                onChange={(e) =>
                                  setPromoCode(e.target.value.toUpperCase())
                                }
                                placeholder="Enter promo code"
                                className="promo-input"
                                disabled={promoLoading}
                              />
                              <Button
                                onClick={handleApplyPromo}
                                loading={promoLoading}
                                disabled={!promoCode.trim() || promoLoading}
                                size="sm"
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
                                You saved ₹
                                {appliedPromo.discountAmount.toFixed(2)}!
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

                    {/* Cancellation Policy Reminder */}
                    <div
                      style={{
                        padding: "15px",
                        background:
                          paymentData.method === "razorpay"
                            ? "#fff3cd"
                            : "#d1fae5",
                        border: `1px solid ${
                          paymentData.method === "razorpay"
                            ? "#ffc107"
                            : "#10b981"
                        }`,
                        borderRadius: "8px",
                        marginTop: "20px",
                        marginBottom: "20px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color:
                            paymentData.method === "razorpay"
                              ? "#856404"
                              : "#065f46",
                          lineHeight: "1.6",
                        }}
                      >
                        {paymentData.method === "razorpay" ? (
                          <>
                            <strong>📋 Cancellation Policy:</strong> By placing
                            this order, you acknowledge that you can cancel
                            within <strong>24 hours</strong> of order placement
                            for an automatic refund. After 24 hours, you may
                            return the product within 30 days of delivery.
                          </>
                        ) : (
                          <>
                            <strong>📋 Cancellation Policy:</strong> You can
                            cancel this Cash on Delivery order anytime before it
                            is shipped. Once shipped, you may return the product
                            within 30 days of delivery.
                          </>
                        )}
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
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="order-summary">
              <h3>Order Summary</h3>

              <div className="cart-items">
                {actualCart &&
                Array.isArray(actualCart) &&
                actualCart.length > 0 ? (
                  actualCart.map((item, index) => (
                    <div
                      key={`${item.product?._id || index}-${item.size}-${
                        item.color
                      }`}
                      className="cart-item"
                    >
                      <img
                        src={
                          item.product?.images?.[0]?.url ||
                          "/placeholder-image.jpg"
                        }
                        alt={item.product?.name || "Product"}
                        onError={(e) => {
                          e.target.src = "/placeholder-image.jpg";
                        }}
                      />
                      <div className="item-details">
                        <h4>{item.product?.name || "Product"}</h4>
                        <p>
                          Size:{" "}
                          {item.size ||
                            item.selectedSize ||
                            item.variant?.size ||
                            "N/A"}{" "}
                          | Color:{" "}
                          {item.color ||
                            item.selectedColor ||
                            item.variant?.color?.name ||
                            item.variant?.color ||
                            "N/A"}
                        </p>
                        <p>Qty: {item.quantity}</p>
                      </div>
                      <div className="item-price">
                        ₹
                        {(
                          (item.product?.salePrice ||
                            item.product?.price ||
                            0) * item.quantity
                        ).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-cart">
                    <p>Your cart is empty</p>
                  </div>
                )}
              </div>

              <div className="order-totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>

                {/* ✅ NEW: Show discount if applied */}
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

              {/* Kerala Delivery Notice */}
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
                <span>Your payment information is secure and encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Checkout;
