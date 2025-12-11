const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { LoginTicket } = require("google-auth-library");
const { RemoteConfigFetchResponse } = require("firebase-admin/remote-config");
const { MongoCryptCreateDataKeyError } = require("mongodb");

// protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token;

    // get token from heade
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("CRITICAL: JWT_SECRET not configured");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    try {
      // verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded); // debug

      const userId = decoded.id || decoded._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid token format",
        });
      }

      // get user from token
      req.user = await User.findById(userId);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account has been deactivated",
        });
      }

      next();
    } catch (error) {
      console.log("Token verification error:", error.message); // Debug log
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  } catch (error) {
    next(error);
  }
};

// restrict to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// optional authentication (for routes that work with or without auth)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
      } catch (error) {
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
