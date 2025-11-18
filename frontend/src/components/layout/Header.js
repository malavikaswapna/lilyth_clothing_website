// Header.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  Heart,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import logo from "../../assets/logo.png";
import { motion } from "framer-motion";
import "./Header.css";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated, user, logout } = useAuth();
  const { getCartItemCount } = useCart();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchOpen(false);
      setIsKebabOpen(false);
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setIsKebabOpen(false);
  };

  const cartItemCount = getCartItemCount();

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          {/* Hamburger Menu */}
          <motion.button
            className="mobile-menu-btn"
            onClick={toggleMenu}
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 5 }}
            aria-label="Toggle Navigation"
          >
            {isMenuOpen ? (
              <X size={24} strokeWidth={2.5} />
            ) : (
              <Menu size={24} strokeWidth={2.5} />
            )}
          </motion.button>

          {/* Logo */}
          <Link to="/" className="logo">
            <img src={logo} alt="Lilyth" className="logo-image" />
          </Link>

          <div className="header-spacer"></div>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Desktop Icons */}
            <div className="desktop-icons">
              {/* Search */}
              <button
                className="action-btn search-btn"
                onClick={toggleSearch}
                aria-label="Search"
              >
                <Search size={22} />
              </button>

              {/* Wishlist */}
              {isAuthenticated && (
                <Link
                  to="/account/wishlist"
                  className="action-btn"
                  aria-label="Wishlist"
                >
                  <Heart size={22} />
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                className="action-btn cart-btn"
                aria-label="Cart"
              >
                <ShoppingBag size={22} />
                {cartItemCount > 0 && (
                  <span className="cart-badge">{cartItemCount}</span>
                )}
              </Link>

              {/* User */}
              {isAuthenticated ? (
                <div className="user-menu">
                  <div className="user-dropdown">
                    <button
                      className="action-btn user-btn user-expandable"
                      aria-label="User Account"
                    >
                      <span className="user-icon">
                        <User size={22} />
                      </span>
                      <span className="user-name-expand">
                        {user?.firstName}
                      </span>
                    </button>
                    <div className="dropdown-menu">
                      <Link to="/account" className="dropdown-item">
                        Account
                      </Link>
                      <Link to="/account/orders" className="dropdown-item">
                        Orders
                      </Link>
                      <Link to="/account/wishlist" className="dropdown-item">
                        Wishlist
                      </Link>
                      {user?.role === "admin" && (
                        <div className="admin-controls">
                          <Link to="/admin" className="dropdown-item">
                            Admin Panel
                          </Link>
                          <Link to="/admin/test-mode" className="dropdown-item">
                            Test as Customer
                          </Link>
                        </div>
                      )}
                      <button
                        onClick={logout}
                        className="dropdown-item logout-btn"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="action-btn" aria-label="Login">
                  <User size={22} />
                </Link>
              )}
            </div>

            {/* Mobile Kebab Menu */}
            <div className="mobile-icons">
              <button
                className="action-btn"
                onClick={() => setIsKebabOpen(!isKebabOpen)}
                aria-label="More Options"
              >
                <MoreVertical size={22} />
              </button>

              {isKebabOpen && (
                <div className="kebab-dropdown">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      toggleSearch();
                      setIsKebabOpen(false);
                    }}
                  >
                    <Search size={20} /> Search
                  </button>

                  {isAuthenticated && (
                    <Link
                      to="/account/wishlist"
                      className="dropdown-item"
                      onClick={() => setIsKebabOpen(false)}
                    >
                      <Heart size={20} /> Wishlist
                    </Link>
                  )}

                  <Link
                    to="/cart"
                    className="dropdown-item"
                    onClick={() => setIsKebabOpen(false)}
                  >
                    <ShoppingBag size={20} /> Cart ({cartItemCount})
                  </Link>

                  {isAuthenticated ? (
                    <Link
                      to="/account"
                      className="dropdown-item"
                      onClick={() => setIsKebabOpen(false)}
                    >
                      <User size={20} /> Account
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="dropdown-item"
                      onClick={() => setIsKebabOpen(false)}
                    >
                      <User size={20} /> Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Overlay */}
        {isSearchOpen && (
          <div className="search-overlay">
            <form onSubmit={handleSearch}>
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={toggleSearch}
                  className="close-search-btn"
                >
                  <X size={24} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className={`mobile-nav ${isMenuOpen ? "open" : ""}`}>
            <div className="mobile-nav-section">
              <h3 className="mobile-nav-title">Shop</h3>
              <Link to="/shop" className="mobile-nav-link" onClick={toggleMenu}>
                All Items
              </Link>
              {/* <Link
                to="/shop?category=dresses"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Dresses
              </Link>
              <Link
                to="/shop?category=activewear"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Activewear
              </Link> */}
              <Link
                to="/shop?category=indo-western"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Indo-Western
              </Link>
              {/* <Link
                to="/shop?category=tops"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Tops
              </Link>
              <Link
                to="/shop?category=bottoms"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Bottoms
              </Link>
              <Link
                to="/shop?category=sleepwear"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Sleepwear
              </Link>
              <Link
                to="/shop?category=cord-sets"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Cord Sets
              </Link> */}
            </div>

            {isAuthenticated ? (
              <div className="mobile-nav-section">
                <h3 className="mobile-nav-title">Account</h3>
                <Link
                  to="/account"
                  className="mobile-nav-link"
                  onClick={toggleMenu}
                >
                  My Account
                </Link>
                <Link
                  to="/account/orders"
                  className="mobile-nav-link"
                  onClick={toggleMenu}
                >
                  My Orders
                </Link>
                <Link
                  to="/account/wishlist"
                  className="mobile-nav-link"
                  onClick={toggleMenu}
                >
                  Wishlist
                </Link>
                <button
                  onClick={() => {
                    logout();
                    toggleMenu();
                  }}
                  className="mobile-nav-link mobile-nav-button"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="mobile-nav-section">
                <h3 className="mobile-nav-title">Account</h3>
                <Link
                  to="/login"
                  className="mobile-nav-link"
                  onClick={toggleMenu}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="mobile-nav-link"
                  onClick={toggleMenu}
                >
                  Create Account
                </Link>
              </div>
            )}

            <div className="mobile-nav-section">
              <h3 className="mobile-nav-title">Customer Care</h3>
              <Link
                to="/contact"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Contact Us
              </Link>
              <Link
                to="/help/shipping"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Shipping & Returns
              </Link>
              <Link
                to="/help/size-guide"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Size Guide
              </Link>
              <Link
                to="/help/faq"
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                FAQ
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
