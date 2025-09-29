import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 errors for auth-related endpoints, not cart
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Only auto-logout for auth endpoints, not cart/user data endpoints
      if (url.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // For other 401s (like cart), just return the error without auto-logout
    }
    return Promise.reject(error);
  }
);
// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  googleAuth: (data) => api.post('/auth/google', data),
};

// Products API calls
export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  getProductBySlug: (slug) => api.get(`/products/slug/${slug}`),
  getRelatedProducts: (id) => api.get(`/products/${id}/related`),
  // Admin only
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

// Categories API calls
export const categoriesAPI = {
  getCategories: () => api.get('/categories'),
  getCategory: (id) => api.get(`/categories/${id}`),
  getCategoryBySlug: (slug) => api.get(`/categories/slug/${slug}`),
  // Admin only
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

// Cart API calls
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  updateCartItem: (data) => api.put('/cart/update', data),
  removeFromCart: (data) => api.delete('/cart/remove', { data }),
  clearCart: () => api.delete('/cart/clear'),
  saveForLater: (data) => api.post('/cart/save-for-later', data),
  moveToCart: (data) => api.post('/cart/move-to-cart', data),
};

// Orders API calls
export const ordersAPI = {
  createOrder: (data) => api.post('/orders', data),
  getMyOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),
  createPaymentOrder: (data) => api.post('/orders/create-payment', data),
  verifyPayment: (data) => api.post('/orders/verify-payment', data),
  handlePaymentFailure: (data) => api.post('/orders/payment-failed', data),
};

// User API calls
export const userAPI = {
  addAddress: (data) => api.post('/user/addresses', data),
  updateAddress: (id, data) => api.put(`/user/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/user/addresses/${id}`),
  getAddresses: () => api.get('/user/profile'),
  getWishlist: () => api.get('/user/wishlist'),
  getProfile: () => api.get('/auth/me'),
  addToWishlist: (productId) => api.post(`/user/wishlist/${productId}`),
  removeFromWishlist: (productId) => api.delete(`/user/wishlist/${productId}`),
  updatePreferredSizes: (data) => api.put('/user/sizes', data),
  getUserAnalytics: () => api.get('/user/analytics'),
    // Address management
  getAddresses: () => api.get('/user/addresses'),
  addAddress: (addressData) => api.post('/user/addresses', addressData),
  updateAddress: (addressId, addressData) => api.put(`/user/addresses/${addressId}`, addressData),
  deleteAddress: (addressId) => api.delete(`/user/addresses/${addressId}`),
};

// Contact API calls
export const contactAPI = {
  submitContactForm: (contactData) => {
    return api.post('/contact', contactData);
  }
};



// Reviews API calls
export const reviewsAPI = {
  // Get reviews for a product
  getProductReviews: (productId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products/${productId}/reviews?${queryString}`);
  },

  // Create a review
  createReview: (productId, reviewData) => {
    return api.post(`/products/${productId}/reviews`, reviewData);
  },

  // Update a review
  updateReview: (reviewId, reviewData) => {
    return api.put(`/reviews/${reviewId}`, reviewData);
  },

  // Delete a review
  deleteReview: (reviewId) => {
    return api.delete(`/reviews/${reviewId}`);
  },

  // Mark review as helpful
  markHelpful: (reviewId, data) => {
    return api.post(`/reviews/${reviewId}/helpful`, data);
  },

  // Get user's reviews
  getUserReviews: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/user/reviews?${queryString}`);
  },

  // Flag a review
  flagReview: (reviewId, data) => {
    return api.post(`/reviews/${reviewId}/flag`, data);
  }
};

// Admin API calls
export const adminAPI = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  
  // User Management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  
  // Orders Management (corrected paths)
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  getOrderDetails: (orderId) => api.get(`/admin/orders/${orderId}`),
  updateOrderStatus: (orderId, data) => api.put(`/admin/orders/${orderId}/status`, data),
  getOrderStats: () => api.get('/admin/orders/stats'),
  exportOrders: (params) => api.get('/admin/orders/export', { params }),
  
  // Product Management
  bulkUpdateProductStatus: (productIds, updates) => 
    api.put('/admin/products/bulk-update', { productIds, updates }),
  
  bulkDeleteProducts: (productIds) => 
    api.delete('/admin/products/bulk-delete', { data: { productIds } }),
  
  updateProductStatus: (id, data) => 
    api.put(`/admin/products/${id}/status`, data),
  
  duplicateProduct: (id) => 
    api.post(`/admin/products/${id}/duplicate`),
  
  updateProductStock: (id, data) => api.put(`/admin/products/${id}/stock`, data),
  
  exportProducts: (filters) => 
    api.get('/admin/products/export', { 
      params: filters,
      responseType: 'blob'
    }),
  
  // Reports
  getSalesReport: (params) => api.get('/admin/reports/sales', { params }),
  getInventoryReport: () => api.get('/admin/reports/inventory'),
  getCustomersReport: (params) => api.get('/admin/reports/customers', { params }),
  exportReport: (reportType, params) => api.get(`/admin/reports/${reportType}/export`, { 
    params,
    responseType: 'blob'
  }),
};

export default api;