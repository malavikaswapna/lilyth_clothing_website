// controllers/authController.js
const User = require('../models/User'); 
const asyncHandler = require('../utils/asyncHandler'); 
const generateToken = require('../utils/generateToken'); 
const crypto = require('crypto'); 
const nodemailer = require('nodemailer'); 
const emailService = require('../utils/emailService');
const { auditLogger } = require('../utils/auditLogger');

// Email transporter setup 
const createEmailTransporter = () => { 
  return nodemailer.createTransport({ 
    service: 'gmail', 
    auth: { 
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS 
    } 
  }); 
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email: email.toLowerCase() });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email address'
    });
  }

  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(emailVerificationToken)
    .digest('hex');

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    authProvider: 'local',
    emailVerificationToken: hashedToken,
    emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  // Send verification email
  await emailService.sendVerificationEmail(user, emailVerificationToken);

  // Log audit trail
  await auditLogger.log({
    userId: user._id,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    action: 'USER_CREATED',
    resource: 'user',
    resourceId: user._id,
    details: { method: 'email_registration' },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: user.getPublicProfile(),
    message: `Welcome to LILYTH, ${user.firstName}! Please check your email to verify your account.`
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token'
    });
  }

  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // Log audit trail
  await auditLogger.log({
    userId: user._id,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    action: 'EMAIL_VERIFIED',
    resource: 'user',
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully!'
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
      message: 'User not found'
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email already verified'
    });
  }

  // Generate new verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(emailVerificationToken)
    .digest('hex');

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  // Send verification email
  await emailService.sendVerificationEmail(user, emailVerificationToken);

  res.status(200).json({
    success: true,
    message: 'Verification email sent!'
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
      message: 'Please provide an email and password'
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    // Log failed attempt
    await auditLogger.log({
      userId: null,
      userEmail: email,
      action: 'LOGIN_ATTEMPT',
      resource: 'user',
      status: 'failure',
      details: { reason: 'user_not_found' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    // Log failed attempt
    await auditLogger.log({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: 'LOGIN_ATTEMPT',
      resource: 'user',
      resourceId: user._id,
      status: 'failure',
      details: { reason: 'invalid_password' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Log successful login
  await auditLogger.log({
    userId: user._id,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    action: 'LOGIN_ATTEMPT',
    resource: 'user',
    resourceId: user._id,
    status: 'success',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: user.getPublicProfile(),
    message: `Welcome back, ${user.firstName}!`
  });
});

// @desc    Google Authentication
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'Google ID token is required'
    });
  }

  try {
    const { verifyIdToken } = require('../config/firebase');
    const decodedToken = await verifyIdToken(idToken);
    const { email, name, picture, email_verified, uid } = decodedToken;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified with Google'
      });
    }

    // Split name into first and last name
    const nameParts = name ? name.split(' ') : ['User', ''];
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Update existing user
      user.lastLogin = new Date();
      user.isEmailVerified = true;
      
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      
      // Update Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
      }
      
      await user.save();

      // Log login
      await auditLogger.log({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        action: 'LOGIN_ATTEMPT',
        resource: 'user',
        resourceId: user._id,
        status: 'success',
        details: { method: 'google_oauth' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } else {
      // Create new user
      user = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: require('crypto').randomBytes(32).toString('hex'), // Random password
        isEmailVerified: true,
        avatar: picture,
        authProvider: 'google',
        firebaseUid: uid
      });

      // Log registration
      await auditLogger.log({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        action: 'USER_CREATED',
        resource: 'user',
        resourceId: user._id,
        details: { method: 'google_oauth' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: user.getPublicProfile(),
      message: `Welcome ${user.firstName}!`
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid Google authentication'
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
      message: 'Please provide an email address'
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if email exists or not for security
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link'
    });
  }

  // Don't allow password reset for Google OAuth users
  if (user.authProvider === 'google') {
    return res.status(400).json({
      success: false,
      message: 'This account uses Google Sign-In. Please sign in with Google instead.'
    });
  }

  try {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire time (15 minutes)
    user.passwordResetExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    console.log('\n📧 PASSWORD RESET DEBUG:');
    console.log('Email:', user.email);
    console.log('Reset Token:', resetToken);
    console.log('Reset URL:', resetUrl);
    console.log('Token expires in 15 minutes\n');

    // Try to send email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        
        const htmlMessage = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #44465d; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
              .button { 
                display: inline-block; 
                background: #44465d; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
                font-weight: bold;
              }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AMOURA</h1>
                <h2>Password Reset Request</h2>
              </div>
              <div class="content">
                <p>Hi ${user.firstName},</p>
                <p>You requested a password reset for your AMOURA account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p><strong>This link will expire in 15 minutes for security.</strong></p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>Or copy and paste this link into your browser: ${resetUrl}</p>
                <div class="footer">
                  <p>Best regards,<br>The AMOURA Team</p>
                  <p>© 2024 AMOURA. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `"AMOURA" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Password Reset Request - AMOURA',
          html: htmlMessage
        });

        console.log('✅ Email sent successfully');
      } catch (emailError) {
        console.error('❌ Email send failed:', emailError);
        // Continue anyway - don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions have been sent to your email',
      // Include these for development/testing
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken, 
        resetUrl,
        note: 'Check server console for reset link (development mode)'
      })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Clear reset fields if there was an error
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message: 'Could not process password reset request. Please try again later.'
    });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { resettoken } = req.params;

  console.log('\n🔐 PASSWORD RESET DEBUG:');
  console.log('Reset token received:', resettoken);
  console.log('New password provided:', password ? 'Yes' : 'No');

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a new password'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');

    console.log('Hashed token for lookup:', resetPasswordToken);

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpire: { $gt: Date.now() }
    });

    console.log('User found:', user ? user.email : 'None');
    console.log('Token expires:', user ? new Date(user.passwordResetExpire) : 'N/A');
    console.log('Current time:', new Date());

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate login token
    const token = generateToken(user._id);

    console.log('Password reset successful for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You are now logged in.',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not reset password. Please try again.'
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.getPublicProfile()
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    user: user.getPublicProfile(),
    message: 'Profile updated successfully'
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check if this is a Google OAuth user
  if (user.authProvider === 'google') {
    return res.status(400).json({
      success: false,
      message: 'Cannot change password for Google-authenticated accounts'
    });
  }

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    message: 'Password updated successfully'
  });
});