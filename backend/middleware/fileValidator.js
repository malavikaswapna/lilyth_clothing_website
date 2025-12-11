// middleware/fileValidator.js
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs").promises;

// allowed file types
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

// file size limits (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;

// configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = "uploads/temp";

    // create directory if it doesn't exist
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// file filter function
const fileFilter = (req, file, cb) => {
  // check if file type is allowed
  if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
    return cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."
      ),
      false
    );
  }

  // check file extension matches mimetype
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ALLOWED_IMAGE_TYPES[file.mimetype];

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("File extension does not match file type."), false);
  }

  cb(null, true);
};

// create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter: fileFilter,
});

// advanced image validation middleware
const validateImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const validatedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // read image metadata
        const metadata = await sharp(file.path).metadata();

        // validate image dimensions
        if (
          metadata.width > MAX_IMAGE_DIMENSION ||
          metadata.height > MAX_IMAGE_DIMENSION
        ) {
          errors.push(
            `${file.originalname}: Image dimensions exceed ${MAX_IMAGE_DIMENSION}px`
          );
          await fs.unlink(file.path); // Delete invalid file
          continue;
        }

        // validate image format
        if (!["jpeg", "png", "webp", "gif"].includes(metadata.format)) {
          errors.push(`${file.originalname}: Invalid image format`);
          await fs.unlink(file.path);
          continue;
        }

        // check for potential security issues (very basic check)
        if (metadata.hasAlpha && metadata.format === "jpeg") {
          errors.push(
            `${file.originalname}: Suspicious file - JPEG with alpha channel`
          );
          await fs.unlink(file.path);
          continue;
        }

        validatedFiles.push(file);
      } catch (error) {
        errors.push(`${file.originalname}: ${error.message}`);

        try {
          await fs.unlink(file.path);
        } catch {}
      }
    }

    if (errors.length > 0) {
      // clean up all files if there are errors
      for (const file of validatedFiles) {
        try {
          await fs.unlink(file.path);
        } catch {}
      }

      return res.status(400).json({
        success: false,
        message: "File validation failed",
        errors,
      });
    }

    // replace req.files with validated files
    req.files = validatedFiles;
    next();
  } catch (error) {
    // clean up files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch {}
      }
    }

    return res.status(500).json({
      success: false,
      message: "File validation error",
      error: error.message,
    });
  }
};

// image optimization middleware
const optimizeImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const optimizedFiles = [];

    for (const file of req.files) {
      const outputDir = "uploads/products";
      const outputFilename = file.filename.replace(
        path.extname(file.filename),
        ".webp"
      );
      const outputPath = path.join(outputDir, outputFilename);

      // create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      // optimize and convert to WebP
      await sharp(file.path)
        .resize(2000, 2000, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(outputPath);

      // create thumbnail
      const thumbnailPath = path.join(outputDir, "thumb-" + outputFilename);
      await sharp(file.path)
        .resize(400, 400, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      optimizedFiles.push({
        ...file,
        path: outputPath,
        filename: outputFilename,
        thumbnail: thumbnailPath,
      });

      // delete original file
      await fs.unlink(file.path);
    }

    req.files = optimizedFiles;
    next();
  } catch (error) {
    console.error("Image optimization error:", error);
    next(error);
  }
};

// virus scanning placeholder (integrate with ClamAV or similar)
const scanForVirus = async (req, res, next) => {
  // In production, integrate with antivirus API
  // For now, just pass through
  next();
};

// export middleware functions
module.exports = {
  upload,
  validateImages,
  optimizeImages,
  scanForVirus,

  // combined middleware
  uploadAndValidate: [
    upload.array("images", 10),
    validateImages,
    scanForVirus,
    optimizeImages,
  ],
};
