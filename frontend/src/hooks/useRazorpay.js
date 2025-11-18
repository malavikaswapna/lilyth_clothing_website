// hooks/useRazorpay.js
import { useState } from "react";
import { ordersAPI } from "../services/api";
import toast from "react-hot-toast";

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        console.log("✅ Razorpay script already loaded");
        resolve(true);
        return;
      }

      console.log("📦 Loading Razorpay script...");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        console.log("✅ Razorpay script loaded successfully");
        resolve(true);
      };
      script.onerror = () => {
        console.error("❌ Failed to load Razorpay script");
        toast.error("Failed to load Razorpay SDK");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const processPayment = async (orderData, onSuccess, onFailure) => {
    console.log("🚀 Starting payment process...");
    console.log("📦 Order data:", orderData);

    try {
      setLoading(true);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway");
      }

      // Calculate order totals
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const shipping = orderData.shipping || 0;
      const tax = orderData.tax || subtotal * 0.18; // 18% GST
      const discount = orderData.discount || 0;
      const total = subtotal + shipping + tax - discount;

      console.log("💵 Order totals:", {
        subtotal,
        shipping,
        tax,
        discount,
        total,
      });

      // Step 1: Create Razorpay order via backend
      console.log("📤 Creating payment order on backend...");
      const paymentOrderResponse = await ordersAPI.createPaymentOrder({
        amount: total,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          customerName: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
          customerEmail: orderData.shippingAddress.email,
          items: orderData.items.length,
          shipping: orderData.shippingAddress.city,
        },
      });

      console.log("📥 Payment order response:", paymentOrderResponse.data);

      if (!paymentOrderResponse.data.success) {
        throw new Error(
          paymentOrderResponse.data.message || "Failed to create payment order"
        );
      }

      const { order, key, user } = paymentOrderResponse.data;

      console.log("✅ Razorpay order created successfully!");
      console.log("   Order ID:", order.id);
      console.log("   Amount:", order.amount, "paise");
      console.log("   Key ID:", key);

      // Step 2: Configure Razorpay checkout options
      const options = {
        key: key, // Key ID from backend
        amount: order.amount, // Amount in paise
        currency: order.currency,
        name: "LILYTH",
        description: "Fashion Purchase",
        image: "/logo192.png",
        order_id: order.id,
        handler: async function (response) {
          console.log("💳 Payment successful!", response);
          console.log("   Payment ID:", response.razorpay_payment_id);
          console.log("   Order ID:", response.razorpay_order_id);
          console.log("   Signature:", response.razorpay_signature);

          try {
            console.log("🔐 Verifying payment on backend...");
            const verificationResponse = await ordersAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: {
                ...orderData,
                total,
                subtotal,
                shipping,
                tax,
                discount,
              },
            });

            console.log("📥 Verification response:", verificationResponse.data);

            if (verificationResponse.data.success) {
              console.log("✅ Payment verified successfully!");
              toast.success("🎉 Payment successful! Order placed.");
              onSuccess(verificationResponse.data.order);
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            console.error("❌ Payment verification error:", error);
            toast.error("Payment verification failed. Please contact support.");
            onFailure(error);
          }
        },
        prefill: {
          name:
            user?.name ||
            `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
          email: user?.email || orderData.shippingAddress.email,
          contact: user?.contact || orderData.shippingAddress.phone,
        },
        notes: {
          address: orderData.shippingAddress.addressLine1,
          city: orderData.shippingAddress.city,
          state: orderData.shippingAddress.state,
        },
        theme: {
          color: "#b87049", // Your brand color
        },
        modal: {
          ondismiss: function () {
            console.log("⚠️ Payment modal dismissed by user");
            toast("Payment cancelled", {
              icon: "ℹ️",
              duration: 3000,
            });
            setLoading(false);
            onFailure(new Error("Payment cancelled by user"));
          },
        },
      };

      console.log("⚙️ Razorpay options configured:", {
        key: options.key,
        amount: options.amount,
        order_id: options.order_id,
        prefill: options.prefill,
      });

      // Step 3: Create Razorpay instance
      console.log("🔨 Creating Razorpay instance...");
      if (!window.Razorpay) {
        throw new Error("Razorpay is not loaded");
      }

      const rzp = new window.Razorpay(options);
      console.log("✅ Razorpay instance created");

      // Handle payment failure
      rzp.on("payment.failed", async function (response) {
        console.error("❌ Payment failed:", response.error);
        console.error("   Code:", response.error.code);
        console.error("   Description:", response.error.description);

        try {
          await ordersAPI.handlePaymentFailure({
            razorpay_order_id: order.id,
            error_code: response.error.code,
            error_description: response.error.description,
            error_source: response.error.source,
            error_step: response.error.step,
            error_reason: response.error.reason,
          });
        } catch (error) {
          console.error("Error logging payment failure:", error);
        }

        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
        onFailure(response.error);
      });

      // Step 4: Open Razorpay modal
      console.log("🚪 Opening Razorpay modal...");
      rzp.open();
      console.log("✅ Razorpay modal opened successfully!");
    } catch (error) {
      console.error("❌ Payment process error:", error);
      console.error("   Error message:", error.message);
      console.error("   Error stack:", error.stack);

      toast.error(error.message || "Failed to initiate payment");
      setLoading(false);
      onFailure(error);
    }
  };

  // Test card details for Razorpay Test Mode
  const getTestCardDetails = () => {
    return {
      cards: [
        {
          type: "Visa",
          number: "4111 1111 1111 1111",
          cvv: "Any 3 digits",
          expiry: "Any future date",
        },
        {
          type: "Mastercard",
          number: "5555 5555 5555 4444",
          cvv: "Any 3 digits",
          expiry: "Any future date",
        },
      ],
      upi: "success@razorpay",
      netbanking: "All banks supported in test mode",
    };
  };

  return {
    processPayment,
    loading,
    getTestCardDetails,
  };
};

export default useRazorpay;
