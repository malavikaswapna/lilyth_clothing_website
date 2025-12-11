// controllers/newsletterController.js
const Newsletter = require("../models/Newsletter");
const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../utils/emailService");
const { auditLogger } = require("../utils/auditLogger");
const { notifyAdminNewSubscriber } = require("./newsletterCampaignController");

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
exports.subscribe = asyncHandler(async (req, res) => {
  const { email, source = "footer" } = req.body;

  // validate email
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  try {
    // check if email already exists
    let subscriber = await Newsletter.findOne({
      email: email.toLowerCase().trim(),
    });

    if (subscriber) {
      if (subscriber.status === "subscribed") {
        return res.status(200).json({
          success: true,
          message: "You are already subscribed to our newsletter!",
          alreadySubscribed: true,
        });
      } else {
        // resubscribe
        await subscriber.resubscribe();

        // send welcome back email
        await emailService.sendNewsletterWelcome({
          email: subscriber.email,
          isReturning: true,
        });

        // notify admin about resubscriber
        await notifyAdminNewSubscriber(subscriber.email);

        return res.status(200).json({
          success: true,
          message:
            "Welcome back! You have been resubscribed to our newsletter.",
        });
      }
    }

    // create new subscriber
    subscriber = await Newsletter.create({
      email: email.toLowerCase().trim(),
      source,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        referrer: req.headers["referer"] || req.headers["referrer"],
      },
    });

    // send welcome email
    await emailService.sendNewsletterWelcome({
      email: subscriber.email,
      isReturning: false,
    });

    // notify admin about new subscriber
    await notifyAdminNewSubscriber(subscriber.email);

    // log the subscription
    await auditLogger.log({
      userId: null,
      action: "NEWSLETTER_SUBSCRIBE",
      resource: "newsletter",
      details: {
        email: subscriber.email,
        source,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      message:
        "Thank you for subscribing! Check your email for a welcome message.",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This email is already subscribed to our newsletter",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to subscribe. Please try again later.",
    });
  }
});

// @desc    Unsubscribe from newsletter
// @route   POST /api/newsletter/unsubscribe
// @access  Public
exports.unsubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const subscriber = await Newsletter.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!subscriber) {
    return res.status(404).json({
      success: false,
      message: "Email not found in our subscription list",
    });
  }

  if (subscriber.status === "unsubscribed") {
    return res.status(200).json({
      success: true,
      message: "You are already unsubscribed",
    });
  }

  await subscriber.unsubscribe();

  // log the unsubscription
  await auditLogger.log({
    userId: null,
    action: "NEWSLETTER_UNSUBSCRIBE",
    resource: "newsletter",
    details: {
      email: subscriber.email,
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: "You have been unsubscribed from our newsletter",
  });
});

// @desc    Get newsletter statistics (Admin only)
// @route   GET /api/admin/newsletter/stats
// @access  Private/Admin
exports.getNewsletterStats = asyncHandler(async (req, res) => {
  const totalSubscribers = await Newsletter.countDocuments({
    status: "subscribed",
  });
  const totalUnsubscribed = await Newsletter.countDocuments({
    status: "unsubscribed",
  });

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const monthlySubscribers = await Newsletter.countDocuments({
    status: "subscribed",
    subscribedAt: { $gte: thisMonth },
  });

  // get subscribers by source
  const bySource = await Newsletter.aggregate([
    { $match: { status: "subscribed" } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);

  // get recent subscribers
  const recentSubscribers = await Newsletter.find({ status: "subscribed" })
    .sort({ subscribedAt: -1 })
    .limit(10)
    .select("email subscribedAt source");

  res.status(200).json({
    success: true,
    stats: {
      totalSubscribers,
      totalUnsubscribed,
      monthlySubscribers,
      bySource,
      recentSubscribers,
    },
  });
});

// @desc    Get all subscribers (Admin only)
// @route   GET /api/admin/newsletter/subscribers
// @access  Private/Admin
exports.getAllSubscribers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || "subscribed";
  const skip = (page - 1) * limit;

  const query = status === "all" ? {} : { status };

  const subscribers = await Newsletter.find(query)
    .sort({ subscribedAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Newsletter.countDocuments(query);

  res.status(200).json({
    success: true,
    subscribers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Export subscribers (Admin only)
// @route   GET /api/admin/newsletter/export
// @access  Private/Admin
exports.exportSubscribers = asyncHandler(async (req, res) => {
  const status = req.query.status || "subscribed";
  const query = status === "all" ? {} : { status };

  const subscribers = await Newsletter.find(query)
    .select("email status subscribedAt source preferences")
    .sort({ subscribedAt: -1 });

  // convert to CSV
  const csvHeader =
    "Email,Status,Subscribed At,Source,New Arrivals,Sales,Exclusive Offers\n";
  const csvRows = subscribers
    .map((sub) => {
      return `${sub.email},${sub.status},${sub.subscribedAt.toISOString()},${
        sub.source
      },${sub.preferences.newArrivals},${sub.preferences.sales},${
        sub.preferences.exclusiveOffers
      }`;
    })
    .join("\n");

  const csv = csvHeader + csvRows;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=newsletter-subscribers-${Date.now()}.csv`
  );
  res.status(200).send(csv);
});
