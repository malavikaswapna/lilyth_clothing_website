// controllers/contactController.js
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../utils/emailService');
const { auditLogger } = require('../utils/auditLogger');

// Contact form schema for validation
const contactValidation = {
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, pattern: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/ },
  subject: { required: true, minLength: 5, maxLength: 200 },
  message: { required: true, minLength: 10, maxLength: 2000 },
  phone: { required: false, pattern: /^\+?[\d\s-()]+$/ }
};

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message, orderNumber } = req.body;

  // Validate required fields
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!email || !contactValidation.email.pattern.test(email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!subject || subject.trim().length < 5) {
    errors.push('Subject must be at least 5 characters long');
  }
  
  if (!message || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  
  if (phone && !contactValidation.phone.pattern.test(phone)) {
    errors.push('Please provide a valid phone number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }

  try {
    // Send email to admin
    await emailService.sendContactFormEmail({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
      orderNumber: orderNumber ? orderNumber.trim() : null,
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send auto-reply to user
    await emailService.sendContactAutoReply({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim()
    });

    // Log for analytics
    await auditLogger.log({
      userId: null,
      action: 'CONTACT_FORM_SUBMITTED',
      resource: 'contact',
      details: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subject.trim(),
        hasPhone: !!phone,
        hasOrderNumber: !!orderNumber
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully! We\'ll get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Log the error
    await auditLogger.log({
      userId: null,
      action: 'CONTACT_FORM_ERROR',
      resource: 'contact',
      details: { error: error.message },
      status: 'failure',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later or contact us directly.'
    });
  }
});

// @desc    Get contact form statistics (Admin only)
// @route   GET /api/admin/contact/stats
// @access  Private/Admin
exports.getContactStats = asyncHandler(async (req, res) => {
  const { AuditLog } = require('../utils/auditLogger');
  
  const totalSubmissions = await AuditLog.countDocuments({
    action: 'CONTACT_FORM_SUBMITTED'
  });
  
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  
  const monthlySubmissions = await AuditLog.countDocuments({
    action: 'CONTACT_FORM_SUBMITTED',
    timestamp: { $gte: thisMonth }
  });
  
  const recentSubmissions = await AuditLog.find({
    action: 'CONTACT_FORM_SUBMITTED'
  })
    .sort({ timestamp: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    stats: {
      totalSubmissions,
      monthlySubmissions,
      recentSubmissions: recentSubmissions.map(log => ({
        name: log.details.name,
        email: log.details.email,
        subject: log.details.subject,
        submittedAt: log.timestamp
      }))
    }
  });
});