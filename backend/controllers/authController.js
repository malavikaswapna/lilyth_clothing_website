// controllers/authController.js
const User = require("../models/User");
const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const crypto = require("crypto");
const emailService = require("../utils/emailService");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // ✅ NEW: Check if guest user exists with this email
  const existingGuest = await User.findOne({
    email: email.toLowerCase(),
    isGuest: true,
  });

  let user;
  let isConvertedGuest = false;
  let ordersLinked = 0;

  if (existingGuest) {
    // ✅ GUEST CONVERSION PATH
    console.log("🔄 Converting guest user to registered:", {
      guestId: existingGuest.guestId,
      email: existingGuest.email,
      hasOrders: existingGuest.totalOrders > 0,
    });

    // Count existing orders before conversion
    ordersLinked = await Order.countDocuments({ user: existingGuest._id });

    // Update guest user details
    existingGuest.firstName = firstName;
    existingGuest.lastName = lastName;

    // Convert to registered user
    await existingGuest.convertToRegistered(password);

    user = existingGuest;
    isConvertedGuest = true;

    console.log("✅ Guest user converted to registered:", {
      userId: user._id,
      email: user.email,
      ordersLinked,
    });

    // Send welcome back email
    try {
      await emailService.sendWelcomeBackEmail(user, {
        ordersFound: ordersLinked,
      });
      console.log("✅ Welcome back email sent");
    } catch (emailError) {
      console.warn("⚠️ Welcome back email failed:", emailError.message);
    }

    // Log conversion
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: "GUEST_CONVERTED_TO_REGISTERED",
      resource: "user",
      resourceId: user._id,
      details: {
        method: "email_registration",
        ordersLinked,
        previousGuestId: existingGuest.guestId,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } else {
    // ✅ NEW REGISTRATION PATH

    // Check if regular user already exists
    const userExists = await User.findOne({
      email: email.toLowerCase(),
      isGuest: false,
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message:
          "User already exists with this email address. Please login instead.",
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(emailVerificationToken)
      .digest("hex");

    // Create new user
    user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      authProvider: "local",
      emailVerificationToken: hashedToken,
      emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    console.log("✅ New user registered:", {
      userId: user._id,
      email: user.email,
    });

    // Send verification email
    try {
      await emailService.sendEmailVerification(user, emailVerificationToken);
      console.log("✅ Verification email sent");
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Notify admin of new user registration (optional)
    try {
      const admin = await User.findOne({
        role: "admin",
        "notificationSettings.newUsers": true,
      });

      if (admin && admin.email) {
        console.log(
          "ℹ️  Skipping admin notification (function not implemented)"
        );
      }
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
    }

    // Log audit trail
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: "USER_CREATED",
      resource: "user",
      resourceId: user._id,
      details: { method: "email_registration" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  // Generate token
  const token = generateToken(user._id);

  // Send response
  res.status(201).json({
    success: true,
    message: isConvertedGuest
      ? "Welcome back! Your previous orders are now linked to your account."
      : `Welcome to LILYTH, ${user.firstName}! Please check your email to verify your account.`,
    token,
    user: user.getPublicProfile(),
    isConvertedGuest,
    ordersLinked: isConvertedGuest ? ordersLinked : 0,
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // hash the token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // find user with valid token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token",
    });
  }

  // update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // send welcome email after verification
  try {
    await emailService.sendEmail({
      to: user.email,
      subject: "Welcome to LILYTH!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .button { display: inline-block; background: #44465d; color: white; padding: 15px 30px; 
                     text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LILYTH</h1>
              <h2>Welcome!</h2>
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>Your email has been verified successfully! Welcome to LILYTH.</p>
              <p>We're excited to have you as part of our community. You're now ready to explore our collection and start shopping!</p>
              
              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/shop" class="button">Start Shopping</a>
              </div>

              <p>If you have any questions, feel free to reach out to us at any time.</p>
              
              <div class="footer">
                <p>© 2025 LILYTH. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      notificationType: "system",
    });
    console.log(`✅ Welcome email sent after verification: ${user.email}`);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
  }

  // log audit trail
  await auditLogger.log({
    userId: user._id,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    action: "EMAIL_VERIFIED",
    resource: "user",
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: "Email verified successfully!",
  });
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
exports.resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email already verified",
    });
  }

  // Generate new verification token
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(emailVerificationToken)
    .digest("hex");

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  // send verification email using correct function name
  await emailService.sendEmailVerification(user, emailVerificationToken);

  res.status(200).json({
    success: true,
    message: "Verification email sent!",
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email and password",
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) {
    // log failed attempt
    await auditLogger.log({
      userId: null,
      userEmail: email,
      action: "LOGIN_ATTEMPT",
      resource: "user",
      status: "failure",
      details: { reason: "user_not_found" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    // log failed attempt
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: "LOGIN_ATTEMPT",
      resource: "user",
      resourceId: user._id,
      status: "failure",
      details: { reason: "invalid_password" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // check if account is active
  if (!user.isActive) {
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: "LOGIN_ATTEMPT",
      resource: "user",
      resourceId: user._id,
      status: "failure",
      details: { reason: "account_deactivated" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(403).json({
      success: false,
      message: "Your account has been deactivated. Please contact support.",
    });
  }

  // update last login
  user.lastLogin = new Date();
  await user.save();

  // log successful login
  await auditLogger.log({
    userId: user._id,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    action: "LOGIN_ATTEMPT",
    resource: "user",
    resourceId: user._id,
    status: "success",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: user.getPublicProfile(),
    message: `Welcome back, ${user.firstName}!`,
  });
});

// @desc    Google Authentication
// @route   POST /api/auth/google
// @access  Public
// @desc    Google OAuth Registration (Register Page Only)
// @route   POST /api/auth/google/register
// @access  Public
exports.googleRegister = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID token is required",
    });
  }

  try {
    const { verifyIdToken } = require("../config/firebase");
    const decodedToken = await verifyIdToken(idToken);
    const { email, name, picture, email_verified, uid } = decodedToken;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: "Please use a verified Google account",
      });
    }

    // user should NOT exist (this is registration)
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "An account with this email already exists. Please login instead.",
      });
    }

    // Create new user
    const [firstName, ...lastNameParts] = name.split(" ");
    const user = await User.create({
      firstName,
      lastName: lastNameParts.join(" ") || firstName,
      email: email.toLowerCase(),
      googleId: uid,
      authProvider: "google",
      profileImage: picture,
      isEmailVerified: true,
      isActive: true,
    });

    // Log creation
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: "USER_CREATED",
      resource: "user",
      resourceId: user._id,
      details: { method: "google_oauth_register" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Send welcome email
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Welcome to LILYTH!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; }
              .content { background: #f9f9f9; padding: 30px 20px; }
              .button { display: inline-block; background: #44465d; color: white; padding: 15px 30px; 
                       text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>LILYTH</h1>
                <h2>Welcome!</h2>
              </div>
              <div class="content">
                <p>Hi ${user.firstName},</p>
                <p>Thank you for registering with LILYTH! Your account has been successfully created using Google Sign-In.</p>
                
                <div style="text-align: center;">
                  <a href="${process.env.CLIENT_URL}/shop" class="button">Start Shopping</a>
                </div>

                <p>If you have any questions, feel free to reach out to us at any time.</p>
                
                <div class="footer">
                  <p>© 2025 LILYTH. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        notificationType: "system",
      });
      console.log(`✅ Welcome email sent to new Google user: ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: user.getPublicProfile(),
      message: `Welcome to LILYTH, ${user.firstName}!`,
    });
  } catch (error) {
    console.error("Google registration error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid Google credentials",
    });
  }
});

// @desc    Google OAuth Login (Login Page Only)
// @route   POST /api/auth/google/login
// @access  Public
exports.googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID token is required",
    });
  }

  try {
    const { verifyIdToken } = require("../config/firebase");
    const decodedToken = await verifyIdToken(idToken);
    const { email, uid } = decodedToken;

    // user MUST exist (this is login)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please register first.",
      });
    }

    // check if account is active
    if (!user.isActive) {
      await auditLogger.log({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        action: "LOGIN_ATTEMPT",
        resource: "user",
        resourceId: user._id,
        status: "failure",
        details: {
          reason: "account_deactivated",
          method: "google_oauth_login",
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Update Google ID if not set
    if (!user.googleId) {
      user.googleId = uid;
      user.authProvider = "google";
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: "LOGIN_ATTEMPT",
      resource: "user",
      resourceId: user._id,
      status: "success",
      details: { method: "google_oauth_login" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: user.getPublicProfile(),
      message: `Welcome back, ${user.firstName}!`,
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid Google credentials",
    });
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email address",
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "No account found with this email address",
    });
  }

  try {
    // generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // hash and set to resetPasswordToken field
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // set expire time (15 minutes)
    user.passwordResetExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    console.log("\n📧 PASSWORD RESET DEBUG:");
    console.log("Email:", user.email);
    console.log("Reset Token:", resetToken);
    console.log("Token expires in 15 minutes\n");

    // use emailService.sendPasswordReset (already exists and works)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await emailService.sendPasswordReset(user, resetToken);
        console.log("✅ Password reset email sent successfully");
      } catch (emailError) {
        console.error("❌ Email send failed:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Password reset instructions have been sent to your email",
      // include these for development/testing
      ...(process.env.NODE_ENV === "development" && {
        resetToken,
        note: "Check server console for reset link (development mode)",
      }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    // clear reset fields if there was an error
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message:
        "Could not process password reset request. Please try again later.",
    });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { resettoken } = req.params;

  console.log("\n🔐 PASSWORD RESET DEBUG:");
  console.log("Reset token received:", resettoken);
  console.log("New password provided:", password ? "Yes" : "No");

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Please provide a new password",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  try {
    // get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resettoken)
      .digest("hex");

    console.log("Hashed token for lookup:", resetPasswordToken);

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpire: { $gt: Date.now() },
    });

    console.log("User found:", user ? user.email : "None");
    console.log(
      "Token expires:",
      user ? new Date(user.passwordResetExpire) : "N/A"
    );
    console.log("Current time:", new Date());

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token. Please request a new password reset.",
      });
    }

    // set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.lastLogin = new Date();
    await user.save();

    // generate login token
    const token = generateToken(user._id);

    console.log("Password reset successful for:", user.email);

    res.status(200).json({
      success: true,
      message: "Password reset successful! You are now logged in.",
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not reset password. Please try again.",
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.getPublicProfile(),
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
  };

  // allow email change with validation
  if (req.body.email && req.body.email !== user.email) {
    const newEmail = req.body.email.toLowerCase().trim();

    // check if email already exists
    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: req.user.id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email address is already registered to another account",
      });
    }

    // validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    fieldsToUpdate.email = newEmail;
  }

  // remove undefined fields
  Object.keys(fieldsToUpdate).forEach((key) => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    user: updatedUser.getPublicProfile(),
    message: "Profile updated successfully",
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+password");

  // check if this is a Google OAuth user
  if (user.authProvider === "google") {
    return res.status(400).json({
      success: false,
      message: "Cannot change password for Google-authenticated accounts",
    });
  }

  // check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    message: "Password updated successfully",
  });
});
