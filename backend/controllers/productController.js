// controllers/productController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");

// Helper function to add no-cache headers
const addNoCacheHeaders = (res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
};

// Utility: safely parse JSON, return fallback on error
const safeJSONParse = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (err) {
    return fallback;
  }
};

// Extract arrays helper (handles indexed form fields, arrays, comma-separated string)
const extractArrayFromRequest = (req, fieldName) => {
  const out = [];

  // indexed fields: fieldName[0], fieldName[1], ...
  let idx = 0;
  while (req.body[`${fieldName}[${idx}]`]) {
    const v = req.body[`${fieldName}[${idx}]`];
    if (v && v.toString().trim()) out.push(v.toString().trim());
    idx++;
  }

  if (out.length > 0) return out;

  // direct array
  if (Array.isArray(req.body[fieldName])) {
    req.body[fieldName].forEach((v) => {
      if (v && v.toString().trim()) out.push(v.toString().trim());
    });
    return out;
  }

  // comma separated string or single string
  if (typeof req.body[fieldName] === "string") {
    const val = req.body[fieldName].trim();
    if (!val) return [];
    if (val.includes(",")) {
      return val
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [val];
  }

  return [];
};

// --------------------------------------------------------
// GET PRODUCTS
// --------------------------------------------------------
exports.getProducts = asyncHandler(async (req, res) => {
  addNoCacheHeaders(res);

  const query = {};

  // status logic
  if (req.user && req.user.role === "admin") {
    if (req.query.status) query.status = req.query.status;
  } else {
    query.status = "active";
  }

  // category (slug or id)
  if (req.query.category) {
    const cat = await Category.findOne({
      slug: req.query.category,
      isActive: true,
    });
    if (cat) query.category = cat._id;
    else if (mongoose.Types.ObjectId.isValid(req.query.category))
      query.category = req.query.category;
    else {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        pagination: {
          page: 1,
          pages: 0,
          limit: 12,
          hasNext: false,
          hasPrev: false,
        },
        products: [],
      });
    }
  }

  // other filters
  if (req.query.brand) query.brand = new RegExp(req.query.brand, "i");
  if (req.query.size) query["variants.size"] = req.query.size;
  if (req.query.color)
    query["variants.color.name"] = new RegExp(req.query.color, "i");
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
      { shortDescription: { $regex: req.query.search, $options: "i" } },
      { tags: { $in: [new RegExp(req.query.search, "i")] } },
    ];
  }
  if (req.query.featured === "true") query.isFeatured = true;
  if (req.query.newArrivals === "true") query.isNewArrival = true;
  if (req.query.onSale === "true")
    query.salePrice = { $exists: true, $ne: null };
  if (req.query.lowStock === "true") query.totalStock = { $lt: 10 };

  // date range
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate)
      query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt.$lt = endDate;
    }
  }

  // build query
  let mongooseQuery = Product.find(query).populate("category", "name slug");

  // sorting
  if (req.query.sort) {
    switch (req.query.sort) {
      case "price_low":
        mongooseQuery = mongooseQuery.sort({ price: 1 });
        break;
      case "price_high":
        mongooseQuery = mongooseQuery.sort({ price: -1 });
        break;
      case "newest":
        mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
        break;
      case "oldest":
        mongooseQuery = mongooseQuery.sort({ createdAt: 1 });
        break;
      case "popular":
        mongooseQuery = mongooseQuery.sort({ purchases: -1 });
        break;
      case "rating":
        mongooseQuery = mongooseQuery.sort({ averageRating: -1 });
        break;
      default:
        mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
    }
  } else {
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
  }

  // pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;
  mongooseQuery = mongooseQuery.skip(skip).limit(limit);

  try {
    const products = await mongooseQuery.lean().exec();
    const total = await Product.countDocuments(query);
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      products,
    });
  } catch (error) {
    console.error("Product query error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching products" });
  }
});

// --------------------------------------------------------
// GET SINGLE PRODUCT
// --------------------------------------------------------
exports.getProduct = asyncHandler(async (req, res) => {
  addNoCacheHeaders(res);

  const product = await Product.findById(req.params.id).populate(
    "category",
    "name slug"
  );
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });

  // hide non-active products for non-admins
  if (!(req.user && req.user.role === "admin") && product.status !== "active") {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  // recalc totalStock from variants if needed
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const recalculatedTotal = product.variants.reduce(
      (t, v) => t + (v.stock || 0),
      0
    );
    if (product.totalStock !== recalculatedTotal) {
      product.totalStock = recalculatedTotal;
      try {
        await product.save();
      } catch (e) {
        console.error("Error saving recalculated stock:", e);
      }
    }
  }

  // async increment views
  Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })
    .exec()
    .catch((e) => console.error("View increment error:", e));

  res.status(200).json({ success: true, product });
});

