// utils/cartValidator.js
// Validates cart items and removes inactive products

const Product = require("../models/Product");

const validateCartItems = async (cartItems) => {
  const validItems = [];
  const removedItems = [];
  const warnings = [];

  for (const item of cartItems) {
    const productId = item.product || item.productId;

    try {
      const product = await Product.findById(productId);

      // check if product exists
      if (!product) {
        removedItems.push({
          ...item,
          reason: "Product no longer exists",
        });
        warnings.push(
          `Product with ID ${productId} was removed from your cart (no longer available)`
        );
        continue;
      }

      // check if product is active
      if (product.status !== "active") {
        removedItems.push({
          ...item,
          productName: product.name,
          reason: "Product is currently unavailable",
        });
        warnings.push(
          `"${product.name}" was removed from your cart (currently unavailable)`
        );
        continue;
      }

      // check if variant exists
      const variant = product.variants.find(
        (v) => v.size === item.size && v.color.name === item.color
      );

      if (!variant) {
        removedItems.push({
          ...item,
          productName: product.name,
          reason: "Selected variant no longer available",
        });
        warnings.push(
          `"${product.name}" (${item.size}/${item.color}) was removed from your cart (variant unavailable)`
        );
        continue;
      }

      // check stock availability
      if (variant.stock < item.quantity) {
        if (variant.stock > 0) {
          item.quantity = variant.stock;
          warnings.push(
            `Quantity for "${product.name}" was adjusted to ${variant.stock} (limited stock)`
          );
          validItems.push(item);
        } else {
          removedItems.push({
            ...item,
            productName: product.name,
            reason: "Out of stock",
          });
          warnings.push(
            `"${product.name}" was removed from your cart (out of stock)`
          );
        }
        continue;
      }

      // item is valid
      validItems.push(item);
    } catch (error) {
      console.error(`Error validating cart item ${productId}:`, error);
      removedItems.push({
        ...item,
        reason: "Validation error",
      });
      warnings.push(
        `An item was removed from your cart due to a validation error`
      );
    }
  }

  return {
    validItems,
    removedItems,
    warnings,
    hasChanges: removedItems.length > 0 || warnings.length > 0,
  };
};

// middleware to validate cart before checkout
const validateCartMiddleware = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const validation = await validateCartItems(items);

    // if items were removed, return error with details
    if (validation.removedItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some items in your cart are no longer available",
        validItems: validation.validItems,
        removedItems: validation.removedItems,
        warnings: validation.warnings,
        action: "UPDATE_CART", // Frontend should update cart
      });
    }

    // if quantities were adjusted, warn but continue
    if (validation.warnings.length > 0) {
      req.cartWarnings = validation.warnings;
    }

    // update request with validated items
    req.body.items = validation.validItems;

    next();
  } catch (error) {
    console.error("Cart validation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate cart",
      error: error.message,
    });
  }
};

module.exports = {
  validateCartItems,
  validateCartMiddleware,
};
