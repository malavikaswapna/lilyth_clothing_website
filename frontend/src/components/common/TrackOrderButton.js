// Test this version of TrackOrderButton with console logs

import React from "react";
import { Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./TrackOrderButton.css";

const TrackOrderButton = ({ variant = "default", className = "", onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate first
    navigate("/track-order");

    // Then close menu if onClick is provided
    if (onClick) {
      onClick();
    } else {
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`track-order-btn track-order-btn-${variant} ${className}`}
      aria-label="Track your order"
    >
      <Package size={18} />
      <span>Track Order</span>
    </button>
  );
};

export default TrackOrderButton;