// --------------------------------------------------------
// GET BY SLUG
// --------------------------------------------------------
exports.getProductBySlug = asyncHandler(async (req, res) => {
  addNoCacheHeaders(res);
  const product = await Product.findOne({
    slug: req.params.slug,
    status: "active",
  }).populate("category", "name slug");
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  product.views = (product.views || 0) + 1;
  await product.save();
  res.status(200).json({ success: true, product });
});

// --------------------------------------------------------
// GET RELATED PRODUCTS
// --------------------------------------------------------
exports.getRelatedProducts = asyncHandler(async (req, res) => {
  addNoCacheHeaders(res);
  const product = await Product.findById(req.params.id);
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });

  const related = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    status: "active",
  })
    .populate("category", "name slug")
    .limit(4)
    .sort({ averageRating: -1, purchases: -1 });

  res
    .status(200)
    .json({ success: true, count: related.length, products: related });
});

// --------------------------------------------------------
// CREATE PRODUCT
// --------------------------------------------------------
exports.createProduct = asyncHandler(async (req, res) => {
  // NOTE: uploadToCloudinary already unlinks the temp file; we rely on that.
  const uploadedPublicIds = []; // track for cleanup on error

  try {
    // basic logs
    console.log("CREATE PRODUCT - files:", req.files?.length || 0);

    // parse variants
    let variants = [];
    if (req.body.variants) {
      variants = safeJSONParse(req.body.variants, []);
    }

    // required fields
    if (
      !req.body.name ||
      !req.body.description ||
      !req.body.brand ||
      !req.body.sku ||
      !req.body.price
    ) {
      // cleanup any files that were uploaded by multer (but not yet cloud-uploaded)
      // req.files might contain temp files; any cloud uploads will be tracked separately
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Please provide required fields: name, description, brand, sku, price",
        });
    }

    // basic validations
    const price = parseFloat(req.body.price);
    const salePrice = req.body.salePrice
      ? parseFloat(req.body.salePrice)
      : null;
    if (salePrice && salePrice >= price)
      return res
        .status(400)
        .json({
          success: false,
          message: "Sale price must be less than regular price",
        });

    // uniqueness checks
    const existingSku = await Product.findOne({ sku: req.body.sku });
    if (existingSku)
      return res
        .status(400)
        .json({
          success: false,
          message: "Product with this SKU already exists",
        });
    if (req.body.slug) {
      const existingSlug = await Product.findOne({ slug: req.body.slug });
      if (existingSlug)
        return res
          .status(400)
          .json({
            success: false,
            message: "Product with this slug already exists",
          });
    }

    // category validation
    if (req.body.category) {
      const cat = await Category.findById(req.body.category);
      if (!cat)
        return res
          .status(400)
          .json({ success: false, message: "Invalid category selected" });
    }

    // assemble product object
    const productData = {
      name: req.body.name,
      description: req.body.description,
      brand: req.body.brand,
      sku: req.body.sku,
      slug: req.body.slug || undefined,
      price,
      salePrice,
      cost: req.body.cost ? parseFloat(req.body.cost) : null,
      category: req.body.category || null,
      status: req.body.status || "active",
      isFeatured:
        req.body.featured === "true" || req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      variants:
        variants.length > 0
          ? variants.map((v) => ({
              ...v,
              variantSku: `${req.body.sku}-${v.size}-${v.color?.name
                ?.replace(/\s+/g, "")
                .toUpperCase()}`,
            }))
          : [
              {
                size: "S",
                color: { name: "Black", hexCode: "#000000" },
                stock: 0,
                variantSku: `${req.body.sku}-S-BLACK`,
              },
            ],
      materials: extractArrayFromRequest(req, "materials"),
      features: extractArrayFromRequest(req, "features"),
      careInstructions: extractArrayFromRequest(req, "careInstructions"),
      seo: {
        metaTitle: req.body["seo[metaTitle]"] || "",
        metaDescription: req.body["seo[metaDescription]"] || "",
        keywords: req.body["seo[keywords]"] || "",
      },
    };

    // totalStock
    productData.totalStock = productData.variants.reduce(
      (t, v) => t + (parseInt(v.stock) || 0),
      0
    );

    // handle images: upload each temp file to Cloudinary and collect results
    productData.images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        // uploadToCloudinary will unlink the temp file (per config/cloudinary.js)
        const result = await uploadToCloudinary(file.path, "lilyth-products");
        // result.secure_url and result.public_id expected
        const publicId =
          result.public_id || result.publicId || result.public_id;
        const url = result.secure_url || result.url || result.secureUrl;
        productData.images.push({
          url,
          publicId,
          alt: "",
          isPrimary: i === 0,
        });
        if (publicId) uploadedPublicIds.push(publicId);
      }
    }

    // create and save
    const product = new Product(productData);
    await product.save();
    await product.populate("category", "name slug");

    res
      .status(201)
      .json({
        success: true,
        message: "Product created successfully",
        product,
      });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    // cleanup any cloud uploads done during this request
    if (uploadedPublicIds.length > 0) {
      try {
        await deleteMultipleFromCloudinary(uploadedPublicIds);
        console.log("Cleaned up uploaded images due to failure");
      } catch (cleanupErr) {
        console.error("Error cleaning up uploaded images:", cleanupErr);
      }
    }

    // mongoose validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: "Validation Error", errors });
    }

    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to create product",
      });
  }
});

