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
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { userAPI, ordersAPI, pincodeAPI } from "../services/api";
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

  // Use items array as the actual cart data
  const actualCart = items || [];
  const actualTotal = cartTotal || 0;

  console.log("Checkout cart data:", { cart, items, actualCart, cartTotal });

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [pincodeAutofilled, setPincodeAutofilled] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

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
    method: "razorpay", // Changed from "card" to match Order model enum
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
  });

  // Diagnostic useEffect to check cart structure
  useEffect(() => {
    if (actualCart && actualCart.length > 0) {
      console.log("🛒 CART STRUCTURE DIAGNOSTIC:");
      console.log("Full cart object:", cart);
      console.log("Items array:", items);
      console.log("Actual cart:", actualCart);
      console.log("\n📋 First cart item details:");
      const firstItem = actualCart[0];
      console.log("First item:", firstItem);
      console.log("Available keys:", Object.keys(firstItem));
      console.log("Product:", firstItem.product);
      console.log("Size field:", firstItem.size);
      console.log("Color field:", firstItem.color);
      console.log("Selected size:", firstItem.selectedSize);
      console.log("Selected color:", firstItem.selectedColor);
      console.log("Variant:", firstItem.variant);

      // Check all possible locations for size and color
      const possibleSizes = {
        "item.size": firstItem.size,
        "item.selectedSize": firstItem.selectedSize,
        "item.variant?.size": firstItem.variant?.size,
        "item.product?.size": firstItem.product?.size,
      };

      const possibleColors = {
        "item.color": firstItem.color,
        "item.selectedColor": firstItem.selectedColor,
        "item.variant?.color": firstItem.variant?.color,
        "item.variant?.color?.name": firstItem.variant?.color?.name,
        "item.product?.color": firstItem.product?.color,
      };

      console.log("\n🔍 Possible size locations:", possibleSizes);
      console.log("🔍 Possible color locations:", possibleColors);

      console.log(
        "\n✅ Found size:",
        Object.entries(possibleSizes).find(([k, v]) => v)?.[1] || "NOT FOUND"
      );
      console.log(
        "✅ Found color:",
        Object.entries(possibleColors).find(([k, v]) => v)?.[1] || "NOT FOUND"
      );
    }
  }, [actualCart, cart, items]);

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
      return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
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
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + shipping + tax;

    return { subtotal, shipping, tax, total };
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
      // Continue if verification service is down
      toast.error(
        "Unable to verify PIN code. Please ensure it's a valid Kerala PIN code."
      );
    }

    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (paymentData.method === "razorpay") {
      const required = ["cardNumber", "expiryDate", "cvv", "nameOnCard"];
      const missing = required.filter((field) => !paymentData[field]?.trim());

      if (missing.length > 0) {
        toast.error(`Please fill in: ${missing.join(", ")}`);
        return;
      }

      if (paymentData.cardNumber.replace(/\s/g, "").length < 16) {
        toast.error("Invalid card number");
        return;
      }
    }

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

      const { subtotal, shipping, tax, total } = calculateTotals();
      console.log("📤 Creating order...");

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
            price: item.product?.salePrice || item.product?.price || 0, // ✅ ADD THIS
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
      };
      console.log("📤 Complete order data:", orderData);

      const response = await ordersAPI.createOrder(orderData);

      console.log("✅ Order response received:", response);
      console.log("✅ Response data:", response.data);

      if (response?.data?.success && response.data.order) {
        const orderId = response.data.order._id;

        console.log("✅ Order created successfully with ID:", orderId);

        // Show success toast
        toast.success("🎉 Order placed successfully!");

        // Navigate FIRST before clearing cart
        navigate(`/order-success/${orderId}`, {
          state: {
            orderSuccess: true,
            fromCheckout: true,
          },
          replace: true,
        });

        // Clear cart AFTER navigation (in background)
        setTimeout(() => {
          clearCart().catch((err) => console.warn("Cart clear error:", err));
        }, 100);
      } else {
        console.error("❌ Unexpected response format:", response);
        toast.error(
          "Order created but couldn't get details. Check your orders page."
        );
        setTimeout(() => {
          navigate("/account/orders", { replace: true });
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Order creation error:", error);
      console.error("❌ Error response:", error.response?.data);

      // Check if it's a timeout or network error
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        toast.error(
          "Request timeout. Your order may have been created. Please check your orders page.",
          {
            duration: 5000,
          }
        );
        setTimeout(() => {
          navigate("/account/orders", { replace: true });
        }, 2000);
        return;
      }

      // Check if order was actually created (status 201)
      if (error.response?.status === 201 || error.request?.status === 201) {
        toast.success("Order placed successfully!");
        // Try to extract order ID from error response
        const orderId = error.response?.data?.order?._id;
        if (orderId) {
          navigate(`/order-success/${orderId}`, { replace: true });
        } else {
          navigate("/account/orders", { replace: true });
        }
        return;
      }

      // Handle specific error statuses
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

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
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

                  {/* Service Area Notice */}
                  <ServiceAreaNotice variant="info" />

                  {/* Saved Addresses */}
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
                        {/* Name Fields */}
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

                        {/* Contact Fields */}
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

                        {/* Address */}
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

                        {/* PIN Code (First for autofill) */}
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

                        {/* Location Fields */}
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
                        Credit/Debit Card
                      </label>

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
                    </div>

                    {paymentData.method === "razorpay" && (
                      <div className="card-details">
                        <div className="form-group">
                          <label>Name on Card *</label>
                          <input
                            type="text"
                            value={paymentData.nameOnCard}
                            onChange={(e) =>
                              setPaymentData({
                                ...paymentData,
                                nameOnCard: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Card Number *</label>
                          <input
                            type="text"
                            value={paymentData.cardNumber}
                            onChange={(e) =>
                              setPaymentData({
                                ...paymentData,
                                cardNumber: formatCardNumber(e.target.value),
                              })
                            }
                            placeholder="1234 5678 9012 3456"
                            maxLength="19"
                            required
                          />
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Expiry Date *</label>
                            <input
                              type="text"
                              value={paymentData.expiryDate}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "");
                                if (value.length >= 2) {
                                  value =
                                    value.substring(0, 2) +
                                    "/" +
                                    value.substring(2, 4);
                                }
                                setPaymentData({
                                  ...paymentData,
                                  expiryDate: value,
                                });
                              }}
                              placeholder="MM/YY"
                              maxLength="5"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>CVV *</label>
                            <input
                              type="text"
                              value={paymentData.cvv}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  cvv: e.target.value.replace(/\D/g, ""),
                                })
                              }
                              placeholder="123"
                              maxLength="4"
                              required
                            />
                          </div>
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
                        </p>
                        <p>{shippingData.address}</p>
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
                          ? `Card ending in ${paymentData.cardNumber.slice(-4)}`
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
                          : `Place Order - ₹${totals.total}`}
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
