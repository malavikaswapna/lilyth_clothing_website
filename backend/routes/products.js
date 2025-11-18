// routes/products.js
const express = require("express");
const path = require("path");
const reviewRouter = require("./reviews");
const { validateProduct } = require("../middleware/validators");

// Import the Cloudinary upload configuration
const { upload } = require("../config/cloudinary");

// Import controllers
const {
  getProducts,
  getProduct,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// Import middleware
const { protect, authorize, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Add this before your other routes
router.get("/test-cloudinary", (req, res) => {
  const { cloudinary } = require("../config/cloudinary");

  res.json({
    cloudinaryConfigured: !!cloudinary.config().cloud_name,
    cloudName: cloudinary.config().cloud_name || "NOT SET",
    apiKey: cloudinary.config().api_key ? "SET" : "NOT SET",
  });
});

router.use("/:productId/reviews", reviewRouter);

// Public routes
router.get("/", optionalAuth, getProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id/related", getRelatedProducts);
router.get("/:id", getProduct);

// Admin only routes - with Cloudinary upload
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.array("images", 10), // Now uploads to Cloudinary
  validateProduct,
  createProduct
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.array("images", 10), // Now uploads to Cloudinary
  updateProduct
);

router.delete("/:id", protect, authorize("admin"), deleteProduct);

// Error handling middleware for upload errors
router.use((error, req, res, next) => {
  if (error) {
    console.error("Upload error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
  next();
});

module.exports = router;