// --------------------------------------------------------
// UPDATE PRODUCT
// --------------------------------------------------------
exports.updateProduct = asyncHandler(async (req, res) => {
  // Track new uploaded public IDs (cloud) for cleanup on error
  const newlyUploadedPublicIds = [];

  try {
    console.log(
      "UPDATE PRODUCT - id:",
      req.params.id,
      "files:",
      req.files?.length || 0
    );

    // fetch product
    const product = await Product.findById(req.params.id);
    if (!product) {
      // cleanup any temp multer files are handled by multer; no cloud uploads yet
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // parse variants if provided
    let variants = [];
    if (req.body.variants) {
      variants = safeJSONParse(
        req.body.variants,
        Array.isArray(req.body.variants) ? req.body.variants : []
      );
    }

    // parse arrays once
    const extractedMaterials = extractArrayFromRequest(req, "materials");
    const extractedFeatures = extractArrayFromRequest(req, "features");
    const extractedCareInstructions = extractArrayFromRequest(
      req,
      "careInstructions"
    );

    // validate sale price if present
    const priceToCheck = req.body.price
      ? parseFloat(req.body.price)
      : product.price;
    if (req.body.salePrice && req.body.salePrice !== "") {
      const salePriceToCheck = parseFloat(req.body.salePrice);
      if (
        !isNaN(salePriceToCheck) &&
        !isNaN(priceToCheck) &&
        salePriceToCheck >= priceToCheck
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Sale price must be less than regular price",
          });
      }
    }

    // sku/slug uniqueness checks
    if (req.body.sku && req.body.sku !== product.sku) {
      const existing = await Product.findOne({
        sku: req.body.sku,
        _id: { $ne: req.params.id },
      });
      if (existing)
        return res
          .status(400)
          .json({
            success: false,
            message: "Product with this SKU already exists",
          });
    }
    if (req.body.slug && req.body.slug !== product.slug) {
      const existingSlug = await Product.findOne({
        slug: req.body.slug,
        _id: { $ne: req.params.id },
      });
      if (existingSlug)
        return res
          .status(400)
          .json({
            success: false,
            message: "Product with this slug already exists",
          });
    }

    // Build updatedImages starting from existingImages sent by client (keeps order)
    let updatedImages = [];
    const existingImagesFromClient = safeJSONParse(
      req.body.existingImages,
      null
    );
    if (Array.isArray(existingImagesFromClient)) {
      // Expecting objects with at least url and publicId (or _id)
      updatedImages = existingImagesFromClient.map((img) => ({ ...img }));
    } else {
      // default to product.images (server side) if client didn't send explicit list
      updatedImages = product.images
        ? product.images.map((i) => ({ ...i }))
        : [];
    }

    // Upload new files to Cloudinary (if any)
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const result = await uploadToCloudinary(file.path, "lilyth-products");
        const publicId = result.public_id || result.publicId;
        const url = result.secure_url || result.url;
        const imageObj = {
          url,
          publicId,
          alt: "",
          // Mark primary if none exists yet
          isPrimary:
            !updatedImages.some((img) => img.isPrimary) &&
            updatedImages.length === 0 &&
            i === 0,
        };
        updatedImages.push(imageObj);
        if (publicId) newlyUploadedPublicIds.push(publicId);
      }
    }

    // Handle deletions requested by client
    const imagesToDelete = safeJSONParse(req.body.imagesToDelete, []);
    if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
      // delete from Cloudinary and filter from updatedImages
      for (const idOrPublicId of imagesToDelete) {
        // find by _id (string) or publicId
        const img = product.images.find(
          (p) =>
            p._id?.toString() === idOrPublicId || p.publicId === idOrPublicId
        );
        if (img && img.publicId) {
          try {
            await deleteFromCloudinary(img.publicId);
          } catch (err) {
            console.error("Error deleting image from Cloudinary:", err);
          }
        }
      }

      // filter out those images from updatedImages (compare by _id or publicId)
      updatedImages = updatedImages.filter((img) => {
        const imgId = img._id ? img._id.toString() : null;
        if (imgId && imagesToDelete.includes(imgId)) return false;
        if (img.publicId && imagesToDelete.includes(img.publicId)) return false;
        return true;
      });
    }

    // final safety: must have at least one image
    if (!Array.isArray(updatedImages) || updatedImages.length === 0) {
      // cleanup newly uploaded cloud files (if any)
      if (newlyUploadedPublicIds.length > 0) {
        await deleteMultipleFromCloudinary(newlyUploadedPublicIds);
      }
      return res
        .status(400)
        .json({
          success: false,
          message: "Product must have at least one image",
        });
    }

    // ensure one primary image
    if (!updatedImages.some((i) => i.isPrimary)) {
      updatedImages[0].isPrimary = true;
    }

    // Prepare update data
    const updateData = {
      name: req.body.name || product.name,
      description: req.body.description || product.description,
      brand: req.body.brand || product.brand,
      sku: req.body.sku || product.sku,
      slug: req.body.slug || product.slug,
      price: req.body.price ? parseFloat(req.body.price) : product.price,
      salePrice:
        req.body.salePrice && req.body.salePrice !== ""
          ? parseFloat(req.body.salePrice)
          : req.body.salePrice === ""
          ? null
          : product.salePrice,
      cost: req.body.cost ? parseFloat(req.body.cost) : product.cost,
      category: req.body.category || product.category,
      status: req.body.status || product.status,
      isFeatured:
        req.body.featured !== undefined
          ? req.body.featured === "true"
          : product.isFeatured,
      isNewArrival:
        req.body.isNewArrival !== undefined
          ? req.body.isNewArrival === "true"
          : product.isNewArrival,
      variants: variants.length > 0 ? variants : product.variants,
      materials:
        extractedMaterials.length > 0 ? extractedMaterials : product.materials,
      features:
        extractedFeatures.length > 0 ? extractedFeatures : product.features,
      careInstructions:
        extractedCareInstructions.length > 0
          ? extractedCareInstructions
          : product.careInstructions,
      seo: {
        metaTitle: req.body["seo[metaTitle]"] || product.seo?.metaTitle || "",
        metaDescription:
          req.body["seo[metaDescription]"] ||
          product.seo?.metaDescription ||
          "",
        keywords: req.body["seo[keywords]"] || product.seo?.keywords || "",
      },
      images: updatedImages,
    };

    updateData.totalStock = updateData.variants.reduce(
      (t, v) => t + (parseInt(v.stock) || 0),
      0
    );

    // apply and save
    Object.assign(product, updateData);
    await product.save();
    await product.populate("category", "name slug");

    res
      .status(200)
      .json({
        success: true,
        message: "Product updated successfully",
        product,
      });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);

    // cleanup any newly uploaded cloud images
    try {
      if (newlyUploadedPublicIds && newlyUploadedPublicIds.length > 0) {
        await deleteMultipleFromCloudinary(newlyUploadedPublicIds);
      }
    } catch (cleanupErr) {
      console.error("Error cleaning up newly uploaded images:", cleanupErr);
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: "Validation Error", errors });
    }

    res
      .status(500)
      .json({
        success: false,
        message: err.message || "Failed to update product",
      });
  }
});

// --------------------------------------------------------
// DELETE PRODUCT
// --------------------------------------------------------
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });

  // collect publicIds and delete them
  if (Array.isArray(product.images) && product.images.length > 0) {
    const publicIds = product.images
      .filter((i) => i.publicId)
      .map((i) => i.publicId);
    if (publicIds.length > 0) {
      try {
        await deleteMultipleFromCloudinary(publicIds);
      } catch (err) {
        console.error("Error deleting images from Cloudinary:", err);
      }
    }
  }

  await product.deleteOne();
  res
    .status(200)
    .json({
      success: true,
      message: "Product and associated images deleted successfully",
    });
});
