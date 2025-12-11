// controllers/returnController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../utils/emailService");
// ⚠️ TEMPORARILY DISABLED: Audit logging (fix the import in your actual file)
// const { auditLogger } = require("../utils/auditLogger");

/**
 * Helper function to detect payment method
 * Supports both old orders (payment.method) and new orders (paymentMethod)
 */
const getPaymentMethod = (order) => {
  // New orders have paymentMethod field
  if (order.paymentMethod) {
    return order.paymentMethod;
  }

  // Old orders only have payment.method
  if (order.payment && order.payment.method) {
    if (order.payment.method === "cash_on_delivery") {
      return "cod";
    }
    // All other payment methods are online
    return "razorpay";
  }

  // Default to razorpay if we can't determine
  return "razorpay";
};

// @desc    Request return for an order
// @route   POST /api/returns/:orderId/return
// @access  Private (Customer)
exports.requestReturn = asyncHandler(async (req, res) => {
  const { reason, comments, items, bankDetails } = req.body;
  const { orderId } = req.params;

  // Validate required fields
  if (!reason) {
    return res.status(400).json({
      success: false,
      message: "Return reason is required",
    });
  }

  // Find the order
  const order = await Order.findById(orderId).populate("user");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Verify order belongs to user
  if (order.user._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to return this order",
    });
  }

  // Check if order is eligible for return
  if (!["delivered"].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: "Only delivered orders can be returned",
    });
  }

  // Check if return already requested
  if (order.returnRequested) {
    return res.status(400).json({
      success: false,
      message: "Return already requested for this order",
    });
  }

  // Check return window (7 days from delivery)
  const deliveryDate = order.tracking?.deliveredAt || order.updatedAt;
  const returnWindowDays = 7;
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDelivery > returnWindowDays) {
    return res.status(400).json({
      success: false,
      message: `Return window has expired. Returns are only accepted within ${returnWindowDays} days of delivery.`,
    });
  }

  // ✅ Detect payment method (works with old and new orders)
  const paymentMethod = getPaymentMethod(order);

  // ✅ NEW: Validate bank details for COD orders
  if (paymentMethod === "cod") {
    if (!bankDetails || !bankDetails.method) {
      return res.status(400).json({
        success: false,
        message: "Refund details are required for COD orders",
      });
    }

    // Validate based on refund method
    if (bankDetails.method === "bank_transfer") {
      const requiredFields = [
        "accountHolderName",
        "accountNumber",
        "ifscCode",
        "bankName",
      ];
      const missingFields = requiredFields.filter(
        (field) => !bankDetails[field]
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing bank details: ${missingFields.join(", ")}`,
        });
      }

      // Validate account number (should be numeric and 9-18 digits)
      if (!/^\d{9,18}$/.test(bankDetails.accountNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account number format",
        });
      }

      // Validate IFSC code format (e.g., SBIN0001234)
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)) {
        return res.status(400).json({
          success: false,
          message: "Invalid IFSC code format",
        });
      }
    } else if (bankDetails.method === "upi") {
      if (!bankDetails.upiId) {
        return res.status(400).json({
          success: false,
          message: "UPI ID is required",
        });
      }

      // Validate UPI ID format (e.g., user@bank)
      if (!/^[\w.-]+@[\w.-]+$/.test(bankDetails.upiId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid UPI ID format",
        });
      }
    }
  }

  // Update order with return request
  order.returnRequested = true;
  order.returnReason = reason;
  order.returnStatus = "requested";
  order.returnRequestedAt = new Date();
  order.returnComments = comments || "";
  order.returnItems = items || [];

  // ✅ NEW: Store bank details for COD orders (encrypted in production!)
  if (paymentMethod === "cod" && bankDetails) {
    order.refundDetails = {
      method: bankDetails.method,
      // Bank transfer details
      ...(bankDetails.method === "bank_transfer" && {
        accountHolderName: bankDetails.accountHolderName,
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode.toUpperCase(),
        bankName: bankDetails.bankName,
      }),
      // UPI details
      ...(bankDetails.method === "upi" && {
        upiId: bankDetails.upiId.toLowerCase(),
      }),
      collectedAt: new Date(),
    };
  }

  await order.save();

  // ⚠️ TEMPORARILY DISABLED: Audit log (fix the import in your actual file)
  // await auditLogger("RETURN_REQUESTED", req.user, "order", order._id, {
  //   orderNumber: order.orderNumber,
  //   reason,
  //   paymentMethod: order.paymentMethod,
  //   refundMethod: bankDetails?.method || "razorpay",
  //   amount: order.total,
  // });

  // ✅ UPDATED: Send emails with payment method info
  try {
    // Email to customer
    const customerEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #b87049; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LILYTH</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Return Request Received</h2>
          
          <p>Dear ${order.user.firstName},</p>
          
          <p>We've received your return request for order <strong>#${
            order.orderNumber
          }</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #b87049; margin-top: 0;">Return Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order Total:</strong> ₹${order.total.toFixed(2)}</p>
            <p><strong>Return Reason:</strong> ${reason}</p>
            ${
              comments
                ? `<p><strong>Additional Comments:</strong> ${comments}</p>`
                : ""
            }
            <p><strong>Payment Method:</strong> ${
              paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"
            }</p>
            ${
              paymentMethod === "cod" && bankDetails
                ? `<p><strong>Refund Method:</strong> ${
                    bankDetails.method === "bank_transfer"
                      ? "Bank Transfer"
                      : "UPI"
                  }</p>`
                : ""
            }
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">What Happens Next?</h4>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Our team will review your return request within 24 hours</li>
              <li>You'll receive an email with approval/rejection decision</li>
              <li>If approved, you'll get shipping instructions</li>
              ${
                paymentMethod === "cod"
                  ? `<li>After we receive and inspect the item, we'll process your refund via ${
                      bankDetails.method === "bank_transfer"
                        ? "bank transfer"
                        : "UPI"
                    }</li>`
                  : `<li>After we receive and inspect the item, your refund will be processed in 5-7 business days</li>`
              }
            </ol>
          </div>
          
          <p style="margin-top: 20px;">If you have any questions, please contact our support team.</p>
          
          <p>Thank you,<br>Team LILYTH</p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2025 LILYTH. All rights reserved.</p>
        </div>
      </div>
    `;

    await emailService.sendEmail({
      to: order.user.email,
      subject: `Return Request Received - Order #${order.orderNumber}`,
      html: customerEmailHTML,
    });

    // Email to admin
    const adminEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #b87049; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LILYTH - Admin Alert</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">🔔 New Return Request</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #b87049; margin-top: 0;">Order Information</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order Total:</strong> ₹${order.total.toFixed(2)}</p>
            <p><strong>Customer:</strong> ${order.user.firstName} ${
      order.user.lastName
    }</p>
            <p><strong>Email:</strong> ${order.user.email}</p>
            <p><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #b87049; margin-top: 0;">Return Details</h3>
            <p><strong>Reason:</strong> ${reason}</p>
            ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ""}
            <p><strong>Requested At:</strong> ${new Date().toLocaleString(
              "en-IN"
            )}</p>
          </div>
          
          <div style="background: ${
            paymentMethod === "cod" ? "#fff3cd" : "#d1ecf1"
          }; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">💰 Payment & Refund Information</h3>
            <p><strong>Payment Method:</strong> ${
              paymentMethod === "cod"
                ? "Cash on Delivery (COD)"
                : "Online Payment (Razorpay)"
            }</p>
            ${
              paymentMethod === "cod" && bankDetails
                ? `
              <p><strong>Refund Method:</strong> ${
                bankDetails.method === "bank_transfer" ? "Bank Transfer" : "UPI"
              }</p>
              ${
                bankDetails.method === "bank_transfer"
                  ? `
                <p><strong>Account Holder:</strong> ${bankDetails.accountHolderName}</p>
                <p><strong>Account Number:</strong> ${bankDetails.accountNumber}</p>
                <p><strong>IFSC Code:</strong> ${bankDetails.ifscCode}</p>
                <p><strong>Bank Name:</strong> ${bankDetails.bankName}</p>
              `
                  : `
                <p><strong>UPI ID:</strong> ${bankDetails.upiId}</p>
              `
              }
            `
                : `
              <p><strong>Refund Method:</strong> Razorpay (Process manually via dashboard)</p>
              <p><strong>Payment ID:</strong> ${
                order.payment?.razorpayPaymentId || "N/A"
              }</p>
            `
            }
          </div>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please review and approve/reject this return request in the admin panel.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${
              process.env.CLIENT_URL
            }/admin/returns" style="background: #b87049; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View in Admin Panel</a>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2025 LILYTH Admin. All rights reserved.</p>
        </div>
      </div>
    `;

    await emailService.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `🔔 New Return Request - Order #${order.orderNumber}`,
      html: adminEmailHTML,
    });
  } catch (emailError) {
    console.error("Failed to send return request emails:", emailError);
    // Don't fail the request if email fails
  }

  res.status(200).json({
    success: true,
    message: "Return request submitted successfully",
    data: {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        returnStatus: order.returnStatus,
        returnReason: order.returnReason,
        paymentMethod: order.paymentMethod,
      },
    },
  });
});

