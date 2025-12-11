//frontend/src/services/api.js

import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001/api",
  timeout: 30000,
  // DON'T set Content-Type here - let axios handle it automatically
});

// Request interceptor to add auth token and handle FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CRITICAL: Only set Content-Type to application/json if NOT FormData
    // If it's FormData, let the browser set the Content-Type automatically
    // (it needs to include the boundary parameter)
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    // If it IS FormData, delete any Content-Type to let browser handle it
    else {
      delete config.headers["Content-Type"];
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
      const url = error.config?.url || "";

      // Only auto-logout for auth endpoints, not cart/user data endpoints
      if (url.includes("/auth/")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      // For other 401s (like cart), just return the error without auto-logout
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  getProfile: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  updatePassword: (data) => api.put("/auth/password", data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) =>
    api.put(`/auth/reset-password/${token}`, { password }),
  // Google OAuth - SEPARATE endpoints for register and login
  googleRegister: (data) => api.post("/auth/google/register", data), // ⬅️ For Register page
  googleLogin: (data) => api.post("/auth/google/login", data), // ⬅️ For Login page
  updateNotificationSettings: (settings) =>
    api.put("/user/notifications", settings),
};

// Products API calls
export const productsAPI = {
  getProducts: (params) => {
    // Add timestamp to prevent caching
    const paramsWithTimestamp = {
      ...params,
      _t: Date.now(),
    };

    return api.get("/products", {
      params: paramsWithTimestamp,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  getProduct: (id) => {
    return api.get(`/products/${id}`, {
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  getProductBySlug: (slug) => {
    return api.get(`/products/slug/${slug}`, {
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  getRelatedProducts: (id) => {
    return api.get(`/products/${id}/related`, {
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  // Admin only
  createProduct: (data) => api.post("/products", data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

// Categories API calls
export const categoriesAPI = {
  getCategories: () => api.get("/categories"),
  getCategory: (id) => api.get(`/categories/${id}`),
  getCategoryBySlug: (slug) => api.get(`/categories/slug/${slug}`),
  // Admin only
  createCategory: (data) => api.post("/categories", data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

// Cart API calls
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart/add", data),
  updateCartItem: (data) => api.put("/cart/update", data),
  removeFromCart: (data) => api.delete("/cart/remove", { data }),
  clearCart: () => api.delete("/cart/clear"),
  saveForLater: (data) => api.post("/cart/save-for-later", data),
  moveToCart: (data) => api.post("/cart/move-to-cart", data),
};

// Orders API calls
export const ordersAPI = {
  createOrder: (data) => {
    console.log("🚀 Creating order with data:", data);
    console.log("📍 API Base URL:", api.defaults.baseURL);
    console.log("🔗 Full URL:", `${api.defaults.baseURL}/orders`);

    return api
      .post("/orders", data)
      .then((response) => {
        console.log("✅ Order created successfully:", response.data);
        return response;
      })
      .catch((error) => {
        console.error("❌ Order creation failed:");
        console.error("   Status:", error.response?.status);
        console.error("   URL:", error.config?.url);
        console.error("   Base URL:", error.config?.baseURL);
        console.error(
          "   Full URL:",
          error.config?.baseURL + error.config?.url
        );
        console.error("   Full Response:", error.response?.data);
        console.error("   Message:", error.response?.data?.message);

        // If message is an array, log each item
        if (Array.isArray(error.response?.data?.message)) {
          console.error("   Error details:");
          error.response.data.message.forEach((msg, idx) => {
            console.error(`     ${idx + 1}. ${msg}`);
          });
        }

        throw error;
      });
  },

  getMyOrders: (params) => api.get("/orders", { params }),

  getOrder: (id) => {
    return api.get(`/orders/${id}`).then((response) => {
      // Ensure product slugs are available in items
      if (response.data.order && response.data.order.items) {
        response.data.order.items = response.data.order.items.map((item) => ({
          ...item,
          product: {
            ...item.product,
            slug: item.product?.slug || null,
          },
        }));
      }
      return response;
    });
  },

  cancelOrder: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),

  // Payment related endpoints - Updated to match backend routes
  createPaymentOrder: (data) => api.post("/payments/create-order", data),
  verifyPayment: (data) => api.post("/payments/verify", data),
  handlePaymentFailure: (data) => api.post("/payments/failure", data),

  // Return management
  requestReturn: (orderId, data) =>
    api.post(`/returns/${orderId}/return`, data),
};

// User API calls
export const userAPI = {
  addAddress: (data) => api.post("/user/addresses", data),
  updateAddress: (id, data) => api.put(`/user/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/user/addresses/${id}`),
  getAddresses: () => api.get("/user/profile"),
  getWishlist: () => api.get("/user/wishlist"),
  getProfile: () => api.get("/auth/me"),
  addToWishlist: (productId) => api.post(`/user/wishlist/${productId}`),
  removeFromWishlist: (productId) => api.delete(`/user/wishlist/${productId}`),
  updatePreferredSizes: (data) => api.put("/user/sizes", data),
  getUserAnalytics: () => api.get("/user/analytics"),
  // Address management
  getAddresses: () => api.get("/user/addresses"),
  addAddress: (addressData) => api.post("/user/addresses", addressData),
  updateAddress: (addressId, addressData) =>
    api.put(`/user/addresses/${addressId}`, addressData),
  deleteAddress: (addressId) => api.delete(`/user/addresses/${addressId}`),

  // Account deletion
  deleteAccount: (data) => api.delete("/user/account", { data }),
};

// Contact API calls
export const contactAPI = {
  submitContactForm: (contactData) => {
    return api.post("/contact", contactData);
  },
};

// Reviews API calls - FIXED VERSION
export const reviewsAPI = {
  // Get reviews for a product
  getProductReviews: (productId, params = {}) => {
    console.log("Getting product reviews for:", productId);
    const queryString = new URLSearchParams(params).toString();
    const url = `/products/${productId}/reviews${
      queryString ? `?${queryString}` : ""
    }`;
    console.log("Full URL:", url);
    return api.get(url);
  },

  // Create a review
  createReview: (productId, reviewData) => {
    console.log("Creating review for product:", productId);
    console.log("Review data:", reviewData);
    return api.post(`/products/${productId}/reviews`, reviewData);
  },

  // Update a review
  updateReview: (reviewId, reviewData) => {
    console.log("Updating review:", reviewId);
    console.log("Update data:", reviewData);
    return api.put(`/reviews/${reviewId}`, reviewData);
  },

  // Delete a review
  deleteReview: (reviewId) => {
    console.log("Deleting review:", reviewId);
    return api.delete(`/reviews/${reviewId}`);
  },

  // Mark review as helpful
  markHelpful: (reviewId, data) => {
    console.log("Marking review helpful:", reviewId, data);
    return api.post(`/reviews/${reviewId}/helpful`, data);
  },

  // Get user's reviews - FIXED ENDPOINT
  getUserReviews: (params = {}) => {
    console.log("Getting user reviews");
    const queryString = new URLSearchParams(params).toString();
    // Use the correct endpoint from user routes
    const url = `/user/reviews${queryString ? `?${queryString}` : ""}`;
    console.log("Full URL:", url);
    return api.get(url);
  },

  // Flag a review
  flagReview: (reviewId, data) => {
    console.log("Flagging review:", reviewId, data);
    return api.post(`/reviews/${reviewId}/flag`, data);
  },
};

export const pincodeAPI = {
  validatePincode: (pincode) => api.get(`/pincode/validate/${pincode}`),
  autofillAddress: (pincode) => api.get(`/pincode/autofill/${pincode}`),
  searchPostOffice: (query) => api.get(`/pincode/search/${query}`),
  getDistrictSuggestions: (query) => api.get(`/pincode/districts/${query}`),
  getAllDistricts: () => api.get("/pincode/districts"),
  verifyAddress: (data) => api.post("/pincode/verify-address", data),
  getDeliveryInfo: (pincode) => api.get(`/pincode/delivery-info/${pincode}`),
  getServiceAreas: () => api.get("/pincode/service-areas"),
};

// promo code API
export const promoCodeAPI = {
  // Customer APIs
  validatePromoCode: (data) => api.post("/promo-codes/validate", data),

  // Admin APIs
  getAllPromoCodes: (params) => api.get("/promo-codes/admin/all", { params }),
  getPromoCode: (id) => api.get(`/promo-codes/admin/${id}`),
  createPromoCode: (data) => api.post("/promo-codes/admin/create", data),
  updatePromoCode: (id, data) => api.put(`/promo-codes/admin/${id}`, data),
  togglePromoCodeStatus: (id) => api.put(`/promo-codes/admin/${id}/toggle`),
  deletePromoCode: (id) => api.delete(`/promo-codes/admin/${id}`),
  getPromoCodeStats: () => api.get("/promo-codes/admin/stats"),
};

// Newsletter API calls
export const newsletterAPI = {
  // Subscribe to newsletter
  subscribe: (data) => api.post("/newsletter/subscribe", data),

  // Unsubscribe from newsletter
  unsubscribe: (email) => api.post("/newsletter/unsubscribe", { email }),

  // Admin only - get newsletter stats
  getStats: () => api.get("/newsletter/stats"),

  // Admin only - get all subscribers
  getSubscribers: (params) => api.get("/newsletter/subscribers", { params }),

  // Admin only - export subscribers
  exportSubscribers: (params) =>
    api.get("/newsletter/export", {
      params,
      responseType: "blob",
    }),
};

// Admin API calls
export const adminAPI = {
  // Dashboard
  getDashboard: () => api.get("/admin/dashboard"),

  // User Management
  getAllUsers: (params) => api.get("/admin/users", { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),

  // Orders Management (corrected paths)
  getAllOrders: (params) => api.get("/admin/orders", { params }),
  getOrderDetails: (orderId) => api.get(`/admin/orders/${orderId}`),
  updateOrderStatus: (orderId, data) =>
    api.put(`/admin/orders/${orderId}/status`, data),
  getOrderStats: () => api.get("/admin/orders/stats"),
  exportOrders: (params) => api.get("/admin/orders/export", { params }),

  // Product Management
  bulkUpdateProductStatus: (productIds, updates) =>
    api.put("/admin/products/bulk-update", { productIds, updates }),

  bulkDeleteProducts: (productIds) =>
    api.delete("/admin/products/bulk-delete", { data: { productIds } }),

  updateProductStatus: (id, data) =>
    api.put(`/admin/products/${id}/status`, data),

  duplicateProduct: (id) => api.post(`/admin/products/${id}/duplicate`),

  updateProductStock: (id, data) =>
    api.put(`/admin/products/${id}/stock`, data),

  exportProducts: (filters) =>
    api.get("/admin/products/export", {
      params: filters,
      responseType: "blob",
    }),

  // Reports
  getSalesReport: (params) => api.get("/admin/reports/sales", { params }),
  getInventoryReport: () => api.get("/admin/reports/inventory"),
  getCustomersReport: (params) =>
    api.get("/admin/reports/customers", { params }),
  exportReport: (reportType, params) =>
    api.get(`/admin/reports/${reportType}/export`, {
      params,
      responseType: "blob",
    }),

  // Notification Settings
  getNotificationSettings: () => api.get("/admin/settings/notifications"),
  updateNotificationSettings: (data) =>
    api.put("/admin/settings/notifications", data),

  // Store Settings  ← ADD THESE TWO LINES
  getStoreSettings: () => api.get("/admin/settings/store"),
  updateStoreSettings: (data) => api.put("/admin/settings/store", data),

  // Return Management
  getAllReturns: (params) => api.get("/returns/admin/all", { params }),
  updateReturnStatus: (orderId, data) =>
    api.put(`/returns/admin/${orderId}`, data),
  getReturnStats: () => api.get("/returns/admin/stats"),

  // Payment Settings
  getPaymentSettings: () => api.get("/payment-settings"),
  updatePaymentSettings: (data) => api.put("/payment-settings", data),
  getAvailablePaymentMethods: () =>
    api.get("/payment-settings/available-methods"),
};

export const paymentAPI = {
  getAvailablePaymentMethods: () =>
    api.get("/payment-settings/available-methods"),
  getPaymentSettings: () => api.get("/payment-settings"),
};

// Guest Checkout API calls
export const guestAPI = {
  // Initialize guest session
  initGuestSession: () => api.post("/guest/init"),
  // Get guest cart
  getGuestCart: (guestId) => api.get(`/guest/${guestId}/cart`),
  // Add to guest cart
  addToGuestCart: (guestId, data) =>
    api.post(`/guest/${guestId}/cart/add`, data),
  // Guest checkout
  guestCheckout: (guestId, data) =>
    api.post(`/guest/${guestId}/checkout`, data),
  // Track guest order by email and order number
  trackOrderByEmail: (data) => api.post(`/guest/track-by-email`, data),
  // Track guest order by tracking token
  trackGuestOrder: (trackingToken) => api.get(`/guest/track/${trackingToken}`),
  // Convert guest to registered user
  convertGuestToRegistered: (guestId, data) =>
    api.post(`/guest/${guestId}/convert`, data),

  // Update quantity in guest cart
  updateGuestCartItem: (guestId, data) =>
    api.put(`/guest/${guestId}/cart/update`, data),

  // Remove product from guest cart
  removeFromGuestCart: (guestId, data) =>
    api.post(`/guest/${guestId}/cart/remove`, data),

  clearGuestCartDB: (guestId) => api.delete(`/guest/${guestId}/cart/clear`),
};

export default api;
