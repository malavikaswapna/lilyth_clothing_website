// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const fs = require("fs");

// debug check
console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "***hidden***" : "NOT SET",
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer: store TEMPORARILY on disk

const upload = multer({
  dest: "uploads/", // temporary folder
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
});

// Upload SINGLE file to Cloudinary
const uploadToCloudinary = async (filePath, folder = "lilyth-products") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [
        {
          width: 1200,
          height: 1200,
          crop: "limit",
          quality: "auto",
        },
      ],
    });

    // Remove the temporary file
    fs.unlinkSync(filePath);

    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// Delete a file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

//Delete multiple files

const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const results = await Promise.all(
      publicIds.map((id) => deleteFromCloudinary(id))
    );
    return results;
  } catch (error) {
    console.error("Bulk delete error:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
};
