// backend/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const path = require("path"); // âœ… ADD THIS
const errorHandler = require("./middleware/errorHandler");
const adminRoutes = require("./routes/admin");
const { sanitizeQuery } = require("./middleware/queryOptimizer");
const apicache = require("apicache");
const cache = apicache.middleware;
require("dotenv").config();

const app = express();

app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`âš ï¸ Blocked CORS request from: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "Expires",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(sanitizeQuery);

// Serve static files (for uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// public routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", cache("5 minutes"), require("./routes/categories"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/pincode", require("./routes/pincode"));
app.use("/api/newsletter", require("./routes/newsletter"));

// protected routes
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/user", require("./routes/user"));
app.use("/api/promo-codes", require("./routes/promoCodes"));

// payment routes
app.use("/api/payments", require("./routes/payments"));

// admin routes
app.use("/api/admin", adminRoutes);

// test route
app.get("/", (req, res) => {
  res.json({
    message: "Women's Fashion E-commerce API - LILYTH",
    version: "1.0.0",
    status: "Server is running!",
    serviceArea: {
      state: "Kerala",
      country: "India",
      message: "We currently deliver only within Kerala",
    },
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      categories: "/api/categories",
      cart: "/api/cart",
      orders: "/api/orders",
      user: "/api/user",
      reviews: "/api/reviews",
      pincode: "/api/pincode",
      payments: "/api/payments",
      promoCodes: "/api/promo-codes",
      newsletter: "/api/newsletter",
    },
  });
});

// health check route
app.get("/health", async (req, res) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  };

  try {
    await mongoose.connection.db.admin().ping();
    health.database = "connected";
  } catch (error) {
    health.database = "disconnected";
    health.status = "ERROR";
  }

  const statusCode = health.status === "OK" ? 200 : 503;
  res.status(statusCode).json(health);
});

// 404 handler
app.use((req, res) => {
  console.log(`âŒ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// error handling middleware
app.use(errorHandler);

module.exports = app;
