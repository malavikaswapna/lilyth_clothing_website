const fs = require("fs");
const path = require("path");

const logStream = fs.createWriteStream(
  path.join(__dirname, "../logs/access.log"),
  { flags: "a" }
);

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    logStream.write(JSON.stringify(log) + "\n");

    // log slow requests
    if (duration > 1000) {
      console.warn(
        `⚠️  Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`
      );
    }
  });

  next();
};

module.exports = { requestLogger };
