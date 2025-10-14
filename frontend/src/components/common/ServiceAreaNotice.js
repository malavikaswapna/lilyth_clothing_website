// src/components/common/ServiceAreaNotice.js
import React from "react";
import { MapPin, Info } from "lucide-react";
import "./ServiceAreaNotice.css";

const ServiceAreaNotice = ({ variant = "info" }) => {
  return (
    <div className={`service-area-notice ${variant}`}>
      <div className="notice-icon">
        <MapPin size={20} />
      </div>
      <div className="notice-content">
        <h4>Kerala Delivery Only</h4>
        <p>
          We currently deliver within Kerala state only. Please ensure your PIN
          code is from Kerala (670xxx-695xxx, 686xxx).
        </p>
      </div>
    </div>
  );
};

export default ServiceAreaNotice;
