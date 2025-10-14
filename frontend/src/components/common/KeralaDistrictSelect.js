// src/components/common/KeralaDistrictSelect.js
import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { pincodeAPI } from "../../services/api";
import "./KeralaDistrictSelect.css";

const KeralaDistrictSelect = ({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}) => {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const response = await pincodeAPI.getAllDistricts();
      if (response.data.success) {
        setDistricts(response.data.districts);
      }
    } catch (error) {
      console.error("Failed to load districts:", error);
      // Fallback to hardcoded districts
      setDistricts([
        "Alappuzha",
        "Ernakulam",
        "Idukki",
        "Kannur",
        "Kasaragod",
        "Kollam",
        "Kottayam",
        "Kozhikode",
        "Malappuram",
        "Palakkad",
        "Pathanamthitta",
        "Thiruvananthapuram",
        "Thrissur",
        "Wayanad",
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kerala-district-select">
      <div className="district-input-container">
        <MapPin size={16} className="district-icon" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          required={required}
          className={`district-select ${error ? "error" : ""}`}
        >
          <option value="">Select District</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="district-error">{error}</span>}
    </div>
  );
};

export default KeralaDistrictSelect;
