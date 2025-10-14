// scripts/seedData.js
require("dotenv").config();
const mongoose = require("mongoose");
const { User, Product, Category, Order, Review, Cart } = require("../models");
const { listIndexes } = require("../models/User");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    // Create categories
    console.log("Creating categories...");
    const categoryData = [
      {
        name: "Dresses",
        description: "Elegant dresses for all occasions",
        isFeatured: true,
        sortOrder: 1,
      },
      {
        name: "Activewear",
        description: "Comfortable and stylish workout clothing",
        isFeatured: true,
        sortOrder: 2,
      },
      {
        name: "Indo-Western",
        description: "Fusion of traditional and modern styles",
        isFeatured: true,
        sortOrder: 3,
      },
      {
        name: "Tops",
        description: "Stylish tops and blouses",
        isFeatured: true,
        sortOrder: 4,
      },
      {
        name: "Bottoms",
        description: "Pants, jeans, and skirts",
        sortOrder: 5,
      },
      {
        name: "Sleepwear",
        description: "Comfortable nightwear and loungewear",
        sortOrder: 6,
      },
      {
        name: "Cord Sets",
        description: "Coordinated outfit sets",
        sortOrder: 7,
      },
    ];

    const categories = [];
    for (const catData of categoryData) {
      const category = new Category(catData);
      category.slug = category.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const savedCategory = await category.save();
      categories.push(savedCategory);
      console.log(`Created category: ${savedCategory.name}`);
    }

    // Get category references
    const dressesCategory = categories.find((cat) => cat.name === "Dresses");
    const activewearCategory = categories.find(
      (cat) => cat.name === "Activewear"
    );
    const indoWesternCategory = categories.find(
      (cat) => cat.name === "Indo-Western"
    );
    const topsCategory = categories.find((cat) => cat.name === "Tops");
    const bottomsCategory = categories.find((cat) => cat.name === "Bottoms");
    const sleepwearCategory = categories.find(
      (cat) => cat.name === "Sleepwear"
    );
    const cordSetsCategory = categories.find((cat) => cat.name === "Cord Sets");

    // Create products
    console.log("Creating products...");

    const productsData = [
      // DRESSES
      {
        name: "Summer Floral Maxi Dress",
        description:
          "A flowing maxi dress with beautiful floral print, perfect for summer events and casual outings.",
        shortDescription: "Flowing floral maxi dress",
        brand: "LILYTH",
        category: dressesCategory._id,
        price: 2499,
        salePrice: 1999,
        sku: "DR001",
        variants: [
          {
            size: "S",
            color: { name: "Navy Blue", hexCode: "#000080" },
            stock: 15,
            variantSku: "DR001-S-NAVY",
          },
          {
            size: "M",
            color: { name: "Navy Blue", hexCode: "#000080" },
            stock: 20,
            variantSku: "DR001-M-NAVY",
          },
          {
            size: "L",
            color: { name: "Navy Blue", hexCode: "#000080" },
            stock: 12,
            variantSku: "DR001-L-NAVY",
          },
          {
            size: "S",
            color: { name: "Rose Pink", hexCode: "#FF69B4" },
            stock: 10,
            variantSku: "DR001-S-ROSE",
          },
          {
            size: "M",
            color: { name: "Rose Pink", hexCode: "#FF69B4" },
            stock: 18,
            variantSku: "DR001-M-ROSE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
            alt: "Summer Floral Maxi Dress",
            isPrimary: true,
          },
        ],
        materials: ["100% Cotton"],
        careInstructions: ["Machine wash cold", "Hang dry"],
        status: "active",
        isFeatured: true,
        isNewArrival: true,
        tags: ["summer", "floral", "maxi", "casual"],
      },
      {
        name: "Little Black Dress",
        description:
          "Classic little black dress perfect for evening events and formal occasions.",
        shortDescription: "Classic evening dress",
        brand: "LILYTH",
        category: dressesCategory._id,
        price: 3299,
        sku: "DR002",
        variants: [
          {
            size: "XS",
            color: { name: "Black", hexCode: "#000000" },
            stock: 8,
            variantSku: "DR002-XS-BLACK",
          },
          {
            size: "S",
            color: { name: "Black", hexCode: "#000000" },
            stock: 15,
            variantSku: "DR002-S-BLACK",
          },
          {
            size: "M",
            color: { name: "Black", hexCode: "#000000" },
            stock: 12,
            variantSku: "DR002-M-BLACK",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566479179817-c0ae4b8e4d77?w=500",
            alt: "Little Black Dress",
            isPrimary: true,
          },
        ],
        materials: ["95% Polyester", "5% Elastane"],
        status: "active",
        isFeatured: true,
        tags: ["black", "evening", "formal", "classic"],
      },
      {
        name: "Bohemian Midi Dress",
        description:
          "Free-spirited bohemian midi dress with intricate patterns and comfortable fit.",
        shortDescription: "Boho midi dress",
        brand: "LILYTH",
        category: dressesCategory._id,
        price: 2799,
        salePrice: 2399,
        sku: "DR003",
        variants: [
          {
            size: "S",
            color: { name: "Rust Orange", hexCode: "#CD5C5C" },
            stock: 10,
            variantSku: "DR003-S-RUST",
          },
          {
            size: "M",
            color: { name: "Rust Orange", hexCode: "#CD5C5C" },
            stock: 15,
            variantSku: "DR003-M-RUST",
          },
          {
            size: "L",
            color: { name: "Forest Green", hexCode: "#228B22" },
            stock: 12,
            variantSku: "DR003-L-GREEN",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500",
            alt: "Bohemian Midi Dress",
            isPrimary: true,
          },
        ],
        status: "active",
        tags: ["boho", "midi", "patterns", "casual"],
      },

      // ACTIVEWEAR
      {
        name: "High-Waist Yoga Leggings",
        description:
          "Premium high-waist yoga leggings with moisture-wicking technology and four-way stretch.",
        shortDescription: "Premium yoga leggings",
        brand: "LILYTH Active",
        category: activewearCategory._id,
        price: 1899,
        sku: "AC001",
        variants: [
          {
            size: "XS",
            color: { name: "Black", hexCode: "#000000" },
            stock: 20,
            variantSku: "AC001-XS-BLACK",
          },
          {
            size: "S",
            color: { name: "Black", hexCode: "#000000" },
            stock: 25,
            variantSku: "AC001-S-BLACK",
          },
          {
            size: "M",
            color: { name: "Navy Blue", hexCode: "#000080" },
            stock: 18,
            variantSku: "AC001-M-NAVY",
          },
          {
            size: "L",
            color: { name: "Charcoal", hexCode: "#36454F" },
            stock: 15,
            variantSku: "AC001-L-CHARCOAL",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1506629905607-d5b7caac4a83?w=500",
            alt: "Yoga Leggings",
            isPrimary: true,
          },
        ],
        materials: ["88% Nylon", "12% Spandex"],
        features: ["Moisture-wicking", "Four-way stretch", "High waist"],
        status: "active",
        isFeatured: true,
        tags: ["yoga", "leggings", "activewear", "fitness"],
      },
      {
        name: "Crop Sports Bra",
        description:
          "Supportive crop sports bra perfect for medium to high-intensity workouts.",
        shortDescription: "Supportive crop bra",
        brand: "LILYTH Active",
        category: activewearCategory._id,
        price: 1299,
        sku: "AC002",
        variants: [
          {
            size: "S",
            color: { name: "White", hexCode: "#FFFFFF" },
            stock: 15,
            variantSku: "AC002-S-WHITE",
          },
          {
            size: "M",
            color: { name: "Pink", hexCode: "#FFC0CB" },
            stock: 20,
            variantSku: "AC002-M-PINK",
          },
          {
            size: "L",
            color: { name: "Black", hexCode: "#000000" },
            stock: 18,
            variantSku: "AC002-L-BLACK",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500",
            alt: "Sports Bra",
            isPrimary: true,
          },
        ],
        status: "active",
        tags: ["sports bra", "workout", "support"],
      },

      // INDO-WESTERN
      {
        name: "Embroidered Tunic Top",
        description:
          "Beautiful embroidered tunic top blending traditional Indian motifs with contemporary cut.",
        shortDescription: "Embroidered fusion tunic",
        brand: "LILYTH Fusion",
        category: indoWesternCategory._id,
        price: 2199,
        sku: "IW001",
        variants: [
          {
            size: "S",
            color: { name: "Ivory", hexCode: "#FFFFF0" },
            stock: 12,
            variantSku: "IW001-S-IVORY",
          },
          {
            size: "M",
            color: { name: "Royal Blue", hexCode: "#4169E1" },
            stock: 15,
            variantSku: "IW001-M-ROYAL",
          },
          {
            size: "L",
            color: { name: "Maroon", hexCode: "#800000" },
            stock: 10,
            variantSku: "IW001-L-MAROON",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500",
            alt: "Embroidered Tunic",
            isPrimary: true,
          },
        ],
        materials: ["100% Cotton"],
        features: ["Hand embroidery", "Traditional motifs"],
        status: "active",
        isFeatured: true,
        tags: ["tunic", "embroidery", "fusion", "traditional"],
      },
      {
        name: "Palazzo Pants Set",
        description:
          "Comfortable palazzo pants with matching kurta top in contemporary Indo-Western style.",
        shortDescription: "Palazzo set",
        brand: "LILYTH Fusion",
        category: indoWesternCategory._id,
        price: 3499,
        salePrice: 2999,
        sku: "IW002",
        variants: [
          {
            size: "S",
            color: { name: "Mint Green", hexCode: "#98FB98" },
            stock: 8,
            variantSku: "IW002-S-MINT",
          },
          {
            size: "M",
            color: { name: "Peach", hexCode: "#FFCBA4" },
            stock: 12,
            variantSku: "IW002-M-PEACH",
          },
          {
            size: "L",
            color: { name: "Lavender", hexCode: "#E6E6FA" },
            stock: 10,
            variantSku: "IW002-L-LAVENDER",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1594736797933-d0bac92b0d97?w=500",
            alt: "Palazzo Set",
            isPrimary: true,
          },
        ],
        status: "active",
        tags: ["palazzo", "kurta", "set", "comfortable"],
      },

      // TOPS
      {
        name: "Classic White Button-Up Shirt",
        description:
          "Timeless white button-up shirt perfect for professional and casual wear.",
        shortDescription: "Classic white shirt",
        brand: "LILYTH Essentials",
        category: topsCategory._id,
        price: 1799,
        sku: "TP001",
        variants: [
          {
            size: "XS",
            color: { name: "White", hexCode: "#FFFFFF" },
            stock: 8,
            variantSku: "TP001-XS-WHITE",
          },
          {
            size: "S",
            color: { name: "White", hexCode: "#FFFFFF" },
            stock: 15,
            variantSku: "TP001-S-WHITE",
          },
          {
            size: "M",
            color: { name: "White", hexCode: "#FFFFFF" },
            stock: 20,
            variantSku: "TP001-M-WHITE",
          },
          {
            size: "L",
            color: { name: "White", hexCode: "#FFFFFF" },
            stock: 12,
            variantSku: "TP001-L-WHITE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500",
            alt: "White Button Shirt",
            isPrimary: true,
          },
        ],
        materials: ["97% Cotton", "3% Elastane"],
        status: "active",
        tags: ["shirt", "white", "professional", "classic"],
      },
      {
        name: "Silk Camisole Top",
        description:
          "Luxurious silk camisole top perfect for layering or wearing alone.",
        shortDescription: "Silk camisole",
        brand: "LILYTH Luxe",
        category: topsCategory._id,
        price: 2499,
        sku: "TP002",
        variants: [
          {
            size: "XS",
            color: { name: "Champagne", hexCode: "#F7E7CE" },
            stock: 5,
            variantSku: "TP002-XS-CHAMP",
          },
          {
            size: "S",
            color: { name: "Black", hexCode: "#000000" },
            stock: 10,
            variantSku: "TP002-S-BLACK",
          },
          {
            size: "M",
            color: { name: "Dusty Rose", hexCode: "#DCAE96" },
            stock: 8,
            variantSku: "TP002-M-ROSE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1559582234-8e3c3b6b7a3a?w=500",
            alt: "Silk Camisole",
            isPrimary: true,
          },
        ],
        materials: ["100% Mulberry Silk"],
        status: "active",
        isFeatured: true,
        tags: ["silk", "camisole", "luxury", "layering"],
      },

      // BOTTOMS
      {
        name: "High-Rise Skinny Jeans",
        description:
          "Premium high-rise skinny jeans with stretch for comfort and style.",
        shortDescription: "High-rise skinny jeans",
        brand: "LILYTH Denim",
        category: bottomsCategory._id,
        price: 2999,
        salePrice: 2499,
        sku: "BT001",
        variants: [
          {
            size: "0",
            color: { name: "Dark Wash", hexCode: "#1C2951" },
            stock: 12,
            variantSku: "BT001-0-DARK",
          },
          {
            size: "2",
            color: { name: "Dark Wash", hexCode: "#1C2951" },
            stock: 15,
            variantSku: "BT001-2-DARK",
          },
          {
            size: "4",
            color: { name: "Medium Wash", hexCode: "#4F6AA0" },
            stock: 18,
            variantSku: "BT001-4-MED",
          },
          {
            size: "6",
            color: { name: "Light Wash", hexCode: "#8BB8E8" },
            stock: 10,
            variantSku: "BT001-6-LIGHT",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1541840031508-326b77c9a17e?w=500",
            alt: "Skinny Jeans",
            isPrimary: true,
          },
        ],
        materials: ["99% Cotton", "1% Elastane"],
        status: "active",
        tags: ["jeans", "skinny", "high-rise", "denim"],
      },
      {
        name: "Flowy Midi Skirt",
        description:
          "Elegant flowy midi skirt perfect for both casual and dressy occasions.",
        shortDescription: "Flowy midi skirt",
        brand: "LILYTH",
        category: bottomsCategory._id,
        price: 1899,
        sku: "BT002",
        variants: [
          {
            size: "XS",
            color: { name: "Burgundy", hexCode: "#800020" },
            stock: 8,
            variantSku: "BT002-XS-BURG",
          },
          {
            size: "S",
            color: { name: "Navy Blue", hexCode: "#000080" },
            stock: 12,
            variantSku: "BT002-S-NAVY",
          },
          {
            size: "M",
            color: { name: "Olive Green", hexCode: "#808000" },
            stock: 15,
            variantSku: "BT002-M-OLIVE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583496661160-fb5886a13d74?w=500",
            alt: "Midi Skirt",
            isPrimary: true,
          },
        ],
        status: "active",
        tags: ["skirt", "midi", "flowy", "versatile"],
      },

      // SLEEPWEAR
      {
        name: "Cotton Pajama Set",
        description:
          "Comfortable 100% cotton pajama set perfect for a good night's sleep.",
        shortDescription: "Cotton pajama set",
        brand: "LILYTH Sleep",
        category: sleepwearCategory._id,
        price: 1999,
        sku: "SL001",
        variants: [
          {
            size: "S",
            color: { name: "Powder Blue", hexCode: "#B6D0E2" },
            stock: 10,
            variantSku: "SL001-S-BLUE",
          },
          {
            size: "M",
            color: { name: "Blush Pink", hexCode: "#F8C8DC" },
            stock: 15,
            variantSku: "SL001-M-PINK",
          },
          {
            size: "L",
            color: { name: "Sage Green", hexCode: "#9CAF88" },
            stock: 12,
            variantSku: "SL001-L-SAGE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500",
            alt: "Pajama Set",
            isPrimary: true,
          },
        ],
        materials: ["100% Cotton"],
        status: "active",
        tags: ["pajamas", "cotton", "comfort", "sleepwear"],
      },
      {
        name: "Silk Sleep Robe",
        description:
          "Luxurious silk sleep robe for ultimate comfort and elegance.",
        shortDescription: "Silk sleep robe",
        brand: "LILYTH Luxe",
        category: sleepwearCategory._id,
        price: 4499,
        sku: "SL002",
        variants: [
          {
            size: "S",
            color: { name: "Champagne", hexCode: "#F7E7CE" },
            stock: 5,
            variantSku: "SL002-S-CHAMP",
          },
          {
            size: "M",
            color: { name: "Deep Purple", hexCode: "#663399" },
            stock: 8,
            variantSku: "SL002-M-PURPLE",
          },
          {
            size: "L",
            color: { name: "Emerald", hexCode: "#50C878" },
            stock: 6,
            variantSku: "SL002-L-EMERALD",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=500",
            alt: "Silk Robe",
            isPrimary: true,
          },
        ],
        materials: ["100% Mulberry Silk"],
        status: "active",
        tags: ["robe", "silk", "luxury", "sleepwear"],
      },

      // CORD SETS
      {
        name: "Matching Knit Set",
        description:
          "Coordinated knit set with cropped top and high-waist pants.",
        shortDescription: "Matching knit co-ord",
        brand: "LILYTH Sets",
        category: cordSetsCategory._id,
        price: 3299,
        salePrice: 2799,
        sku: "CS001",
        variants: [
          {
            size: "S",
            color: { name: "Camel", hexCode: "#C19A6B" },
            stock: 10,
            variantSku: "CS001-S-CAMEL",
          },
          {
            size: "M",
            color: { name: "Cream", hexCode: "#FFFDD0" },
            stock: 12,
            variantSku: "CS001-M-CREAM",
          },
          {
            size: "L",
            color: { name: "Taupe", hexCode: "#483C32" },
            stock: 8,
            variantSku: "CS001-L-TAUPE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1594823996736-347bb0746b9c?w=500",
            alt: "Knit Co-ord Set",
            isPrimary: true,
          },
        ],
        materials: ["70% Cotton", "30% Polyester"],
        status: "active",
        isFeatured: true,
        tags: ["co-ord", "knit", "matching", "set"],
      },
      {
        name: "Linen Shirt and Shorts Set",
        description:
          "Breathable linen shirt and shorts set perfect for summer days.",
        shortDescription: "Linen co-ord set",
        brand: "LILYTH Sets",
        category: cordSetsCategory._id,
        price: 2799,
        sku: "CS002",
        variants: [
          {
            size: "XS",
            color: { name: "White", hexCode: "#FFFFFF" },
            stock: 6,
            variantSku: "CS002-XS-WHITE",
          },
          {
            size: "S",
            color: { name: "Khaki", hexCode: "#C3B091" },
            stock: 10,
            variantSku: "CS002-S-KHAKI",
          },
          {
            size: "M",
            color: { name: "Sage", hexCode: "#9CAF88" },
            stock: 12,
            variantSku: "CS002-M-SAGE",
          },
        ],
        images: [
          {
            url: "https://images.unsplash.com/photo-1571513722275-4b9d9ac24fb2?w=500",
            alt: "Linen Set",
            isPrimary: true,
          },
        ],
        materials: ["100% Linen"],
        status: "active",
        tags: ["linen", "summer", "breathable", "co-ord"],
      },
    ];

    // Create products with proper slugs
    const products = [];
    for (const productData of productsData) {
      const product = new Product(productData);
      product.slug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const savedProduct = await product.save();
      products.push(savedProduct);
      console.log(`Created product: ${savedProduct.name}`);
    }

    // Create admin user
    console.log("Creating admin user...");
    const adminUser = await User.create({
      firstName: "Admin",
      lastName: "LILYTH",
      email: "admin@lilyth.com",
      password: "admin123",
      role: "admin",
      isEmailVerified: true,
      addresses: [
        {
          type: "both",
          firstName: "Admin",
          lastName: "LILYTH",
          addressLine1: "MG Road",
          city: "Ernakulam",
          state: "Kerala",
          postalCode: "682035",
          country: "India",
          isDefault: true,
        },
      ],
    });

    // Create test customer
    console.log("Creating test customer...");
    const testCustomer = await User.create({
      firstName: "Priya",
      lastName: "Nair",
      email: "priya@example.com",
      password: "customer123",
      role: "customer",
      isEmailVerified: true,
      addresses: [
        {
          type: "both",
          firstName: "Priya",
          lastName: "Nair",
          addressLine1: "Panampilly Nagar",
          city: "Kochi",
          state: "Kerala",
          postalCode: "682036",
          country: "India",
          isDefault: true,
        },
      ],
      wishlist: [products[0]._id, products[1]._id],
      preferredSizes: [
        { category: "dresses", size: "M" },
        { category: "tops", size: "S" },
      ],
    });

    console.log("Seed data created successfully!");
    console.log(`- ${categories.length} categories`);
    console.log(`- ${products.length} products`);
    console.log("- 1 admin user (admin@lilyth.com / admin123)");
    console.log("- 1 test customer (priya@example.com / customer123)");
  } catch (error) {
    console.error("Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

seedData();
