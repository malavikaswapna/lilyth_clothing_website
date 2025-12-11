import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Download,
  Package,
  User,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Edit,
  MoreVertical,
} from "lucide-react";
import { adminAPI } from "../../services/api";
import Loading from "../../components/common/Loading";
import Button from "../../components/common/Button";
import toast from "react-hot-toast";
import "./Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Enhanced filters
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateRange: { start: "", end: "" },
    minAmount: "",
    maxAmount: "",
    paymentMethod: "all",
    returnStatus: "all",
    page: 1,
    limit: 20,
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadOrders();
    loadOrderStats();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const queryParams = {};
      if (filters.search) queryParams.search = filters.search;
      if (filters.status) queryParams.status = filters.status;
      if (filters.dateRange.start)
        queryParams.startDate = filters.dateRange.start;
      if (filters.dateRange.end) queryParams.endDate = filters.dateRange.end;
      if (filters.minAmount) queryParams.minAmount = filters.minAmount;
      if (filters.maxAmount) queryParams.maxAmount = filters.maxAmount;
      if (filters.paymentMethod && filters.paymentMethod !== "all")
        queryParams.paymentMethod = filters.paymentMethod;

      if (filters.returnStatus && filters.returnStatus !== "all")
        queryParams.returnStatus = filters.returnStatus;
      queryParams.page = filters.page;
      queryParams.limit = filters.limit;

      const response = await adminAPI.getAllOrders(queryParams);
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStats = async () => {
    try {
      const response = await adminAPI.getOrderStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error("Failed to load order stats:", error);
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      // Optimistically update UI immediately
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );

      await adminAPI.updateOrderStatus(orderId, { status: newStatus });
      toast.success("Order status updated successfully");

      // Then refresh actual data
      loadOrders();
      loadOrderStats();
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await adminAPI.getOrderDetails(orderId);
      setSelectedOrder(response.data.order);
      setShowOrderModal(true);
    } catch (error) {
      toast.error("Failed to load order details");
    }
  };

  const exportOrders = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.exportOrders(filters);

      // Create and download CSV file
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `orders-export-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Orders exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={16} />;
      case "confirmed":
        return <CheckCircle size={16} />;
      case "shipped":
        return <Truck size={16} />;
      case "delivered":
        return <Package size={16} />;
      case "cancelled":
        return <XCircle size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "confirmed":
        return "#3b82f6";
      case "shipped":
        return "#8b5cf6";
      case "delivered":
        return "#10b981";
      case "cancelled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      status: "",
      dateRange: { start: "", end: "" },
      minAmount: "",
      maxAmount: "",
      page: 1,
      limit: 20,
    });
  };

  if (loading && orders.length === 0)
    return <Loading size="lg" text="Loading orders..." />;

  return (
    <div className="admin-orders">
      <div className="orders-header">
        <div className="header-content">
          <h1>Order Management</h1>
          <p>Manage and track customer orders</p>
        </div>
        <div className="header-actions">
          <Button variant="outline" onClick={exportOrders} disabled={loading}>
            <Download size={18} />
            Export Orders
          </Button>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="order-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon confirmed">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.confirmed}</h3>
            <p>Confirmed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon shipped">
            <Truck size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.shipped}</h3>
            <p>Shipped</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon delivered">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.delivered}</h3>
            <p>Delivered</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>₹{stats.totalRevenue?.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="orders-filters">
        <div className="filters-row">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              value={filters.search}
              onChange={handleSearch}
            />
          </div>

          <div className="filter-controls">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              placeholder="Start Date"
              value={filters.dateRange.start}
              onChange={(e) =>
                handleFilterChange("dateRange", {
                  ...filters.dateRange,
                  start: e.target.value,
                })
              }
            />

            <input
              type="date"
              placeholder="End Date"
              value={filters.dateRange.end}
              onChange={(e) =>
                handleFilterChange("dateRange", {
                  ...filters.dateRange,
                  end: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Min Amount"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange("minAmount", e.target.value)}
            />

            <input
              type="number"
              placeholder="Max Amount"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
            />

            <select
              value={filters.paymentMethod}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentMethod: e.target.value,
                }))
              }
            >
              <option value="all">All Payment Methods</option>
              <option value="cod">Cash on Delivery</option>
              <option value="razorpay">Online Payment</option>
            </select>

            <select
              value={filters.returnStatus}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  returnStatus: e.target.value,
                }))
              }
            >
              <option value="all">All Orders</option>
              <option value="requested">Return Requested</option>
              <option value="approved">Return Approved</option>
              <option value="rejected">Return Rejected</option>
              <option value="received">Return Received</option>
              <option value="processed">Return Processed</option>
            </select>

            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange("limit", e.target.value)}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>

            <button className="btn btn-ghost" onClick={clearAllFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>
                  <div className="order-number">
                    <strong>#{order.orderNumber}</strong>
                    <small>{order.paymentMethod}</small>
                  </div>
                </td>
                <td>
                  <div className="customer-info">
                    <div className="customer-details">
                      <h4>
                        {order.user?.firstName} {order.user?.lastName}
                      </h4>
                      <p>{order.user?.email}</p>
                      <small>
                        {order.shippingAddress?.city},{" "}
                        {order.shippingAddress?.state}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="order-date">
                    <span>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <small>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </small>
                  </div>
                </td>
                <td>
                  <div className="order-items">
                    <span className="item-count">
                      {order.items.length} items
                    </span>
                    <div className="item-preview">
                      {order.items.slice(0, 2).map((item, index) => (
                        <img
                          key={index}
                          src={item.productImage}
                          alt={item.productName}
                          className="item-thumbnail"
                        />
                      ))}
                      {order.items.length > 2 && (
                        <span className="more-items">
                          +{order.items.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="order-total">
                    <strong>₹{(order.total || 0).toFixed(2)}</strong>
                    {(order.discount?.amount || 0) > 0 && (
                      <small className="discount">
                        -₹{(order.discount?.amount || 0).toFixed(2)}
                      </small>
                    )}
                  </div>
                </td>
                <td>
                  <div className="status-column">
                    <span
                      className={`status-badge status-${order.status}`}
                      style={{ color: getStatusColor(order.status) }}
                    >
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>

                    <select
                      className="status-select"
                      value={order.status}
                      onChange={(e) =>
                        handleStatusUpdate(order._id, e.target.value)
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button
                      onClick={() => viewOrderDetails(order._id)}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} orders
          </div>
          <div className="pagination">
            <button
              onClick={() => handleFilterChange("page", pagination.page - 1)}
              disabled={pagination.page === 1}
              className="page-btn"
            >
              Previous
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => handleFilterChange("page", page)}
                  className={`page-btn ${
                    pagination.page === page ? "active" : ""
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => handleFilterChange("page", pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowOrderModal(false)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, onStatusUpdate }) => {
  // Safety check for order data
  if (!order) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Error</h2>
            <button onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>Order data is not available.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleStatusChange = (newStatus) => {
    onStatusUpdate(order._id, newStatus);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Order Details - #{order.orderNumber || "N/A"}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="order-details-content">
            <div className="details-grid">
              {/* Customer Information */}
              <div className="detail-section">
                <h3>Customer Information</h3>
                <p>
                  <strong>Name:</strong> {order.user?.firstName || ""}{" "}
                  {order.user?.lastName || ""}
                </p>
                <p>
                  <strong>Email:</strong> {order.user?.email || "Not provided"}
                </p>
                <p>
                  <strong>Phone:</strong> {order.user?.phone || "Not provided"}
                </p>
              </div>

              {/* Order Information */}
              <div className="detail-section">
                <h3>Order Information</h3>
                <p>
                  <strong>Order Date:</strong>{" "}
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <p>
                  <strong>Payment Method:</strong>{" "}
                  {order.payment?.method
                    ? order.payment.method
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())
                    : "Not specified"}
                </p>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  {order.payment?.status
                    ? order.payment.status.charAt(0).toUpperCase() +
                      order.payment.status.slice(1)
                    : "Unknown"}
                </p>
                <p>
                  <strong>Status:</strong>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status
                      ? order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)
                      : "Unknown"}
                  </span>
                </p>
              </div>

              {/* Shipping Address */}
              <div className="detail-section">
                <h3>Shipping Address</h3>
                <p>
                  {order.shippingAddress?.firstName || ""}{" "}
                  {order.shippingAddress?.lastName || ""}
                </p>
                <p>{order.shippingAddress?.addressLine1 || "Not provided"}</p>
                {order.shippingAddress?.addressLine2 && (
                  <p>{order.shippingAddress.addressLine2}</p>
                )}
                <p>
                  {order.shippingAddress?.city || ""},{" "}
                  {order.shippingAddress?.state || ""}{" "}
                  {order.shippingAddress?.postalCode || ""}
                </p>
                <p>{order.shippingAddress?.country || ""}</p>
              </div>

              {/* Billing Address */}
              <div className="detail-section">
                <h3>Billing Address</h3>
                <p>
                  {order.billingAddress?.firstName || ""}{" "}
                  {order.billingAddress?.lastName || ""}
                </p>
                <p>{order.billingAddress?.addressLine1 || "Not provided"}</p>
                {order.billingAddress?.addressLine2 && (
                  <p>{order.billingAddress.addressLine2}</p>
                )}
                <p>
                  {order.billingAddress?.city || ""},{" "}
                  {order.billingAddress?.state || ""}{" "}
                  {order.billingAddress?.postalCode || ""}
                </p>
                <p>{order.billingAddress?.country || ""}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="order-items-section">
              <h3>Order Items</h3>
              <div className="items-list">
                {(order.items || []).map((item, index) => (
                  <div key={index} className="item-detail">
                    <img
                      src={item.productImage || "/default-product.jpg"}
                      alt={item.productName || "Product"}
                      onError={(e) => {
                        e.target.src = "/default-product.jpg";
                      }}
                    />
                    <div className="item-info">
                      <h4>{item.productName || "Unknown Product"}</h4>
                      <p>
                        Size: {item.variant?.size || "N/A"} | Color:{" "}
                        {item.variant?.color?.name || "N/A"}
                      </p>
                      <p>Quantity: {item.quantity || 0}</p>
                    </div>
                    <div className="item-price">
                      <span>₹{(item.price || 0).toFixed(2)} each</span>
                      <strong>
                        ₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>₹{(order.shipping?.cost || 0).toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>₹{(order.tax || 0).toFixed(2)}</span>
              </div>
              {(order.discount?.amount || 0) > 0 && (
                <div className="summary-row">
                  <span>Discount:</span>
                  <span>-₹{(order.discount?.amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total:</span>
                <span>₹{(order.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Status Update */}
            <div className="status-update-section">
              <h3>Update Order Status</h3>
              <div className="status-actions">
                <button
                  className="btn btn-warning"
                  onClick={() => handleStatusChange("pending")}
                  disabled={order.status === "pending"}
                >
                  Mark as Pending
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={order.status === "confirmed"}
                >
                  Confirm Order
                </button>
                <button
                  className="btn btn-info"
                  onClick={() => handleStatusChange("shipped")}
                  disabled={order.status === "shipped"}
                >
                  Mark as Shipped
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleStatusChange("delivered")}
                  disabled={order.status === "delivered"}
                >
                  Mark as Delivered
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={order.status === "cancelled"}
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
