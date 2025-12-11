// models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ✅ ADD: Guest user flag
    isGuest: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ✅ ADD: Guest user identifier
    guestId: {
      type: String,
      sparse: true, // Allows null values, unique only when present
      index: true,
    },

    // personal info
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, "Please provide a valid phone number"],
    },

    // authentication
    password: {
      type: String,
      required: function () {
        return !this.isGuest && this.authProvider !== "google";
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // authentication provider
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // firebase UID for google
    firebaseUid: {
      type: String,
      sparse: true,
    },

    // account status
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // profile
    avatar: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["female", "male", "other", "prefer-not-to-say"],
      default: "prefer-not-to-say",
    },

    // addresses
    addresses: [
      {
        type: {
          type: String,
          enum: ["billing", "shipping", "both"],
          default: "both",
        },
        firstName: String,
        lastName: String,
        company: String,
        addressLine1: {
          type: String,
          required: true,
        },
        addressLine2: String,
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
          default: "Kerala",
          validate: {
            validator: function (v) {
              return v.toLowerCase() === "kerala";
            },
            message: "We currently only deliver within Kerala",
          },
        },
        postalCode: {
          type: String,
          required: true,
          validate: {
            validator: function (v) {
              // kerala PIN codes: 67xxxx-69xxxx, 686xxx
              return /^\d{6}$/.test(v);
            },
            message: "PIN code must be 6 digits",
          },
        },
        country: {
          type: String,
          required: true,
          default: "India",
          validate: {
            validator: function (v) {
              return v.toLowerCase() === "india";
            },
            message: "We currently only deliver within India",
          },
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // shopping preferences
    preferredSizes: [
      {
        category: String,
        size: String,
      },
    ],

    // wishlist
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],

    // account tokens
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,

    // analytics
    lastLogin: Date,
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },

    // notification Settings
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      orderUpdates: {
        type: Boolean,
        default: true,
      },
      newUsers: {
        type: Boolean,
        default: true,
      },
      lowStock: {
        type: Boolean,
        default: true,
      },
      salesReports: {
        type: Boolean,
        default: false,
      },
      systemUpdates: {
        type: Boolean,
        default: true,
      },
    },

    lastLoginIP: String,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: Date,
    notes: [
      {
        content: String,
        addedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ✅ ADD: Guest conversion tracking
    convertedToRegistered: {
      type: Boolean,
      default: false,
    },
    convertedAt: {
      type: Date,
    },

    // ✅ ADD: Guest session expiry
    guestSessionExpiry: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// index for query performance
userSchema.index({ "addresses.postalCode": 1 });

// pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// instance method to get public profile
userSchema.methods.getPublicProfile = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  return user;
};

// ✅ ADD: Update email index to allow guest duplicates temporarily
userSchema.index(
  { email: 1, isGuest: 1 },
  {
    unique: true,
    partialFilterExpression: { isGuest: false },
  }
);

// compound indexes for better query performance
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// ✅ ADD: Method to check if guest session is expired
userSchema.methods.isGuestSessionExpired = function () {
  if (!this.isGuest) return false;
  return this.guestSessionExpiry && this.guestSessionExpiry < new Date();
};

// ✅ ADD: Method to convert guest to registered user
userSchema.methods.convertToRegistered = async function (password) {
  this.isGuest = false;
  this.guestId = null;
  this.password = password;
  this.convertedToRegistered = true;
  this.convertedAt = new Date();
  this.guestSessionExpiry = null;
  await this.save();
  return this;
};

module.exports = mongoose.model("User", userSchema);
