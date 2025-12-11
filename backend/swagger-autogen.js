// swagger-autogen.js
const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "LILYTH E-commerce API",
    description: "Kerala-focused women's fashion e-commerce platform API",
    version: "1.0.0",
    contact: {
      name: "LILYTH Support",
      email: "support@lilyth.in",
    },
  },
  host: "localhost:3001",
  schemes: ["http", "https"],
  basePath: "/",
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Enter your bearer token in the format: Bearer {token}",
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Authentication", description: "User authentication endpoints" },
    { name: "Products", description: "Product management" },
    { name: "Cart", description: "Shopping cart operations" },
    { name: "Orders", description: "Order management" },
    { name: "Users", description: "User profile management" },
    { name: "Reviews", description: "Product reviews" },
    { name: "Categories", description: "Product categories" },
    { name: "Payments", description: "Payment processing" },
    { name: "Promo Codes", description: "Promotional codes" },
    { name: "PIN Code", description: "Kerala PIN code validation" },
    { name: "Newsletter", description: "Newsletter subscriptions" },
    { name: "Contact", description: "Contact form" },
    { name: "Admin", description: "Admin operations" },
  ],
  definitions: {
    User: {
      _id: "507f1f77bcf86cd799439011",
      firstName: "Priya",
      lastName: "Kumar",
      email: "priya@example.com",
      phone: "+919876543210",
      role: "customer",
      isActive: true,
    },
    Product: {
      _id: "507f1f77bcf86cd799439011",
      name: "Elegant Cotton Kurta",
      description: "Beautiful handcrafted cotton kurta",
      price: 1499,
      salePrice: 1199,
      brand: "LILYTH Collection",
      status: "active",
      totalStock: 50,
      slug: "elegant-cotton-kurta",
    },
    Order: {
      _id: "507f1f77bcf86cd799439011",
      orderNumber: "000123",
      status: "confirmed",
      total: 3338,
      paymentMethod: "razorpay",
    },
    Error: {
      success: false,
      message: "Error message",
    },
  },
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"]; // Your main app file

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ Swagger documentation generated!");
  require("./server.js"); // Start server after generation
});
