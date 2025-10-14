const {
  DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS,
} = require("google-auth-library/build/src/auth/authclient");
const app = require("./app");
const connectDB = require("./config/database");
const { initializeFirebase } = require("./config/firebase");
const inventoryMonitor = require("./utils/inventoryMonitor");
const { StandardValidation } = require("express-validator/lib/context-items");
const { ShaCertificate } = require("firebase-admin/project-management");
const { youtube } = require("googleapis/build/src/apis/youtube");

const PORT = process.env.PORT || 3001;

const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Connect to database
connectDB();

// Initialize firebase
initializeFirebase();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);

  // Start inventory monitoring
  if (process.env.ENABLE_INVENTORY_MONITORING !== "false") {
    inventoryMonitor.startMonitoring(60);
    console.log("📊 Inventory monitoring started");
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  inventoryMonitor.stopMonitoring();
  server.close(() => {
    process.exit(1);
  });
});

// shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  inventoryMonitor.stopMonitoring();
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});
