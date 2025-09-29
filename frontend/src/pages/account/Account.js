import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { User, Package, Heart, MapPin, Settings as SettingsIcon, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, ordersAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import BackgroundWrapper from '../../components/common/BackgroundWrapper';
import Addresses from './Addresses';
import './Account.css';
import Settings from './Settings';
import UserReviews from './UserReviews';


const AccountDashboard = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  const loadDashboardData = async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        userAPI.getUserAnalytics(),
        ordersAPI.getMyOrders({ limit: 3 })
      ]);
      
      setStats(analyticsRes.data.analytics);
      setRecentOrders(ordersRes.data.orders);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <Loading size="lg" fullScreen />;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) return <Loading size="lg" text="Loading your account..." />;

  return (
    <div className="account-dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p>Manage your account, orders, and preferences</p>
      </div>

      <div className="dashboard-grid">
        {/* Quick Stats */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">
              <Package size={24} />
            </div>
            <div className="stat-details">
              <h3>{stats?.totalOrders || 0}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Heart size={24} />
            </div>
            <div className="stat-details">
              <h3>{stats?.wishlistCount || 0}</h3>
              <p>Wishlist Items</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <User size={24} />
            </div>
            <div className="stat-details">
              <h3>₹{stats?.totalSpent?.toFixed(2) || '0.00'}</h3>
              <p>Total Spent</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-links">
            <Link to="/account/orders" className="action-link">
              <Package size={20} />
              <span>View Orders</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/account/wishlist" className="action-link">
              <Heart size={20} />
              <span>My Wishlist</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/account/addresses" className="action-link">
              <MapPin size={20} />
              <span>Manage Addresses</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/account/reviews" className="action-link">
              <Star size={20} />
              <span>My Reviews</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/account/profile" className="action-link">
              <SettingsIcon size={20} />
              <span>Account Settings</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/account/orders" className="view-all-link">View All</Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="orders-list">
              {recentOrders.map(order => (
                <div key={order._id} className="order-item">
                  <div className="order-info">
                    <h4>Order #{order.orderNumber}</h4>
                    <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="order-status">
                    <span className={`status-badge status-${order.status}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <div className="order-total">
                    ${order.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-orders">
              <Package size={48} />
              <h3>No orders yet</h3>
              <p>When you place your first order, it will appear here.</p>
              <Link to="/shop" className="btn btn-primary">
                Start Shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [reviewModal, setReviewModal] = useState({ isOpen: false, productId: null, orderId: null });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersAPI.getMyOrders();
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (productId, orderId) => {
    setReviewModal({
      isOpen: true,
      productId,
      orderId
    });
  };

  if (loading) return <Loading size="lg" text="Loading your orders..." />;

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>My Orders</h1>
        <p>Track and manage your orders</p>
      </div>

      {orders.length > 0 ? (
        <div className="orders-grid">
          {orders.map(order => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <h3>Order #{order.orderNumber}</h3>
                <span className={`status-badge status-${order.status}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              
              <div className="order-details">
                <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Items:</strong> {order.items.length}</p>
                <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
              </div>

              <div className="order-items">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item-row">
                    <div className="order-item">
                      <img src={item.productImage} alt={item.productName} />
                      <div className="item-details">
                        <p>{item.productName}</p>
                        <p>Size: {item.variant?.size} | Color: {item.variant?.color?.name}</p>
                      </div>
                    </div>
                    
                    {/* ADD REVIEW FUNCTIONALITY HERE */}
                    <div className="item-actions">
                      {order.status === 'delivered' && !item.hasReview && (
                        <Button
                          size="sm"
                          onClick={() => openReviewModal(item.product, order._id)}
                          className="review-btn"
                        >
                          Write Review
                        </Button>
                      )}
                      
                      {item.hasReview && (
                        <span className="reviewed-badge">✓ Reviewed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-actions">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                {order.status === 'pending' && (
                  <Button variant="ghost" size="sm">
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Package size={64} />
          <h2>No orders yet</h2>
          <p>When you place your first order, it will appear here.</p>
          <Link to="/shop" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
};

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const response = await userAPI.getWishlist();
      setWishlist(response.data.wishlist);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await userAPI.removeFromWishlist(productId);
      setWishlist(wishlist.filter(item => item._id !== productId));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  if (loading) return <Loading size="lg" text="Loading your wishlist..." />;

  return (
    <div className="wishlist-page">
      <div className="page-header">
        <h1>My Wishlist</h1>
        <p>Items you've saved for later</p>
      </div>

      {wishlist.length > 0 ? (
        <div className="wishlist-grid">
          {wishlist.map(product => (
            <div key={product._id} className="wishlist-item">
              <div className="item-image">
                <img src={product.images[0]?.url} alt={product.name} />
                <button 
                  className="remove-btn"
                  onClick={() => removeFromWishlist(product._id)}
                >
                  <Heart size={20} />
                </button>
              </div>
              <div className="item-info">
                <h3>{product.name}</h3>
                <p className="brand">{product.brand}</p>
                <p className="price">${product.salePrice || product.price}</p>
                <Link to={`/product/${product.slug}`} className="btn btn-primary btn-sm">
                  View Product
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={64} />
          <h2>Your wishlist is empty</h2>
          <p>Save items you love by clicking the heart icon on products.</p>
          <Link to="/shop" className="btn btn-primary">
            Discover Products
          </Link>
        </div>
      )}
    </div>
  );
};

const Account = () => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loading size="lg" fullScreen />;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <BackgroundWrapper>
    <div className="account-page">
      <div className="container">
        <div className="account-layout">
          {/* Sidebar Navigation */}
          <div className="account-sidebar">
            <nav className="account-nav">
              <Link 
                to="/account" 
                className={`nav-link ${location.pathname === '/account' ? 'active' : ''}`}
              >
                <User size={20} />
                Dashboard
              </Link>
              <Link 
                to="/account/orders" 
                className={`nav-link ${location.pathname === '/account/orders' ? 'active' : ''}`}
              >
                <Package size={20} />
                My Orders
              </Link>
              <Link 
                to="/account/wishlist" 
                className={`nav-link ${location.pathname === '/account/wishlist' ? 'active' : ''}`}
              >
                <Heart size={20} />
                Wishlist
              </Link>
              <Link 
                to="/account/addresses" 
                className={`nav-link ${location.pathname === '/account/addresses' ? 'active' : ''}`}
              >
                <MapPin size={20} />
                Addresses
              </Link>
              <Link 
                to="/account/reviews" 
                className={`nav-link ${location.pathname === '/account/reviews' ? 'active' : ''}`}
              >
                <Star size={20} />  {/* Add this import: import { Star } from 'lucide-react' */}
                My Reviews
              </Link>
              <Link 
                to="/account/profile" 
                className={`nav-link ${location.pathname === '/account/profile' ? 'active' : ''}`}
              >
                <SettingsIcon size={20} />
                Settings
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="account-main">
            <Routes>
              <Route index element={<AccountDashboard />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="addresses" element={<Addresses />} />
              <Route path="profile" element={<Settings/>} />
              <Route path="reviews" element={<UserReviews />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
    </BackgroundWrapper>
  );
};

export default Account;