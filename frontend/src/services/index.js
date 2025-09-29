// Export all API services
export { 
  default as api,
  authAPI,
  productsAPI,
  categoriesAPI,
  cartAPI,
  ordersAPI,
  userAPI 
} from './api';

// Export any additional utilities or helpers
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API status checker
export const checkAPIStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};