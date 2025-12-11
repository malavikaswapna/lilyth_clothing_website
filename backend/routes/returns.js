// routes/returns.js
const express = require("express");
const {
  requestReturn,
  getAllReturns,
  updateReturnStatus,
  getReturnStats,
} = require("../controllers/returnController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Customer routes
router.post("/:orderId/return", protect, requestReturn);

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllReturns);
router.get("/admin/stats", protect, authorize("admin"), getReturnStats);
router.put("/admin/:orderId", protect, authorize("admin"), updateReturnStatus);

module.exports = router;
