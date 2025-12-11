// src/components/cart/GuestCartPrompt.js

import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import "./GuestCartPrompt.css";

const GuestCartPrompt = ({ itemCount }) => {
  const navigate = useNavigate();

  return (
    <div className="guest-cart-prompt">
      <div className="prompt-content">
        <ShoppingBag size={32} />
        <h3>Ready to Checkout?</h3>
        <p>
          You have {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
        </p>

        <div className="checkout-options">
          <Button
            onClick={() => navigate("/guest-checkout")}
            variant="primary"
            className="guest-checkout-btn"
          >
            Continue as Guest
            <ArrowRight size={18} />
          </Button>

          <div className="or-divider">
            <span>or</span>
          </div>

          <div className="auth-buttons">
            <Button
              onClick={() =>
                navigate("/login", { state: { from: "/checkout" } })
              }
              variant="outline"
            >
              Sign In
            </Button>
            <Button onClick={() => navigate("/register")} variant="outline">
              Create Account
            </Button>
          </div>
        </div>

        <div className="benefits-note">
          <p className="note-title">Benefits of Creating an Account:</p>
          <ul>
            <li>✓ Track all your orders in one place</li>
            <li>✓ Save addresses for faster checkout</li>
            <li>✓ Get exclusive offers and early access</li>
            <li>✓ Easy returns and refunds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GuestCartPrompt;
