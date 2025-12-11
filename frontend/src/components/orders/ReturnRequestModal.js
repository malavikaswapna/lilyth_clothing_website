// src/components/orders/ReturnRequestModal.js
import React, { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, PackageX } from "lucide-react";
import { ordersAPI } from "../../services/api";
import toast from "react-hot-toast";
import "./ReturnRequestModal.css";
import { createPortal } from "react-dom";

const ReturnRequestModal = ({ order, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: "",
    comments: "",
  });

  const [refundMethod, setRefundMethod] = useState("bank_transfer");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const returnReasons = [
    "Defective or damaged product",
    "Wrong item received",
    "Size/fit issues",
    "Quality not as expected",
    "Changed mind",
    "Found better price elsewhere",
    "Item arrived too late",
    "Other",
  ];

  const isCOD = order.paymentMethod === "cod";

  const deliveryDate = order.tracking?.deliveredAt || order.updatedAt;
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = 7 - daysSinceDelivery;

  useEffect(() => {
    // Lock scrolling ONLY on the orders container
    const container = document.querySelector(".account-main");
    if (container) container.style.overflow = "hidden";

    return () => {
      if (container) container.style.overflow = "auto";
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target;
    setBankDetails((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateRefundDetails = () => {
    const newErrors = {};

    if (isCOD) {
      if (refundMethod === "bank_transfer") {
        if (!bankDetails.accountHolderName.trim()) {
          newErrors.accountHolderName = "Account holder name is required";
        }
        if (!bankDetails.accountNumber.trim()) {
          newErrors.accountNumber = "Account number is required";
        } else if (!/^\d{9,18}$/.test(bankDetails.accountNumber)) {
          newErrors.accountNumber = "Invalid account number (9-18 digits)";
        }
        if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
          newErrors.confirmAccountNumber = "Account numbers do not match";
        }
        if (!bankDetails.ifscCode.trim()) {
          newErrors.ifscCode = "IFSC code is required";
        } else if (
          !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.toUpperCase())
        ) {
          newErrors.ifscCode = "Invalid IFSC code format (e.g., SBIN0001234)";
        }
        if (!bankDetails.bankName.trim()) {
          newErrors.bankName = "Bank name is required";
        }
      } else if (refundMethod === "upi") {
        if (!bankDetails.upiId.trim()) {
          newErrors.upiId = "UPI ID is required";
        } else if (!/^[\w.-]+@[\w.-]+$/.test(bankDetails.upiId)) {
          newErrors.upiId = "Invalid UPI ID format (e.g., user@bank)";
        }
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.reason) {
      newErrors.reason = "Please select a reason for return";
    }

    const refundErrors = validateRefundDetails();
    Object.assign(newErrors, refundErrors);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        reason: formData.reason,
        comments: formData.comments,
      };

      if (isCOD) {
        requestData.bankDetails = {
          method: refundMethod,
          ...(refundMethod === "bank_transfer" && {
            accountHolderName: bankDetails.accountHolderName.trim(),
            accountNumber: bankDetails.accountNumber.trim(),
            ifscCode: bankDetails.ifscCode.trim().toUpperCase(),
            bankName: bankDetails.bankName.trim(),
          }),
          ...(refundMethod === "upi" && {
            upiId: bankDetails.upiId.trim().toLowerCase(),
          }),
        };
      }

      await ordersAPI.requestReturn(order._id, requestData);

      toast.success("Return request submitted successfully!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Return request error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to submit return request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="return-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <PackageX size={24} />
            Request Return
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* ---------------- Order Info ---------------- */}
          <div className="order-info-section">
            <h3>Order Details</h3>
            <div className="order-info-grid">
              <div>
                <span className="label">Order Number:</span>
                <span className="value">#{order.orderNumber}</span>
              </div>
              <div>
                <span className="label">Order Total:</span>
                <span className="value">₹{order.total.toFixed(2)}</span>
              </div>
              <div>
                <span className="label">Payment Method:</span>
                <span className="value">
                  {isCOD ? "Cash on Delivery" : "Online Payment"}
                </span>
              </div>
              <div>
                <span className="label">Items:</span>
                <span className="value">{order.items.length}</span>
              </div>
            </div>
          </div>

          {/* ---------------- Alert ---------------- */}
          <div
            className={`alert ${
              daysRemaining <= 2 ? "alert-warning" : "alert-info"
            }`}
          >
            <AlertCircle size={20} />
            <div>
              <strong>Return Window:</strong> {daysRemaining} day(s) remaining
              <p className="small-text">
                Returns are accepted within 7 days of delivery
              </p>
            </div>
          </div>

          {/* ---------------- Form ---------------- */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reason">
                Reason for Return <span className="required">*</span>
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className={errors.reason ? "error" : ""}
              >
                <option value="">Select a reason</option>
                {returnReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {errors.reason && (
                <span className="error-text">{errors.reason}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="comments">Additional Comments (Optional)</label>
              <textarea
                id="comments"
                name="comments"
                rows="3"
                value={formData.comments}
                onChange={handleChange}
                placeholder="Please provide any additional details about the return..."
              />
            </div>

            {/* ---------------- Refund Details (COD only) ---------------- */}
            {isCOD && (
              <>
                <div className="refund-section">
                  <h3>Refund Information</h3>
                  <p className="info-text">
                    Since this was a Cash on Delivery order, please provide your
                    bank details to receive your refund.
                  </p>

                  <div className="refund-method-tabs">
                    <button
                      type="button"
                      className={`tab ${
                        refundMethod === "bank_transfer" ? "active" : ""
                      }`}
                      onClick={() => setRefundMethod("bank_transfer")}
                    >
                      Bank Transfer
                    </button>
                    <button
                      type="button"
                      className={`tab ${
                        refundMethod === "upi" ? "active" : ""
                      }`}
                      onClick={() => setRefundMethod("upi")}
                    >
                      UPI
                    </button>
                  </div>

                  {refundMethod === "bank_transfer" && (
                    <div className="bank-details-form">
                      {/* account holder */}
                      <div className="form-group">
                        <label>
                          Account Holder Name{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="accountHolderName"
                          value={bankDetails.accountHolderName}
                          onChange={handleBankDetailsChange}
                          className={errors.accountHolderName ? "error" : ""}
                        />
                        {errors.accountHolderName && (
                          <span className="error-text">
                            {errors.accountHolderName}
                          </span>
                        )}
                      </div>

                      {/* account number */}
                      <div className="form-group">
                        <label>
                          Account Number <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="accountNumber"
                          value={bankDetails.accountNumber}
                          onChange={handleBankDetailsChange}
                          className={errors.accountNumber ? "error" : ""}
                        />
                        {errors.accountNumber && (
                          <span className="error-text">
                            {errors.accountNumber}
                          </span>
                        )}
                      </div>

                      {/* confirm number */}
                      <div className="form-group">
                        <label>
                          Confirm Account Number{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="confirmAccountNumber"
                          value={bankDetails.confirmAccountNumber}
                          onChange={handleBankDetailsChange}
                          className={errors.confirmAccountNumber ? "error" : ""}
                        />
                        {errors.confirmAccountNumber && (
                          <span className="error-text">
                            {errors.confirmAccountNumber}
                          </span>
                        )}
                      </div>

                      {/* ifsc */}
                      <div className="form-group">
                        <label>
                          IFSC Code <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="ifscCode"
                          value={bankDetails.ifscCode}
                          onChange={handleBankDetailsChange}
                          maxLength="11"
                          className={errors.ifscCode ? "error" : ""}
                        />
                        {errors.ifscCode && (
                          <span className="error-text">{errors.ifscCode}</span>
                        )}
                      </div>

                      {/* bank name */}
                      <div className="form-group">
                        <label>
                          Bank Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="bankName"
                          value={bankDetails.bankName}
                          onChange={handleBankDetailsChange}
                          className={errors.bankName ? "error" : ""}
                        />
                        {errors.bankName && (
                          <span className="error-text">{errors.bankName}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {refundMethod === "upi" && (
                    <div className="upi-form">
                      <div className="form-group">
                        <label>
                          UPI ID <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="upiId"
                          value={bankDetails.upiId}
                          onChange={handleBankDetailsChange}
                          className={errors.upiId ? "error" : ""}
                        />
                        {errors.upiId && (
                          <span className="error-text">{errors.upiId}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="alert alert-info">
                    <CheckCircle size={18} />
                    <div className="small-text">
                      {refundMethod === "bank_transfer"
                        ? "Your refund will be processed via NEFT/IMPS within 2-3 business days after we receive and inspect the returned item."
                        : "Your refund will be instantly transferred to your UPI ID within 2-3 business days after we receive and inspect the returned item."}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ---------------- Policy Reminder ---------------- */}
            <div className="policy-reminder">
              <h4>Return Policy</h4>
              <ul>
                <li>Item must be unused and in original condition</li>
                <li>Original tags and packaging must be intact</li>
                <li>Return shipping costs may apply</li>
                <li>
                  {isCOD
                    ? "Refund will be processed within 2-3 business days"
                    : "Refund will be processed within 5-7 business days"}
                </li>
              </ul>
            </div>

            {/* ---------------- Footer Buttons ---------------- */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Return Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root")
  );
};

export default ReturnRequestModal;
