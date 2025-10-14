// src/services/pincodeService.js
import api from "./api";

export const pincodeAPI = {
  // Validate a PIN code
  validatePincode: (pincode) => api.get(`/pincode/validate/${pincode}`),

  // Get autofill data from PIN code
  autofillAddress: (pincode) => api.get(`/pincode/autofill/${pincode}`),

  // Search post offices
  searchPostOffice: (query) => api.get(`/pincode/search/${query}`),

  // Get city suggestions
  getCitySuggestions: (query) => api.get(`/pincode/cities/${query}`),

  // Verify complete address
  verifyAddress: (data) => api.post("/pincode/verify-address", data),
};
