// src/pages/admin/Dashboard.js
import React, { useState, useEffect } from "react";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Eye,
  Tag,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import Loading from "../../components/common/Loading";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getDashboard();
      setDashboard(response.data.dashboard);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return <Loading size="lg" text="Loading dashboard..." />;
  }

  // Show error state
  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-error">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={loadDashboard} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no dashboard data
  if (!dashboard) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-empty">
          <h2>No Dashboard Data</h2>
          <p>Unable to load dashboard information.</p>
          <button onClick={loadDashboard} className="retry-btn">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Safely destructure with fallback values
  const {
    totals = {},
    recent = {},
    topProducts = [],
    lowStockProducts = [],
    orderStatusBreakdown = {},
    recentOrders = [],
  } = dashboard;

  // Provide default values for totals
  const { users = 0, products = 0, orders = 0, revenue = 0 } = totals;

  // Provide default values for recent
  const { newUsers = 0, weeklyOrders = 0, monthlyRevenue = 0 } = recent;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening with your store.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>{users.toLocaleString()}</h3>
            <p>Total Users</p>
            <span className="stat-change">+{newUsers} this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>{products.toLocaleString()}</h3>
            <p>Total Products</p>
            <span className="stat-change">
              {lowStockProducts.length} low stock
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders">
            <ShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <h3>{orders.toLocaleString()}</h3>
            <p>Total Orders</p>
            <span className="stat-change">+{weeklyOrders} this week</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>₹{revenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
            <span className="stat-change">
              ₹{monthlyRevenue.toLocaleString()} this month
            </span>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Quick Actions */}
      <div className="quick-actions">
        <div
          className="quick-action-card"
          onClick={() => navigate("/admin/chat")}
        >
          <div className="quick-action-icon chat">
            <MessageSquare size={24} />
          </div>
          <div className="quick-action-content">
            <h3>Customer Chat</h3>
            <p>View and respond to customer messages</p>
          </div>
        </div>

        <div
          className="quick-action-card"
          onClick={() => navigate("/admin/promo-codes")}
        >
          <div className="quick-action-icon promo">
            <Tag size={24} />
          </div>
          <div className="quick-action-content">
            <h3>Promo Codes</h3>
            <p>Manage discount codes and promotions</p>
          </div>
        </div>

        <div
          className="quick-action-card"
          onClick={() => navigate("/admin/products")}
        >
          <div className="quick-action-icon products-action">
            <Package size={24} />
          </div>
          <div className="quick-action-content">
            <h3>Add Product</h3>
            <p>Create new product listings</p>
          </div>
        </div>

        <div
          className="quick-action-card"
          onClick={() => navigate("/admin/orders")}
        >
          <div className="quick-action-icon orders-action">
            <ShoppingCart size={24} />
          </div>
          <div className="quick-action-content">
            <h3>View Orders</h3>
            <p>Manage customer orders</p>
          </div>
        </div>

        <div
          className="quick-action-card"
          onClick={() => navigate("/admin/users")}
        >
          <div className="quick-action-icon users-action">
            <Users size={24} />
          </div>
          <div className="quick-action-content">
            <h3>User Management</h3>
            <p>View and manage users</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Top Products */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Top Selling Products</h2>
            <TrendingUp size={20} />
          </div>
          <div className="products-list">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={product._id} className="product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <img src={product.images?.[0]?.url} alt={product.name} />
                  <div className="product-details">
                    <h4>{product.name}</h4>
                    <p>
                      {product.purchases} sold • ₹{product.revenue}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No top products data available</p>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Low Stock Alert</h2>
            <AlertTriangle size={20} />
          </div>
          <div className="stock-list">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 5).map((product) => (
                <div key={product._id} className="stock-item">
                  <h4>{product.name}</h4>
                  <div className="stock-info">
                    <span className="stock-count">
                      {product.totalStock} left
                    </span>
                    <div className="stock-bar">
                      <div
                        className="stock-fill"
                        style={{
                          width: `${Math.min(product.totalStock * 10, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">All products are well stocked</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>Recent Orders</h2>
            <Eye size={20} />
          </div>
          <div className="orders-table">
            {recentOrders.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td>#{order.orderNumber}</td>
                      <td>
                        {order.user
                          ? `${order.user.firstName || ""} ${
                              order.user.lastName || ""
                            }`.trim() || "Unknown User"
                          : "Unknown User"}
                      </td>
                      <td>₹{order.total}</td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No recent orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
