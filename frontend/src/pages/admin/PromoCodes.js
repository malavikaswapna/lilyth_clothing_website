// src/pages/admin/PromoCodes.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Power,
  Search,
  Filter,
  Tag,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  Eye,
} from "lucide-react";
import { promoCodeAPI } from "../../services/api";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import toast from "react-hot-toast";
import "./PromoCodes.css";

const PromoCodes = () => {
  const navigate = useNavigate();
  const [promoCodes, setPromoCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterValidity, setFilterValidity] = useState("all");
  const [selectedPromos, setSelectedPromos] = useState([]);

  useEffect(() => {
    fetchPromoCodes();
    fetchStats();
  }, [filterStatus, filterValidity, searchTerm]);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const params = {};

      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterValidity !== "all") params.validity = filterValidity;

      const response = await promoCodeAPI.getAllPromoCodes(params);

      if (response.data.success) {
        setPromoCodes(response.data.promoCodes);
      }
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await promoCodeAPI.getPromoCodeStats();
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const response = await promoCodeAPI.togglePromoCodeStatus(id);

      if (response.data.success) {
        toast.success(response.data.message);
        fetchPromoCodes();
        fetchStats();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id, code) => {
    if (
      !window.confirm(`Are you sure you want to delete promo code "${code}"?`)
    ) {
      return;
    }

    try {
      const response = await promoCodeAPI.deletePromoCode(id);

      if (response.data.success) {
        toast.success("Promo code deleted successfully");
        fetchPromoCodes();
        fetchStats();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete promo code"
      );
    }
  };

  const getStatusBadge = (promoCode) => {
    const now = new Date();
    const startDate = new Date(promoCode.startDate);
    const endDate = new Date(promoCode.endDate);

    if (!promoCode.isActive) {
      return <span className="status-badge inactive">Inactive</span>;
    }

    if (now < startDate) {
      return <span className="status-badge scheduled">Scheduled</span>;
    }

    if (now > endDate) {
      return <span className="status-badge expired">Expired</span>;
    }

    if (
      promoCode.maxUsageCount &&
      promoCode.currentUsageCount >= promoCode.maxUsageCount
    ) {
      return <span className="status-badge used-up">Used Up</span>;
    }

    return <span className="status-badge active">Active</span>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDiscount = (promoCode) => {
    if (promoCode.discountType === "percentage") {
      return `${promoCode.discountValue}% OFF`;
    }
    return `₹${promoCode.discountValue} OFF`;
  };

  if (loading && !stats) {
    return <Loading size="lg" text="Loading promo codes..." fullScreen />;
  }

  return (
    <div className="promo-codes-page">
      <div className="page-header">
        <div>
          <h1>Promo Codes</h1>
          <p>Create and manage promotional discount codes</p>
        </div>
        <Button
          onClick={() => navigate("/admin/promo-codes/create")}
          className="create-btn"
        >
          <Plus size={20} />
          Create Promo Code
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Tag size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Codes</p>
              <p className="stat-value">{stats.totalCodes}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <Power size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Active Codes</p>
              <p className="stat-value">{stats.activeCodes}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon usage">
              <Users size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Usage</p>
              <p className="stat-value">{stats.totalUsage}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon discount">
              <TrendingUp size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Discount Given</p>
              <p className="stat-value">
                ₹{stats.totalDiscountGiven?.toFixed(2) || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search promo codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filterValidity}
            onChange={(e) => setFilterValidity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Validity</option>
            <option value="valid">Valid</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Promo Codes Table */}
      {loading ? (
        <Loading size="md" text="Loading..." />
      ) : promoCodes.length === 0 ? (
        <div className="no-data">
          <Tag size={64} />
          <h3>No Promo Codes Found</h3>
          <p>Create your first promo code to get started</p>
          <Button onClick={() => navigate("/admin/promo-codes/create")}>
            <Plus size={18} />
            Create Promo Code
          </Button>
        </div>
      ) : (
        <div className="promo-table-container">
          <table className="promo-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Discount</th>
                <th>Usage</th>
                <th>Valid Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((promo) => (
                <tr key={promo._id}>
                  <td>
                    <div className="code-cell">
                      <Tag size={16} className="code-icon" />
                      <span className="code-text">{promo.code}</span>
                    </div>
                  </td>
                  <td>
                    <div className="description-cell">
                      {promo.description}
                      {promo.minOrderAmount > 0 && (
                        <small className="min-order">
                          Min order: ₹{promo.minOrderAmount}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="discount-badge">
                      {formatDiscount(promo)}
                    </span>
                    {promo.maxDiscountAmount && (
                      <small className="max-discount">
                        Max: ₹{promo.maxDiscountAmount}
                      </small>
                    )}
                  </td>
                  <td>
                    <div className="usage-cell">
                      <span className="usage-count">
                        {promo.currentUsageCount}
                        {promo.maxUsageCount
                          ? ` / ${promo.maxUsageCount}`
                          : " / ∞"}
                      </span>
                      {promo.maxUsageCount && (
                        <div className="usage-bar">
                          <div
                            className="usage-fill"
                            style={{
                              width: `${
                                (promo.currentUsageCount /
                                  promo.maxUsageCount) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="date-cell">
                      <small>{formatDate(promo.startDate)}</small>
                      <span className="date-separator">→</span>
                      <small>{formatDate(promo.endDate)}</small>
                    </div>
                  </td>
                  <td>{getStatusBadge(promo)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view"
                        onClick={() =>
                          navigate(`/admin/promo-codes/${promo._id}`)
                        }
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() =>
                          navigate(`/admin/promo-codes/edit/${promo._id}`)
                        }
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={`action-btn toggle ${
                          promo.isActive ? "active" : "inactive"
                        }`}
                        onClick={() =>
                          handleToggleStatus(promo._id, promo.isActive)
                        }
                        title={promo.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(promo._id, promo.code)}
                        title="Delete"
                        disabled={promo.currentUsageCount > 0}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Performing Codes */}
      {stats?.topPerformingCodes && stats.topPerformingCodes.length > 0 && (
        <div className="top-codes-section">
          <h2>Top Performing Codes</h2>
          <div className="top-codes-grid">
            {stats.topPerformingCodes.map((code, index) => (
              <div key={code._id} className="top-code-card">
                <div className="rank">#{index + 1}</div>
                <div className="top-code-info">
                  <h3>{code.code}</h3>
                  <p>{code.description}</p>
                  <span className="usage-badge">
                    Used {code.currentUsageCount} times
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodes;
