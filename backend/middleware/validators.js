const { body, param, query, validationResult } = require("express-validator");

// Validation middleware to check for errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Product validation
const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Name must be 3-200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be 10-2000 characters"),

  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("salePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Sale price must be a positive number")
    .custom((value, { req }) => {
      if (value && value >= req.body.price) {
        throw new Error("Sale price must be less than regular price");
      }
      return true;
    }),

  body("sku")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("SKU must be 3-50 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  validate,
];

// Order validation
const validateOrder = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),

  body("items.*.productId").isMongoId().withMessage("Invalid product ID"),

  body("items.*.quantity")
    .isInt({ min: 1, max: 10 })
    .withMessage("Quantity must be between 1 and 10"),

  body("shippingAddress.firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required"),

  body("shippingAddress.addressLine1")
    .trim()
    .notEmpty()
    .withMessage("Address is required"),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),

  body("shippingAddress.postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .matches(/^\d{6}$/)
    .withMessage("Invalid Indian postal code"),

  validate,
];

// User registration validation
const validateRegistration = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be 2-50 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be 2-50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),

  validate,
];

// Review validation
const validateReview = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Review title is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be 5-200 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Review content is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Content must be 10-2000 characters"),

  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  validate,
];

module.exports = {
  validate,
  validateProduct,
  validateOrder,
  validateRegistration,
  validateReview,
};
