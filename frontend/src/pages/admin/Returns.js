// src/pages/admin/Returns.js
import React, { useState, useEffect } from "react";
import {
  PackageX,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  Check,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { adminAPI } from "../../services/api";
import Loading from "../../components/common/Loading";
import toast from "react-hot-toast";
import "./Returns.css";

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [statistics, setStatistics] = useState({
    requested: 0,
    approved: 0,
    rejected: 0,
    received: 0,
    processed: 0,
    totalRefundAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [selectedReturn, setSelectedReturn] = useState(null);

  useEffect(() => {
    loadReturns();
  }, [filters]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllReturns(filters);

      // Backend returns: { success, returns, statistics, page, pages, total }
      setReturns(response.data.returns || []);
      setStatistics(
        response.data.statistics || {
          requested: 0,
          approved: 0,
          rejected: 0,
          received: 0,
          processed: 0,
          totalRefundAmount: 0,
        }
      );
      setPagination({
        page: response.data.page || 1,
        pages: response.data.pages || 1,
        total: response.data.total || 0,
      });
    } catch (error) {
      console.error("Failed to load returns:", error);
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    orderId,
    status,
    adminNotes,
    refundAmount
  ) => {
    try {
      const response = await adminAPI.updateReturnStatus(orderId, {
        status,
        adminNotes,
        refundAmount,
      });

      if (response.data.success) {
        toast.success(`Return ${status} successfully`);
        loadReturns();
        setSelectedReturn(null);
      }
    } catch (error) {
      console.error("Failed to update return status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update return status"
      );
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      requested: { className: "status-requested", label: "Requested" },
      approved: { className: "status-approved", label: "Approved" },
      rejected: { className: "status-rejected", label: "Rejected" },
      received: { className: "status-received", label: "Received" },
      processed: { className: "status-processed", label: "Processed" },
    };
    return badges[status] || { className: "", label: status };
  };

  if (loading && returns.length === 0) {
    return <Loading size="lg" text="Loading returns..." />;
  }

  return (
    <div className="admin-returns">
      <div className="returns-header">
        <div className="header-content">
          <h1>Return Management</h1>
          <p>Manage customer return requests and refunds</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="return-stats">
        <div className="stat-card">
          <div className="stat-icon requested">
            <PackageX size={24} />
          </div>
          <div className="stat-content">
            <h3>{statistics.requested || 0}</h3>
            <p>Pending Requests</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon approved">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{statistics.approved || 0}</h3>
            <p>Approved</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon processed">
            <Check size={24} />
          </div>
          <div className="stat-content">
            <h3>{statistics.processed || 0}</h3>
            <p>Processed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon value">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>₹{statistics.totalValue?.toLocaleString() || 0}</h3>
            <p>Total Value</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="returns-filters">
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by order number, customer name..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="requested">Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="received">Received</option>
              <option value="processed">Processed</option>
            </select>

            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              placeholder="Start Date"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="returns-table-container">
        <table className="returns-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Requested Date</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No return requests found
                </td>
              </tr>
            ) : (
              returns.map((order) => {
                const badge = getStatusBadge(order.returnStatus);
                return (
                  <tr key={order._id}>
                    <td>
                      <div className="order-number">
                        <strong>#{order.orderNumber}</strong>
                        <small>{order.items.length} items</small>
                      </div>
                    </td>
                    <td>
                      <div className="customer-info">
                        <h4>
                          {order.user.firstName} {order.user.lastName}
                        </h4>
                        <p>{order.user.email}</p>
                      </div>
                    </td>
                    <td>
                      {new Date(order.returnRequestedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="return-reason">{order.returnReason}</div>
                    </td>
                    <td>
                      <strong>₹{order.total.toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="action-btn view"
                          onClick={() => setSelectedReturn(order)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {(pagination.page - 1) * filters.limit + 1} to{" "}
            {Math.min(pagination.page * filters.limit, pagination.total)} of{" "}
            {pagination.total} returns
          </div>
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i + 1}
                className={`page-btn ${
                  pagination.page === i + 1 ? "active" : ""
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Return Details Modal */}
      {selectedReturn && (
        <ReturnDetailsModal
          returnOrder={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

// Return Details Modal Component
const ReturnDetailsModal = ({ returnOrder, onClose, onStatusUpdate }) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState(returnOrder.total);
  const [processing, setProcessing] = useState(false);

  const handleUpdateStatus = async (status) => {
    if (status === "processed" && !refundAmount) {
      toast.error("Please enter refund amount");
      return;
    }

    if (!adminNotes && status !== "approved") {
      toast.error("Please add admin notes");
      return;
    }

    setProcessing(true);
    try {
      await onStatusUpdate(
        returnOrder._id,
        status,
        adminNotes,
        status === "processed" ? refundAmount : undefined
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Return Request Details</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="return-details-content">
            {/* Order Info */}
            <div className="details-grid">
              <div className="detail-section">
                <h3>Order Information</h3>
                <p>
                  <strong>Order Number:</strong> #{returnOrder.orderNumber}
                </p>
                <p>
                  <strong>Order Date:</strong>{" "}
                  {new Date(returnOrder.createdAt).toLocaleDateString()}
                </p>
                <p>
                  <strong>Delivered:</strong>{" "}
                  {new Date(
                    returnOrder.tracking?.deliveredAt || returnOrder.updatedAt
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Total Amount:</strong> ₹
                  {returnOrder.total.toLocaleString()}
                </p>
              </div>

              <div className="detail-section">
                <h3>Customer Information</h3>
                <p>
                  <strong>Name:</strong> {returnOrder.user.firstName}{" "}
                  {returnOrder.user.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {returnOrder.user.email}
                </p>
                <p>
                  <strong>Phone:</strong> {returnOrder.user.phone || "N/A"}
                </p>
              </div>
            </div>

            {/* Return Information */}
            <div className="detail-section">
              <h3>Return Information</h3>
              <p>
                <strong>Requested Date:</strong>{" "}
                {new Date(returnOrder.returnRequestedAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Reason:</strong> {returnOrder.returnReason}
              </p>
              {returnOrder.returnComments && (
                <p>
                  <strong>Customer Comments:</strong>{" "}
                  {returnOrder.returnComments}
                </p>
              )}
              <p>
                <strong>Current Status:</strong>{" "}
                <span
                  className={`status-badge status-${returnOrder.returnStatus}`}
                >
                  {returnOrder.returnStatus}
                </span>
              </p>
            </div>

            {/* Order Items */}
            <div className="order-items-section">
              <h3>Returned Items</h3>
              <div className="items-list">
                {returnOrder.items.map((item, index) => (
                  <div key={index} className="item-detail">
                    <img
                      src={item.productImage || item.product?.images?.[0]?.url}
                      alt={item.productName}
                    />
                    <div className="item-info">
                      <h4>{item.productName}</h4>
                      <p>
                        Size: {item.variant.size} | Color:{" "}
                        {item.variant.color.name}
                      </p>
                      <p>Quantity: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      <span>₹{item.unitPrice.toLocaleString()} each</span>
                      <strong>₹{item.totalPrice.toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Action Section */}
            {returnOrder.returnStatus !== "processed" &&
              returnOrder.returnStatus !== "rejected" && (
                <div className="admin-action-section">
                  <h3>Admin Actions</h3>

                  <div className="form-group">
                    <label className="form-label">Admin Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this return request..."
                    />
                  </div>

                  {returnOrder.returnStatus === "received" && (
                    <div className="form-group">
                      <label className="form-label">Refund Amount (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={refundAmount}
                        onChange={(e) =>
                          setRefundAmount(parseFloat(e.target.value))
                        }
                        min="0"
                        max={returnOrder.total}
                      />
                      <small>
                        Maximum: ₹{returnOrder.total.toLocaleString()}
                      </small>
                    </div>
                  )}

                  <div className="status-actions">
                    {returnOrder.returnStatus === "requested" && (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={() => handleUpdateStatus("approved")}
                          disabled={processing}
                        >
                          <CheckCircle size={18} />
                          Approve Return
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleUpdateStatus("rejected")}
                          disabled={processing}
                        >
                          <XCircle size={18} />
                          Reject Return
                        </button>
                      </>
                    )}

                    {returnOrder.returnStatus === "approved" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpdateStatus("received")}
                        disabled={processing}
                      >
                        <Package size={18} />
                        Mark as Received
                      </button>
                    )}

                    {returnOrder.returnStatus === "received" && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleUpdateStatus("processed")}
                        disabled={processing}
                      >
                        <Check size={18} />
                        Process Refund
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
