// routes/guest.js
const express = require("express");
const {
  initGuestSession,
  getGuestCart,
  addToGuestCart,
  updateGuestCartItem,
  removeGuestCartItem,
  guestCheckout,
  trackGuestOrder,
  trackOrderByEmail,
  convertGuestToRegistered,
  clearGuestCartDB,
} = require("../controllers/guestCheckoutController");

const {
  strictValidateKeralaAddress,
} = require("../middleware/addressValidator");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting for guest operations
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Guest session management
router.post("/init", guestLimiter, initGuestSession);

// Guest cart operations
router.get("/:guestId/cart", getGuestCart);
router.post("/:guestId/cart/add", addToGuestCart);

router.put("/:guestId/cart/update", updateGuestCartItem);
router.post("/:guestId/cart/remove", removeGuestCartItem);

// Guest checkout
router.post("/:guestId/checkout", strictValidateKeralaAddress, guestCheckout);

// Order tracking
router.post("/track-by-email", guestLimiter, trackOrderByEmail); // New route
router.get("/track/:trackingToken", trackGuestOrder);

// Convert guest to registered user
router.post("/:guestId/convert", convertGuestToRegistered);
router.delete("/:guestId/cart/clear", clearGuestCartDB);

module.exports = router;
