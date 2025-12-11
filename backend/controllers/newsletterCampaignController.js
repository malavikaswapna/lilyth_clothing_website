// controllers/newsletterCampaignController.js
const Newsletter = require("../models/Newsletter");
const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../utils/emailService");
const { auditLogger } = require("../utils/auditLogger");

// @desc    Send newsletter campaign to all subscribers
// @route   POST /api/admin/newsletter/send-campaign
// @access  Private/Admin
exports.sendCampaign = asyncHandler(async (req, res) => {
  const { subject, message, campaignType, includedSubscribers } = req.body;

  // validation
  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Subject and message are required",
    });
  }

  // get subscribers based on filters
  let query = { status: "subscribed" };

  // if specific subscriber preferences
  if (campaignType === "newArrivals") {
    query["preferences.newArrivals"] = true;
  } else if (campaignType === "sales") {
    query["preferences.sales"] = true;
  } else if (campaignType === "exclusiveOffers") {
    query["preferences.exclusiveOffers"] = true;
  }

  // get all matching subscribers
  const subscribers = await Newsletter.find(query).select("email");

  if (subscribers.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No subscribers found matching the criteria",
    });
  }

  // send emails (in batches to avoid overwhelming the email server)
  let successCount = 0;
  let failCount = 0;
  const batchSize = 50;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          await emailService.sendNewsletterCampaign({
            email: subscriber.email,
            subject,
            message,
            campaignType,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          failCount++;
        }
      })
    );

    // wait 1 second between batches to avoid rate limits
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // log the campaign
  await auditLogger.log({
    userId: req.user._id,
    action: "NEWSLETTER_CAMPAIGN_SENT",
    resource: "newsletter",
    details: {
      subject,
      campaignType,
      totalSubscribers: subscribers.length,
      successCount,
      failCount,
    },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({
    success: true,
    message: `Campaign sent to ${successCount} subscribers`,
    stats: {
      totalSubscribers: subscribers.length,
      successCount,
      failCount,
    },
  });
});

// @desc    Send notification to admin about new subscriber
// @route   POST /api/newsletter/notify-admin (called internally)
// @access  Internal
exports.notifyAdminNewSubscriber = async (subscriberEmail) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    await emailService.sendEmail({
      to: adminEmail,
      subject: "🎉 New Newsletter Subscriber!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>🎉 New Newsletter Subscriber!</h1>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <p><strong>New subscriber:</strong> ${subscriberEmail}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p>Your newsletter list is growing! 🚀</p>
            <a href="${process.env.CLIENT_URL}/admin/newsletter" 
               style="display: inline-block; background: #10b981; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View All Subscribers
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to notify admin about new subscriber:", error);
  }
};

// @desc    Get campaign templates
// @route   GET /api/admin/newsletter/templates
// @access  Private/Admin
exports.getCampaignTemplates = asyncHandler(async (req, res) => {
  const templates = [
    {
      id: "new-arrivals",
      name: "New Arrivals Announcement",
      subject: "✨ New Arrivals at LILYTH!",
      type: "newArrivals",
      description:
        "Announce new products to subscribers interested in new arrivals",
      defaultMessage: `
        <h2>Check Out Our Latest Collection!</h2>
        <p>We've just added stunning new pieces to our collection that we think you'll love.</p>
        <p>From elegant dresses to comfortable everyday wear, there's something for everyone.</p>
        <p><a href="${process.env.CLIENT_URL}/shop?newArrivals=true" style="background: #c98b63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Shop New Arrivals</a></p>
      `,
    },
    {
      id: "sale-announcement",
      name: "Sale Announcement",
      subject: "🎉 SALE Alert - Up to 50% Off!",
      type: "sales",
      description: "Notify subscribers about ongoing or upcoming sales",
      defaultMessage: `
        <h2>Don't Miss Our Amazing Sale!</h2>
        <p>Get up to 50% off on selected items for a limited time only.</p>
        <p>Hurry, while stocks last!</p>
        <p><a href="${process.env.CLIENT_URL}/shop?onSale=true" style="background: #c98b63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Shop Sale Items</a></p>
      `,
    },
    {
      id: "exclusive-offer",
      name: "Exclusive Offer",
      subject: "🎁 Exclusive Offer Just For You!",
      type: "exclusiveOffers",
      description: "Send special offers to loyal subscribers",
      defaultMessage: `
        <h2>Exclusive Subscriber Offer!</h2>
        <p>As a valued subscriber, we're giving you early access to our special promotion.</p>
        <p>Use code <strong>SUBSCRIBER10</strong> for an extra 10% off your next purchase!</p>
        <p><a href="${process.env.CLIENT_URL}/shop" style="background: #c98b63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Start Shopping</a></p>
      `,
    },
    {
      id: "custom",
      name: "Custom Campaign",
      subject: "Your Custom Subject Here",
      type: "all",
      description: "Create your own custom campaign",
      defaultMessage: `
        <h2>Your Custom Message</h2>
        <p>Write your own custom message here...</p>
      `,
    },
  ];

  res.status(200).json({
    success: true,
    templates,
  });
});

// @desc    Preview campaign email
// @route   POST /api/admin/newsletter/preview
// @access  Private/Admin
exports.previewCampaign = asyncHandler(async (req, res) => {
  const { subject, message, campaignType } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Subject and message are required",
    });
  }

  // send preview to admin's email
  const adminEmail = req.user.email;

  await emailService.sendNewsletterCampaign({
    email: adminEmail,
    subject: `[PREVIEW] ${subject}`,
    message,
    campaignType,
    isPreview: true,
  });

  res.status(200).json({
    success: true,
    message: `Preview email sent to ${adminEmail}`,
  });
});

module.exports = exports;
