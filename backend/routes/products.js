// routes/products.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const reviewRouter = require("./reviews");
const { validateProduct } = require("../middleware/validators");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Import controllers - fix the path if needed
const {
  getProducts,
  getProduct,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController"); // or productsController - check which file exists

// Import middleware
const { protect, authorize, optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.use("/:productId/reviews", reviewRouter);

// Public routes
router.get("/", optionalAuth, getProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id/related", getRelatedProducts);
router.get("/:id", getProduct);

// Admin only routes - with file upload for POST
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.array("images", 10),
  validateProduct,
  createProduct
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.array("images", 10),
  updateProduct
);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
