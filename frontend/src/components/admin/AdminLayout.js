// src/pages/admin/AdminLayout.js

import React, { useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Tag,
  Mail,
  MessageSquare,
  PackageX,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if user is admin
  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: "/admin", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { path: "/admin/users", icon: <Users size={20} />, label: "Users" },
    { path: "/admin/products", icon: <Package size={20} />, label: "Products" },
    {
      path: "/admin/orders",
      icon: <ShoppingCart size={20} />,
      label: "Orders",
    },
    {
      path: "/admin/returns",
      icon: <PackageX size={20} />,
      label: "Returns",
    }, // ✅ NEW: Returns menu item
    {
      path: "/admin/promo-codes",
      icon: <Tag size={20} />,
      label: "Promo Codes",
    },
    {
      path: "/admin/newsletter",
      icon: <Mail size={20} />,
      label: "Newsletter",
    },
    {
      path: "/admin/chat",
      icon: <MessageSquare size={20} />,
      label: "Chat",
    }, // ✅ NEW: Chat menu item
    { path: "/admin/reports", icon: <BarChart3 size={20} />, label: "Reports" },
    {
      path: "/admin/settings",
      icon: <Settings size={20} />,
      label: "Settings",
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2 className="mobile-logo">LILYTH Admin</h2>
      </div>

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}
      >
        <div className="admin-logo">
          <h2>LILYTH Admin</h2>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
              onClick={closeMobileMenu}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-user">
          <div className="user-info">
            <h4>
              {user?.firstName} {user?.lastName}
            </h4>
            <p>Administrator</p>
          </div>
          <button onClick={logout} className="logout-btn">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu} />
      )}

      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
