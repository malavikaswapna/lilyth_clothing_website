// src/pages/admin/PromoCodeForm.js
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Tag,
  Calendar,
  Percent,
  DollarSign,
} from "lucide-react";
import { promoCodeAPI, productsAPI, categoriesAPI } from "../../services/api";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import toast from "react-hot-toast";
import "./PromoCodeForm.css";

const PromoCodeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    maxUsageCount: "",
    maxUsagePerUser: "1",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    startDate: "",
    endDate: "",
    isActive: true,
    isApplicableToAll: true,
    applicableProducts: [],
    applicableCategories: [],
    firstOrderOnly: false,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    if (isEditMode) {
      fetchPromoCode();
    }
  }, [id]);

  const fetchPromoCode = async () => {
    try {
      setLoading(true);
      const response = await promoCodeAPI.getPromoCode(id);

      if (response.data.success) {
        const promo = response.data.promoCode;

        // FIX: Format dates correctly for input fields
        const formatDateForInput = (dateString) => {
          if (!dateString) return "";
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        setFormData({
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          maxUsageCount: promo.maxUsageCount || "",
          maxUsagePerUser: promo.maxUsagePerUser,
          minOrderAmount: promo.minOrderAmount,
          maxDiscountAmount: promo.maxDiscountAmount || "",
          startDate: promo.startDate.split("T")[0],
          endDate: promo.endDate.split("T")[0],
          isActive: promo.isActive,
          isApplicableToAll: promo.isApplicableToAll,
          applicableProducts: promo.applicableProducts.map((p) => p._id),
          applicableCategories: promo.applicableCategories.map((c) => c._id),
          firstOrderOnly: promo.firstOrderOnly,
        });
      }
    } catch (error) {
      console.error("Failed to fetch promo code:", error);
      toast.error("Failed to load promo code");
      navigate("/admin/promo-codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getProducts({ limit: 1000 });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.code.trim()) {
      toast.error("Promo code is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!formData.discountValue || formData.discountValue <= 0) {
      toast.error("Valid discount value is required");
      return;
    }

    if (
      formData.discountType === "percentage" &&
      formData.discountValue > 100
    ) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error("Start and end dates are required");
      return;
    }

    //FIX: Better date validation
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    // Set time to start/end of day for fair comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (endDate <= startDate) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        code: formData.code.toUpperCase(),
        maxUsageCount: formData.maxUsageCount
          ? parseInt(formData.maxUsageCount)
          : null,
        maxUsagePerUser: parseInt(formData.maxUsagePerUser),
        minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : null,
        discountValue: parseFloat(formData.discountValue),
        startDate: formData.startDate,
        endDate: formData.endDate,
      };

      console.log("📤 Submitting promo code data:", submitData);
      console.log("  Start date:", submitData.startDate);
      console.log("  End date:", submitData.endDate);

      let response;
      if (isEditMode) {
        console.log("  Mode: UPDATE");
        console.log("  ID:", id);
        response = await promoCodeAPI.updatePromoCode(id, submitData);
      } else {
        console.log("  Mode: CREATE");
        response = await promoCodeAPI.createPromoCode(submitData);
      }

      if (response.data.success) {
        toast.success(
          `Promo code ${isEditMode ? "updated" : "created"} successfully!`
        );
        navigate("/admin/promo-codes");
      }
    } catch (error) {
      console.error("❌ Failed to save promo code:", error);
      console.error("❌ Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to save promo code");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading size="lg" text="Loading..." fullScreen />;
  }

  return (
    <div className="promo-code-form-page">
      <div className="form-header">
        <button
          onClick={() => navigate("/admin/promo-codes")}
          className="back-btn"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>{isEditMode ? "Edit Promo Code" : "Create Promo Code"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="promo-form">
        {/* Basic Information */}
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-row">
            <div className="form-group">
              <label>
                Promo Code *
                <Tag size={16} />
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., WELCOME50"
                maxLength="20"
                required
                disabled={isEditMode && formData.currentUsageCount > 0}
                style={{ textTransform: "uppercase" }}
              />
              <small>3-20 characters, letters and numbers only</small>
            </div>

            <div className="form-group">
              <label>Status</label>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <label htmlFor="isActive">Active</label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Welcome discount for new customers"
              rows="3"
              maxLength="200"
              required
            />
            <small>{formData.description.length}/200 characters</small>
          </div>
        </div>

        {/* Discount Details */}
        <div className="form-section">
          <h2>Discount Details</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Discount Type *</label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                required
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Discount Value *
                {formData.discountType === "percentage" ? (
                  <Percent size={16} />
                ) : (
                  <DollarSign size={16} />
                )}
              </label>
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                placeholder={
                  formData.discountType === "percentage"
                    ? "e.g., 10"
                    : "e.g., 500"
                }
                min="0"
                max={formData.discountType === "percentage" ? "100" : undefined}
                step={formData.discountType === "percentage" ? "1" : "0.01"}
                required
              />
              <small>
                {formData.discountType === "percentage"
                  ? "0-100% discount"
                  : "Fixed amount in rupees"}
              </small>
            </div>
          </div>

          {formData.discountType === "percentage" && (
            <div className="form-group">
              <label>Maximum Discount Amount (₹)</label>
              <input
                type="number"
                name="maxDiscountAmount"
                value={formData.maxDiscountAmount}
                onChange={handleChange}
                placeholder="e.g., 1000 (optional)"
                min="0"
                step="0.01"
              />
              <small>
                Cap the maximum discount amount (leave empty for no cap)
              </small>
            </div>
          )}

          <div className="form-group">
            <label>Minimum Order Amount (₹)</label>
            <input
              type="number"
              name="minOrderAmount"
              value={formData.minOrderAmount}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
            />
            <small>Minimum order value required to use this code</small>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="form-section">
          <h2>Usage Limits</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Maximum Total Usage</label>
              <input
                type="number"
                name="maxUsageCount"
                value={formData.maxUsageCount}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
              />
              <small>
                Total times this code can be used (leave empty for unlimited)
              </small>
            </div>

            <div className="form-group">
              <label>Maximum Usage Per User *</label>
              <input
                type="number"
                name="maxUsagePerUser"
                value={formData.maxUsagePerUser}
                onChange={handleChange}
                placeholder="1"
                min="1"
                required
              />
              <small>How many times each user can use this code</small>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                name="firstOrderOnly"
                id="firstOrderOnly"
                checked={formData.firstOrderOnly}
                onChange={handleChange}
              />
              <label htmlFor="firstOrderOnly">
                First Order Only
                <small>This promo code can only be used on first orders</small>
              </label>
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="form-section">
          <h2>
            Validity Period
            <Calendar size={20} />
          </h2>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={
                  formData.startDate || new Date().toISOString().split("T")[0]
                }
                required
              />
            </div>
          </div>
        </div>

        {/* Applicability */}
        <div className="form-section">
          <h2>Applicability</h2>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                name="isApplicableToAll"
                id="isApplicableToAll"
                checked={formData.isApplicableToAll}
                onChange={handleChange}
              />
              <label htmlFor="isApplicableToAll">Apply to All Products</label>
            </div>
          </div>

          {!formData.isApplicableToAll && (
            <>
              <div className="form-group">
                <label>Specific Products</label>
                <select
                  multiple
                  name="applicableProducts"
                  value={formData.applicableProducts}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    setFormData((prev) => ({
                      ...prev,
                      applicableProducts: selected,
                    }));
                  }}
                  size="5"
                >
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple products</small>
              </div>

              <div className="form-group">
                <label>Specific Categories</label>
                <select
                  multiple
                  name="applicableCategories"
                  value={formData.applicableCategories}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    setFormData((prev) => ({
                      ...prev,
                      applicableCategories: selected,
                    }));
                  }}
                  size="5"
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple categories</small>
              </div>
            </>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/promo-codes")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            <Save size={18} />
            {saving
              ? "Saving..."
              : isEditMode
              ? "Update Promo Code"
              : "Create Promo Code"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PromoCodeForm;