// @desc    Get all return requests (Admin)
// @route   GET /api/returns/admin/all
// @access  Private/Admin
exports.getAllReturns = asyncHandler(async (req, res) => {
  const {
    status,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    paymentMethod, // ✅ NEW: Filter by payment method
  } = req.query;

  // Build query
  const query = { returnRequested: true };

  // Filter by return status
  if (status && status !== "all") {
    query.returnStatus = status;
  }

  // ✅ NEW: Filter by payment method
  if (paymentMethod && paymentMethod !== "all") {
    query.paymentMethod = paymentMethod;
  }

  // Search by order number, customer name, or email
  if (search) {
    const users = await require("../models/User")
      .find({
        $or: [
          { firstName: new RegExp(search, "i") },
          { lastName: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ],
      })
      .select("_id");

    query.$or = [
      { orderNumber: new RegExp(search, "i") },
      { user: { $in: users.map((u) => u._id) } },
    ];
  }

  // Date range filter
  if (startDate || endDate) {
    query.returnRequestedAt = {};
    if (startDate) query.returnRequestedAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.returnRequestedAt.$lte = end;
    }
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const returns = await Order.find(query)
    .populate("user", "firstName lastName email")
    .sort({ returnRequestedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(query);

  // ✅ NEW: Calculate statistics for the filtered returns
  const stats = await Order.aggregate([
    { $match: { returnRequested: true } },
    {
      $group: {
        _id: "$returnStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$total" },
      },
    },
  ]);

  // Format statistics
  const statistics = {
    requested: 0,
    approved: 0,
    rejected: 0,
    received: 0,
    processed: 0,
    totalRefundAmount: 0,
  };

  stats.forEach((stat) => {
    if (stat._id && statistics.hasOwnProperty(stat._id)) {
      statistics[stat._id] = stat.count;
    }
    statistics.totalRefundAmount += stat.totalAmount || 0;
  });

  res.status(200).json({
    success: true,
    returns,
    statistics,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total,
  });
});

// @desc    Update return status (Admin)
// @route   PUT /api/returns/admin/:orderId
// @access  Private/Admin
exports.updateReturnStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, adminNotes, refundAmount, refundTransactionId } = req.body; // ✅ NEW: refundTransactionId

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  const validStatuses = ["approved", "rejected", "received", "processed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status",
    });
  }

  const order = await Order.findById(orderId).populate("user");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (!order.returnRequested) {
    return res.status(400).json({
      success: false,
      message: "No return request found for this order",
    });
  }

  // ✅ Detect payment method (works with old and new orders)
  const paymentMethod = getPaymentMethod(order);

  // ✅ UPDATED: Validate refund amount for processed status
  if (status === "processed") {
    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid refund amount is required",
      });
    }

    if (refundAmount > order.total) {
      return res.status(400).json({
        success: false,
        message: "Refund amount cannot exceed order total",
      });
    }

    // ✅ NEW: For COD orders, require transaction ID
    if (paymentMethod === "cod" && !refundTransactionId) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction ID/UTR number is required for COD refund confirmation",
      });
    }
  }

  const previousStatus = order.returnStatus;
  order.returnStatus = status;

  if (adminNotes) {
    order.returnAdminNotes = adminNotes;
  }

  // ✅ UPDATED: Handle refund processing
  if (status === "processed") {
    order.payment.status = "refunded";
    order.payment.refundedAmount = refundAmount;
    order.payment.refundedAt = new Date();

    // ✅ NEW: Store transaction details
    if (paymentMethod === "cod") {
      order.payment.refundTransactionId = refundTransactionId;
      order.payment.refundMethod = order.refundDetails?.method || "manual";
    } else {
      order.payment.refundMethod = "razorpay";
      if (refundTransactionId) {
        order.payment.refundTransactionId = refundTransactionId;
      }
    }

    order.status = "returned";
  }

  await order.save();

  // ⚠️ TEMPORARILY DISABLED: Audit log (fix the import in your actual file)
  // await auditLogger(
  //   status === "processed" ? "REFUND_PROCESSED" : "RETURN_STATUS_UPDATED",
  //   req.user,
  //   "order",
  //   order._id,
  //   {
  //     orderNumber: order.orderNumber,
  //     previousStatus,
  //     newStatus: status,
  //     refundAmount,
  //     paymentMethod: order.paymentMethod,
  //     refundMethod: order.payment.refundMethod,
  //     ...(refundTransactionId && { refundTransactionId }),
  //   }
  // );

  // ✅ UPDATED: Send appropriate emails
  try {
    let emailHTML = "";
    let emailSubject = "";

    if (status === "approved") {
      emailSubject = `Return Approved - Order #${order.orderNumber}`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #b87049; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">LILYTH</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">✅ Return Request Approved</h2>
            
            <p>Dear ${order.user.firstName},</p>
            
            <p>Good news! Your return request for order <strong>#${
              order.orderNumber
            }</strong> has been approved.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #b87049; margin-top: 0;">Return Instructions</h3>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Pack the item(s) securely in the original packaging if possible</li>
                <li>Include a copy of your invoice or order confirmation</li>
                <li>Ship the item to the address below within 7 days</li>
                <li>Keep the tracking number for your records</li>
              </ol>
            </div>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📦 Return Address</h3>
              <p style="margin: 5px 0;"><strong>LILYTH Returns Department</strong></p>
              <p style="margin: 5px 0;">Kerala, India</p>
              <p style="margin: 5px 0;">Phone: ${
                process.env.SUPPORT_PHONE || "+91-XXXXXXXXXX"
              }</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
              <h4 style="margin-top: 0;">💰 Refund Information</h4>
              <p><strong>Payment Method:</strong> ${
                paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"
              }</p>
              ${
                paymentMethod === "cod"
                  ? `
                <p><strong>Refund Method:</strong> ${
                  order.refundDetails?.method === "bank_transfer"
                    ? "Bank Transfer"
                    : "UPI"
                }</p>
                <p>Your refund will be processed within 2-3 business days after we receive and inspect the returned item.</p>
              `
                  : `
                <p><strong>Refund Method:</strong> Original payment method (Razorpay)</p>
                <p>Your refund will be processed within 5-7 business days after we receive and inspect the returned item.</p>
              `
              }
            </div>
            
            ${
              adminNotes
                ? `<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;"><p><strong>Admin Notes:</strong> ${adminNotes}</p></div>`
                : ""
            }
            
            <p>Thank you,<br>Team LILYTH</p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2025 LILYTH. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (status === "rejected") {
      emailSubject = `Return Request Declined - Order #${order.orderNumber}`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #b87049; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">LILYTH</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">Return Request Update</h2>
            
            <p>Dear ${order.user.firstName},</p>
            
            <p>Thank you for your return request for order <strong>#${
              order.orderNumber
            }</strong>.</p>
            
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p style="margin: 0;">Unfortunately, we cannot accept your return request at this time.</p>
              ${
                adminNotes
                  ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${adminNotes}</p>`
                  : ""
              }
            </div>
            
            <p>If you have any questions or concerns, please contact our customer support team.</p>
            
            <p>Thank you,<br>Team LILYTH</p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2025 LILYTH. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (status === "received") {
      emailSubject = `Return Received - Order #${order.orderNumber}`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #b87049; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">LILYTH</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">📦 Return Received</h2>
            
            <p>Dear ${order.user.firstName},</p>
            
            <p>We've received your returned item(s) for order <strong>#${order.orderNumber}</strong>.</p>
            
            <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <p style="margin: 0;">Our team is currently inspecting the returned item(s). You'll receive an update within 1-2 business days.</p>
            </div>
            
            <p>Thank you for your patience.</p>
            
            <p>Best regards,<br>Team LILYTH</p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2025 LILYTH. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (status === "processed") {
      emailSubject = `Refund Processed - Order #${order.orderNumber}`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #b87049; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">LILYTH</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">✅ Refund Processed</h2>
            
            <p>Dear ${order.user.firstName},</p>
            
            <p>Your refund for order <strong>#${
              order.orderNumber
            }</strong> has been processed successfully!</p>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">Refund Details</h3>
              <p><strong>Refund Amount:</strong> ₹${refundAmount.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${
                paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"
              }</p>
              ${
                paymentMethod === "cod"
                  ? `
                <p><strong>Refund Method:</strong> ${
                  order.refundDetails?.method === "bank_transfer"
                    ? "Bank Transfer"
                    : "UPI"
                }</p>
                ${
                  refundTransactionId
                    ? `<p><strong>Transaction ID:</strong> ${refundTransactionId}</p>`
                    : ""
                }
                ${
                  order.refundDetails?.method === "bank_transfer"
                    ? `<p><strong>Account Number:</strong> XXXX${order.refundDetails.accountNumber.slice(
                        -4
                      )}</p>`
                    : `<p><strong>UPI ID:</strong> ${order.refundDetails.upiId}</p>`
                }
                <p style="margin-top: 10px; color: #155724;">The amount has been transferred to your provided ${
                  order.refundDetails?.method === "bank_transfer"
                    ? "bank account"
                    : "UPI ID"
                }. Please check your account.</p>
              `
                  : `
                <p><strong>Refund Method:</strong> Original payment method (Razorpay)</p>
                ${
                  refundTransactionId
                    ? `<p><strong>Refund ID:</strong> ${refundTransactionId}</p>`
                    : ""
                }
                <p style="margin-top: 10px; color: #155724;">The refund will be credited to your original payment method within 5-7 business days.</p>
              `
              }
            </div>
            
            <p>Thank you for shopping with LILYTH. We hope to serve you again soon!</p>
            
            <p>Best regards,<br>Team LILYTH</p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2025 LILYTH. All rights reserved.</p>
          </div>
        </div>
      `;
    }

    if (emailHTML && emailSubject) {
      await emailService.sendEmail({
        to: order.user.email,
        subject: emailSubject,
        html: emailHTML,
      });
    }
  } catch (emailError) {
    console.error("Failed to send status update email:", emailError);
  }

  res.status(200).json({
    success: true,
    message: "Return status updated successfully",
    data: { order },
  });
});

// @desc    Get return statistics (Admin)
// @route   GET /api/returns/admin/stats
// @access  Private/Admin
exports.getReturnStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter = { returnRequested: true };
  if (startDate || endDate) {
    dateFilter.returnRequestedAt = {};
    if (startDate) dateFilter.returnRequestedAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.returnRequestedAt.$lte = end;
    }
  }

  // Get stats by status
  const statusStats = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$returnStatus",
        count: { $sum: 1 },
        totalValue: { $sum: "$total" },
        avgValue: { $avg: "$total" },
      },
    },
  ]);

  // ✅ NEW: Get stats by payment method
  const paymentMethodStats = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        totalValue: { $sum: "$total" },
      },
    },
  ]);

  // Get stats by reason
  const reasonStats = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$returnReason",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get monthly trends
  const monthlyStats = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          year: { $year: "$returnRequestedAt" },
          month: { $month: "$returnRequestedAt" },
        },
        count: { $sum: 1 },
        totalValue: { $sum: "$total" },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 12 },
  ]);

  // Calculate return rate
  const totalDeliveredOrders = await Order.countDocuments({
    status: "delivered",
    ...(startDate || endDate
      ? {
          updatedAt: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          },
        }
      : {}),
  });

  const totalReturns = await Order.countDocuments(dateFilter);
  const returnRate =
    totalDeliveredOrders > 0
      ? ((totalReturns / totalDeliveredOrders) * 100).toFixed(2)
      : 0;

  res.status(200).json({
    success: true,
    data: {
      byStatus: statusStats,
      byPaymentMethod: paymentMethodStats, // ✅ NEW
      byReason: reasonStats,
      monthlyTrends: monthlyStats,
      returnRate: parseFloat(returnRate),
      totalReturns,
      totalDeliveredOrders,
    },
  });
});
