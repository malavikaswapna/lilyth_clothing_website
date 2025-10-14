// src/components/common/PincodeInput.js
import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader,
  Truck,
  Clock,
} from "lucide-react";
import { pincodeAPI } from "../../services/api";
import "./PincodeInput.css";

const PincodeInput = ({
  value,
  onChange,
  onAutofill,
  error,
  disabled = false,
  required = false,
  showDeliveryInfo = false,
}) => {
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [pincodeData, setPincodeData] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [isOutsideServiceArea, setIsOutsideServiceArea] = useState(false);

  useEffect(() => {
    if (value && value.length === 6) {
      validatePincode(value);
    } else {
      resetValidation();
    }
  }, [value]);

  const resetValidation = () => {
    setValidationStatus(null);
    setValidationMessage("");
    setPincodeData(null);
    setDeliveryInfo(null);
    setIsOutsideServiceArea(false);
  };

  const validatePincode = async (pincode) => {
    try {
      setValidating(true);

      // Validate PIN code
      const response = await pincodeAPI.validatePincode(pincode);

      if (response.data.success) {
        setValidationStatus("valid");
        setValidationMessage(response.data.message);
        setPincodeData(response.data.data);
        setIsOutsideServiceArea(false);

        // Get delivery information if enabled
        if (showDeliveryInfo) {
          await fetchDeliveryInfo(pincode);
        }

        // Call autofill callback
        if (onAutofill && response.data.data) {
          onAutofill({
            city: response.data.data.district,
            state: "Kerala",
            country: "India",
          });
        }
      }
    } catch (error) {
      const errorData = error.response?.data;
      setValidationStatus("invalid");
      setValidationMessage(errorData?.message || "Invalid PIN code");
      setIsOutsideServiceArea(errorData?.isOutsideServiceArea || false);
      setPincodeData(null);
      setDeliveryInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const fetchDeliveryInfo = async (pincode) => {
    try {
      const response = await pincodeAPI.getDeliveryInfo(pincode);
      if (response.data.success) {
        setDeliveryInfo(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch delivery info:", error);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(newValue);
  };

  return (
    <div className="pincode-input-wrapper">
      <div className={`pincode-input-container ${validationStatus || ""}`}>
        <MapPin size={18} className="pincode-icon" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Kerala PIN (6 digits)"
          maxLength="6"
          disabled={disabled}
          required={required}
          className={`pincode-input ${error ? "error" : ""}`}
        />

        <div className="validation-icon">
          {validating && <Loader size={16} className="spinning" />}
          {!validating && validationStatus === "valid" && (
            <CheckCircle size={16} className="valid-icon" />
          )}
          {!validating && validationStatus === "invalid" && (
            <AlertCircle size={16} className="invalid-icon" />
          )}
        </div>
      </div>

      {/* Validation Message */}
      {validationMessage && !error && (
        <p className={`validation-message ${validationStatus}`}>
          {validationMessage}
        </p>
      )}

      {/* Error from parent */}
      {error && <p className="validation-message invalid">{error}</p>}

      {/* Outside Service Area Warning */}
      {isOutsideServiceArea && (
        <div className="service-area-warning">
          <AlertCircle size={16} />
          <div>
            <strong>Delivery Not Available</strong>
            <p>
              We currently deliver only within Kerala state. Please enter a
              Kerala PIN code.
            </p>
          </div>
        </div>
      )}

      {/* Location Details */}
      {pincodeData && validationStatus === "valid" && (
        <div className="pincode-details">
          <p className="location-info">
            <MapPin size={14} />
            <span>
              <strong>Location:</strong> {pincodeData.district}, Kerala
            </span>
          </p>
          {pincodeData.postOffices && pincodeData.postOffices.length > 0 && (
            <p className="post-office-info">
              <strong>Post Office:</strong> {pincodeData.postOffices[0].name}
            </p>
          )}
        </div>
      )}

      {/* Delivery Information */}
      {deliveryInfo && validationStatus === "valid" && (
        <div className="delivery-info">
          <div className="delivery-item">
            <Truck size={14} />
            <span>Delivery: {deliveryInfo.estimatedDays} days</span>
          </div>
          <div className="delivery-item">
            <span>
              Charge:{" "}
              {deliveryInfo.deliveryCharge === 0
                ? "Free"
                : `₹${deliveryInfo.deliveryCharge}`}
            </span>
          </div>
        </div>
      )}

      {/* Kerala Service Info */}
      {!value && (
        <p className="service-info">
          <MapPin size={12} />
          <span>We deliver within Kerala only</span>
        </p>
      )}
    </div>
  );
};

export default PincodeInput;
