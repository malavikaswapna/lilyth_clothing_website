const cron = require("node-cron");
const User = require("../models/User");
const Order = require("../models/Order");
const emailService = require("./emailService");

// Send weekly sales report
exports.sendWeeklySalesReport = async () => {
  try {
    // Get admin with sales reports enabled
    const admin = await User.findOne({
      role: "admin",
      "notificationSettings.salesReports": true,
    });

    if (!admin || !admin.email) {
      console.log("No admin subscribed to sales reports");
      return;
    }

    // Get last 7 days data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const orders = await Order.find({
      createdAt: { $gte: startDate },
      status: { $nin: ["cancelled"] },
    }).populate("user", "firstName lastName");

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top 5 orders
    const topOrders = orders
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(
        (o) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px;">#${o.orderNumber}</td>
          <td style="padding: 10px;">${o.user?.firstName || "Guest"}</td>
          <td style="padding: 10px; font-weight: bold;">₹${o.total.toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    await emailService.sendEmail({
      to: admin.email,
      subject: `📊 Weekly Sales Report - ${totalOrders} Orders`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8b5cf6; color: white; padding: 20px; text-align: center;">
            <h1>📊 Weekly Sales Report</h1>
            <p style="margin: 0;">
              ${startDate.toLocaleDateString()} - ${new Date().toLocaleDateString()}
            </p>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">₹${totalRevenue.toLocaleString()}</div>
                <div style="color: #6b7280; font-size: 14px;">Total Revenue</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${totalOrders}</div>
                <div style="color: #6b7280; font-size: 14px;">Total Orders</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">₹${Math.round(
                  avgOrderValue
                )}</div>
                <div style="color: #6b7280; font-size: 14px;">Avg Order Value</div>
              </div>
            </div>
            
            ${
              topOrders
                ? `
              <h3 style="color: #1f2937; margin-top: 20px;">Top Orders</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Order</th>
                    <th style="padding: 10px; text-align: left;">Customer</th>
                    <th style="padding: 10px; text-align: left;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${topOrders}
                </tbody>
              </table>
            `
                : ""
            }
            
            <a href="${process.env.CLIENT_URL}/admin/reports" 
               style="display: inline-block; background: #8b5cf6; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Full Report
            </a>
          </div>
        </div>
      `,
    });

    console.log(`✅ Weekly sales report sent to ${admin.email}`);
  } catch (error) {
    console.error("Weekly sales report error:", error);
  }
};

// Schedule weekly report (every Monday at 9 AM)
exports.scheduleWeeklySalesReport = () => {
  cron.schedule("0 9 * * 1", async () => {
    console.log("📊 Generating weekly sales report...");
    await this.sendWeeklySalesReport();
  });

  console.log("📅 Scheduled weekly sales reports for Monday 9:00 AM");
};
