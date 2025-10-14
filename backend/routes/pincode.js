// routes/pincode.js
const express = require("express");
const {
  validatePincode,
  searchPostOffice,
  getDistrictSuggestions,
  getAllDistricts,
  verifyAddress,
  autofillAddress,
  getDeliveryInfo,
  getServiceAreas,
} = require("../controllers/pincodeController");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting
const pincodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

router.use(pincodeLimiter);

// Public routes
router.get("/validate/:pincode", validatePincode);
router.get("/search/:query", searchPostOffice);
router.get("/districts/:query", getDistrictSuggestions);
router.get("/districts", getAllDistricts); // Get all Kerala districts
router.get("/autofill/:pincode", autofillAddress);
router.get("/delivery-info/:pincode", getDeliveryInfo); // NEW: Delivery info
router.get("/service-areas", getServiceAreas); // NEW: Service coverage
router.post("/verify-address", verifyAddress);

module.exports = router;
