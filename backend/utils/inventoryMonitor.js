// utils/inventoryMonitor.js
const Product = require("../models/Product");
const emailService = require("./emailService");
const { auditLogger } = require("./auditLogger");

// Stock thresholds
const STOCK_THRESHOLDS = {
  CRITICAL: 5, // Red alert - immediate action needed
  LOW: 10, // Yellow alert - should restock soon
  WARNING: 20, // Monitor closely
};

// Inventory monitoring class
class InventoryMonitor {
  constructor() {
    this.alerts = new Map(); // Track sent alerts to avoid spam
    this.checkInterval = null;
  }

  // Check single product stock levels
  async checkProductStock(product) {
    const alerts = [];

    // Check total stock
    if (product.totalStock <= STOCK_THRESHOLDS.CRITICAL) {
      alerts.push({
        level: "critical",
        type: "total_stock",
        product: product,
        message: `Critical: ${product.name} has only ${product.totalStock} items in stock`,
      });
    } else if (product.totalStock <= STOCK_THRESHOLDS.LOW) {
      alerts.push({
        level: "low",
        type: "total_stock",
        product: product,
        message: `Low stock: ${product.name} has ${product.totalStock} items`,
      });
    }

    // Check individual variants
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.stock === 0) {
          alerts.push({
            level: "critical",
            type: "variant_out_of_stock",
            product: product,
            variant: variant,
            message: `Out of stock: ${product.name} - ${variant.size} ${variant.color.name}`,
          });
        } else if (variant.stock <= STOCK_THRESHOLDS.CRITICAL) {
          alerts.push({
            level: "critical",
            type: "variant_critical",
            product: product,
            variant: variant,
            message: `Critical: ${product.name} - ${variant.size} ${variant.color.name} has only ${variant.stock} items`,
          });
        }
      }
    }

    return alerts;
  }

  // Check all products
  async checkAllProducts() {
    try {
      const products = await Product.find({ status: "active" });
      const allAlerts = [];

      for (const product of products) {
        const alerts = await this.checkProductStock(product);
        allAlerts.push(...alerts);
      }

      // Send notifications for critical alerts
      await this.processAlerts(allAlerts);

      return allAlerts;
    } catch (error) {
      console.error("Inventory check error:", error);
      throw error;
    }
  }

  // Process and send alerts
  async processAlerts(alerts) {
    const criticalAlerts = alerts.filter((a) => a.level === "critical");

    if (criticalAlerts.length === 0) return;

    // Group alerts by product
    const alertsByProduct = new Map();
    for (const alert of criticalAlerts) {
      const productId = alert.product._id.toString();
      if (!alertsByProduct.has(productId)) {
        alertsByProduct.set(productId, []);
      }
      alertsByProduct.get(productId).push(alert);
    }

    // Send email alerts
    for (const [productId, productAlerts] of alertsByProduct) {
      const alertKey = `${productId}-${Date.now()}`;

      // Check if we recently sent an alert for this product (within last 24 hours)
      const lastAlert = this.alerts.get(productId);
      if (lastAlert && Date.now() - lastAlert < 24 * 60 * 60 * 1000) {
        continue; // Skip to avoid spam
      }

      // Send email notification
      const product = productAlerts[0].product;
      const variant = productAlerts[0].variant;

      await emailService.sendLowStockAlert(product, variant);

      // Log audit trail
      await auditLogger.log({
        userId: null,
        action: "INVENTORY_ALERT",
        resource: "product",
        resourceId: product._id,
        details: {
          alerts: productAlerts.map((a) => a.message),
          level: "critical",
        },
      });

      // Track sent alert
      this.alerts.set(productId, Date.now());
    }
  }

  // Start automated monitoring
  startMonitoring(intervalMinutes = 60) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log(
      `Starting inventory monitoring (checking every ${intervalMinutes} minutes)`
    );

    // Run immediately
    this.checkAllProducts().catch(console.error);

    // Then run at intervals
    this.checkInterval = setInterval(() => {
      this.checkAllProducts().catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("Inventory monitoring stopped");
    }
  }

  // Get inventory report
  async getInventoryReport() {
    const products = await Product.find({ status: "active" });

    const report = {
      totalProducts: products.length,
      criticalStock: 0,
      lowStock: 0,
      outOfStock: 0,
      products: [],
    };

    for (const product of products) {
      const productReport = {
        id: product._id,
        name: product.name,
        sku: product.sku,
        totalStock: product.totalStock,
        status: "ok",
        variants: [],
      };

      // Check total stock status
      if (product.totalStock === 0) {
        productReport.status = "out_of_stock";
        report.outOfStock++;
      } else if (product.totalStock <= STOCK_THRESHOLDS.CRITICAL) {
        productReport.status = "critical";
        report.criticalStock++;
      } else if (product.totalStock <= STOCK_THRESHOLDS.LOW) {
        productReport.status = "low";
        report.lowStock++;
      }

      // Check variants
      for (const variant of product.variants) {
        const variantReport = {
          size: variant.size,
          color: variant.color.name,
          stock: variant.stock,
          status: "ok",
        };

        if (variant.stock === 0) {
          variantReport.status = "out_of_stock";
        } else if (variant.stock <= STOCK_THRESHOLDS.CRITICAL) {
          variantReport.status = "critical";
        } else if (variant.stock <= STOCK_THRESHOLDS.LOW) {
          variantReport.status = "low";
        }

        productReport.variants.push(variantReport);
      }

      report.products.push(productReport);
    }

    return report;
  }

  // Check low stock and send notification
  async checkLowStockAndNotify() {
    try {
      const User = require("../models/User");

      const lowStockProducts = await Product.find({
        totalStock: { $lt: 10, $gt: 0 },
        status: "active",
      }).select("name totalStock sku");

      if (lowStockProducts.length === 0) {
        console.log("✅ All products have sufficient stock");
        return;
      }

      // Get admin with low stock notifications enabled
      const admin = await User.findOne({
        role: "admin",
        "notificationSettings.lowStock": true,
      });

      if (!admin || !admin.email) {
        console.log("No admin to notify about low stock");
        return;
      }

      const productList = lowStockProducts
        .map(
          (p) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px;">${p.name}</td>
          <td style="padding: 10px; color: ${
            p.totalStock < 5 ? "#ef4444" : "#f59e0b"
          }; font-weight: bold;">
            ${p.totalStock} units
          </td>
        </tr>
      `
        )
        .join("");

      await emailService.sendEmail({
        to: admin.email,
        subject: `⚠️ Low Stock Alert - ${lowStockProducts.length} Products`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Low Stock Alert</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <p>The following ${lowStockProducts.length} product(s) are running low on stock:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: left;">Stock Level</th>
                  </tr>
                </thead>
                <tbody>
                  ${productList}
                </tbody>
              </table>
              <a href="${process.env.CLIENT_URL}/admin/products" 
                 style="display: inline-block; background: #f59e0b; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                View Inventory
              </a>
            </div>
          </div>
        `,
      });

      console.log(
        `✅ Low stock notification sent for ${lowStockProducts.length} products`
      );
    } catch (error) {
      console.error("Low stock notification error:", error);
    }
  }

  // Predict stockout date based on sales velocity
  async predictStockout(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) return null;

      // Get sales data from last 30 days
      const Order = require("../models/Order");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const orders = await Order.find({
        "items.product": productId,
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: "cancelled" },
      });

      // Calculate daily average sales
      let totalSold = 0;
      orders.forEach((order) => {
        order.items.forEach((item) => {
          if (item.product.toString() === productId.toString()) {
            totalSold += item.quantity;
          }
        });
      });

      const dailyAverage = totalSold / 30;

      if (dailyAverage === 0) return null;

      const daysUntilStockout = Math.floor(product.totalStock / dailyAverage);
      const stockoutDate = new Date();
      stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);

      return {
        productId,
        currentStock: product.totalStock,
        dailyAverageSales: dailyAverage,
        daysUntilStockout,
        estimatedStockoutDate: stockoutDate,
        shouldReorder: daysUntilStockout <= 14, // Reorder if less than 2 weeks
      };
    } catch (error) {
      console.error("Stockout prediction error:", error);
      return null;
    }
  }
}

// Create singleton instance
const inventoryMonitor = new InventoryMonitor();

module.exports = inventoryMonitor;
