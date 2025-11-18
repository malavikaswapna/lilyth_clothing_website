// routes/promoCodes.js
const express = require("express");
const {
  validatePromoCode,
  getAllPromoCodes,
  getPromoCode,
  createPromoCode,
  updatePromoCode,
  togglePromoCodeStatus,
  deletePromoCode,
  getPromoCodeStats,
} = require("../controllers/promoCodeController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public/Customer routes
router.post("/validate", protect, validatePromoCode);

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllPromoCodes);
router.get("/admin/stats", protect, authorize("admin"), getPromoCodeStats);
router.get("/admin/:id", protect, authorize("admin"), getPromoCode);
router.post("/admin/create", protect, authorize("admin"), createPromoCode);
router.put("/admin/:id", protect, authorize("admin"), updatePromoCode);
router.put(
  "/admin/:id/toggle",
  protect,
  authorize("admin"),
  togglePromoCodeStatus
);
router.delete("/admin/:id", protect, authorize("admin"), deletePromoCode);

module.exports = router;
