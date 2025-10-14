//prevent NoSQL injection and optimize queries
const sanitizeQuery = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((key) => {
        if (key.startsWith("$")) {
          delete obj[key];
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      });
    }
    return obj;
  };

  req.query = sanitize(req.query);
  req.body = sanitize(req.body);
  req.params = sanitize(req.params);

  next();
};

module.exports = { sanitizeQuery };
