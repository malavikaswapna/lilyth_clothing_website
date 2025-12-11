// middleware/productNotificationMiddleware.js
const {
  sendBackInStockNotification,
  sendPriceDropNotification,
} = require("../utils/productNotificationService");

/**
 * Middleware to trigger product notifications after product updates
 * Should be placed AFTER the product update completes successfully
 */
const triggerProductNotifications = async (req, res, originalProduct) => {
  try {
    const updatedProduct = res.locals.updatedProduct || req.body;

    console.log("\n🔔 Checking product notification triggers...");

    // 1️⃣ CHECK BACK IN STOCK
    // Trigger if product was out of stock (0) and now has stock
    const wasOutOfStock = originalProduct.totalStock === 0;
    const nowInStock = updatedProduct.totalStock > 0;

    if (wasOutOfStock && nowInStock) {
      console.log(
        `🔔 Product back in stock: ${originalProduct.name} (${originalProduct.totalStock} → ${updatedProduct.totalStock})`
      );

      // Trigger back in stock notification asynchronously
      sendBackInStockNotification(originalProduct._id)
        .then((result) => {
          console.log(
            `✅ Back in stock notifications sent: ${result.sent} emails`
          );
        })
        .catch((error) => {
          console.error("❌ Error sending back in stock notifications:", error);
        });
    }

    // 2️⃣ CHECK PRICE DROP
    // Get the effective prices (considering sale price)
    const oldEffectivePrice =
      originalProduct.salePrice || originalProduct.price;
    const newEffectivePrice = updatedProduct.salePrice || updatedProduct.price;

    // Trigger if price dropped by at least 5%
    const priceDropPercentage =
      ((oldEffectivePrice - newEffectivePrice) / oldEffectivePrice) * 100;

    if (priceDropPercentage >= 5) {
      console.log(
        `💰 Price drop detected: ${
          originalProduct.name
        } (₹${oldEffectivePrice} → ₹${newEffectivePrice}, ${priceDropPercentage.toFixed(
          1
        )}% off)`
      );

      // Trigger price drop notification asynchronously
      sendPriceDropNotification(
        originalProduct._id,
        oldEffectivePrice,
        newEffectivePrice
      )
        .then((result) => {
          console.log(
            `✅ Price drop notifications sent: ${result.sent} emails`
          );
        })
        .catch((error) => {
          console.error("❌ Error sending price drop notifications:", error);
        });
    }

    console.log("🔔 Product notification check complete");
  } catch (error) {
    // Don't throw error - notifications are non-critical
    console.error("❌ Error in product notification middleware:", error);
  }
};

module.exports = {
  triggerProductNotifications,
};
