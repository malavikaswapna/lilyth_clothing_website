import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  X,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { productsAPI, categoriesAPI } from "../../services/api";
import Button from "../../components/common/Button";
import toast from "react-hot-toast";
import "./AddProductModal.css";

const generateSKU = (name, brand) => {
  const nameCode = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${nameCode}-${timestamp}`;
};

const AddProductModal = ({ isOpen, onClose, product = null, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [generateSlug, setGenerateSlug] = useState(true);

  // Track which images to keep and which to delete
  const [imagesToDelete, setImagesToDelete] = useState([]);

  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      sku: "",
      slug: "",
      price: "",
      salePrice: "",
      cost: "",
      category: "",
      status: "active",
      featured: false,
      isNewArrival: false,
      materials: [],
      features: [],
      careInstructions: [],
      variants: [
        { size: "S", color: { name: "Black", hexCode: "#000000" }, stock: 0 },
      ],
      seo: {
        metaTitle: "",
        metaDescription: "",
        keywords: "",
      },
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });

  const {
    fields: materialFields,
    append: appendMaterial,
    remove: removeMaterial,
  } = useFieldArray({
    control,
    name: "materials",
  });

  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray({
    control,
    name: "features",
  });

  const {
    fields: careFields,
    append: appendCare,
    remove: removeCare,
  } = useFieldArray({
    control,
    name: "careInstructions",
  });

  const watchedName = watch("name");

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        console.log("Product received in modal:", product);
        console.log("Product images:", product.images);
        populateForm(product);
      } else {
        reset();
        setPreviewImages([]);
        setImagesToDelete([]);
        setActiveTab("basic"); // Reset to first tab for new products
      }
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (watchedName && !isEditing) {
      // Auto-generate slug
      if (generateSlug) {
        const slug = watchedName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
        setValue("slug", slug);
      }

      // Auto-generate SKU if empty
      const currentSku = watch("sku");
      if (!currentSku) {
        const autoSku = generateSKU(watchedName, watch("brand") || "LILYTH");
        setValue("sku", autoSku);
      }
    }
  }, [watchedName, generateSlug, isEditing, watch, setValue]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const populateForm = (productData) => {
    console.log("=== POPULATE FORM DEBUG ===");
    console.log("Full product data received:", productData);
    console.log("Product ID:", productData._id);
    console.log("Product name:", productData.name);
    console.log("Images field exists?", "images" in productData);
    console.log("Images value:", productData.images);
    console.log("Images is array?", Array.isArray(productData.images));
    console.log("Images length:", productData.images?.length);

    if (productData.images && productData.images.length > 0) {
      console.log("First image:", productData.images[0]);
    }

    // Populate all form fields with existing product data
    Object.keys(productData).forEach((key) => {
      if (key === "variants") {
        setValue(
          "variants",
          productData.variants.map((v) => ({
            size: v.size,
            color: v.color,
            stock: v.stock,
          }))
        );
      } else if (key === "category") {
        setValue("category", productData.category?._id || "");
      } else if (key === "images") {
        // Mark existing images properly
        console.log("Processing images in populateForm...");
        if (
          productData.images &&
          Array.isArray(productData.images) &&
          productData.images.length > 0
        ) {
          const processedImages = productData.images.map((img, index) => {
            const processedImg = {
              url: img.url,
              publicId: img.publicId, // ✅ ADD THIS LINE
              alt: img.alt || "",
              isPrimary: img.isPrimary || false,
              existing: true,
              _id: img._id || `img_${index}`,
            };
            console.log(`Processed image ${index}:`, processedImg);
            return processedImg;
          });
          console.log("Setting preview images to:", processedImages);
          setPreviewImages(processedImages);
        } else {
          console.log("No images to process, setting empty array");
          setPreviewImages([]);
        }
      } else if (key === "seo" && productData.seo) {
        setValue("seo", productData.seo);
      } else if (
        key === "materials" ||
        key === "features" ||
        key === "careInstructions"
      ) {
        // Handle arrays properly - ensure at least one empty field if array is empty
        const arrayValue = productData[key] || [];
        // If array is empty, add one empty string so user can add data
        const valueToSet = arrayValue.length > 0 ? arrayValue : [""];
        setValue(key, valueToSet);
        console.log(`Set ${key}:`, valueToSet); // Debug log
      } else if (key === "isFeatured") {
        // Map isFeatured to featured for the form
        setValue("featured", productData[key]);
      } else {
        setValue(key, productData[key]);
      }
    });

    // Clear the delete list when populating
    setImagesToDelete([]);
    console.log("=== END POPULATE FORM DEBUG ===");
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewImages((prev) => [
            ...prev,
            {
              file,
              url: event.target.result,
              alt: "",
              new: true,
              isPrimary: prev.length === 0, // First image is primary
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    const imageToRemove = previewImages[index];

    // If it's an existing image, add it to the delete list
    if (imageToRemove.existing) {
      setImagesToDelete((prev) => [...prev, imageToRemove]);
    }

    // Remove from preview
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      console.log("Form data received:", data);
      console.log("Preview images:", previewImages);
      console.log("Images to delete:", imagesToDelete);
      console.log("Is editing:", isEditing);

      // Validate prices
      if (data.salePrice && data.price) {
        const price = parseFloat(data.price);
        const salePrice = parseFloat(data.salePrice);

        if (salePrice >= price) {
          toast.error("Sale price must be less than regular price");
          setLoading(false);
          return;
        }
      }

      // Validate that at least one image will remain
      const newImagesCount = previewImages.filter((img) => img.new).length;
      const existingImagesKeptCount = previewImages.filter(
        (img) => img.existing
      ).length;

      if (newImagesCount === 0 && existingImagesKeptCount === 0) {
        toast.error("Product must have at least one image");
        setLoading(false);
        return;
      }

      const formData = new FormData();

      // Add required fields first
      formData.append("name", data.name || "");
      formData.append("description", data.description || "");
      formData.append("brand", data.brand || "");
      formData.append("sku", data.sku || "");
      formData.append(
        "price",
        data.price ? parseFloat(data.price).toString() : ""
      );
      formData.append("slug", data.slug || "");
      formData.append("category", data.category || "");
      formData.append("status", data.status || "active");

      // Add optional fields only if they exist
      if (data.salePrice)
        formData.append("salePrice", parseFloat(data.salePrice).toString());
      if (data.cost) formData.append("cost", parseFloat(data.cost).toString());

      // Add boolean fields
      formData.append("featured", data.featured ? "true" : "false");
      formData.append("isNewArrival", data.isNewArrival ? "true" : "false");

      // Process variants
      const processedVariants = data.variants.map((variant) => ({
        size: variant.size,
        color: variant.color,
        stock: parseInt(variant.stock) || 0,
        variantSku: `${data.sku}-${variant.size}-${variant.color.name
          .replace(/\s+/g, "")
          .toUpperCase()}`,
      }));

      // Add variants as JSON string
      formData.append("variants", JSON.stringify(processedVariants));

      // Add arrays only if they have content
      const materials = data.materials?.filter((m) => m && m.trim()) || [];
      const features = data.features?.filter((f) => f && f.trim()) || [];
      const careInstructions =
        data.careInstructions?.filter((c) => c && c.trim()) || [];

      materials.forEach((material, index) => {
        formData.append(`materials[${index}]`, material);
      });

      features.forEach((feature, index) => {
        formData.append(`features[${index}]`, feature);
      });

      careInstructions.forEach((instruction, index) => {
        formData.append(`careInstructions[${index}]`, instruction);
      });

      // Add SEO fields
      if (data.seo?.metaTitle)
        formData.append("seo[metaTitle]", data.seo.metaTitle);
      if (data.seo?.metaDescription)
        formData.append("seo[metaDescription]", data.seo.metaDescription);
      if (data.seo?.keywords)
        formData.append("seo[keywords]", data.seo.keywords);

      // Handle images for update
      if (isEditing) {
        // Get existing images that should be kept (not removed/replaced)
        const existingImagesToKeep = previewImages
          .filter((img) => img.existing && !img.markedForDeletion)
          .map((img) => ({
            url: img.url,
            publicId: img.publicId,
            alt: img.alt || "",
            isPrimary: img.isPrimary || false,
            _id: img._id,
          }));

        console.log("Existing images to keep:", existingImagesToKeep);
        console.log("Images marked for deletion:", imagesToDelete);

        // Always send existingImages array (even if empty)
        formData.append("existingImages", JSON.stringify(existingImagesToKeep));

        // Only send images to delete if there are any AND we're keeping at least one image (new or existing)
        const totalImagesAfterOperation =
          existingImagesToKeep.length +
          previewImages.filter((img) => img.new).length;

        if (imagesToDelete.length > 0) {
          // Only delete images if we'll have at least one image remaining
          if (totalImagesAfterOperation > 0) {
            const validImagesToDelete = imagesToDelete
              .filter((img) => img._id)
              .map((img) => img._id);

            if (validImagesToDelete.length > 0) {
              console.log("Sending images to delete:", validImagesToDelete);
              formData.append(
                "imagesToDelete",
                JSON.stringify(validImagesToDelete)
              );
            }
          } else {
            console.warn(
              "Cannot delete all images - product must have at least one image"
            );
            toast.warning("Product must have at least one image");
            setLoading(false);
            return;
          }
        }
      } else {
        // For new products, we don't need to handle existing images
        // Just let the new images be added below
      }

      // Add new image files
      const newImages = previewImages.filter((img) => img.new && img.file);
      console.log("New images to upload:", newImages.length);
      newImages.forEach((img) => {
        formData.append("images", img.file);
      });

      // Debug logging
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      let response;
      if (isEditing) {
        response = await productsAPI.updateProduct(product._id, formData);
      } else {
        response = await productsAPI.createProduct(formData);
      }

      toast.success(
        `Product ${isEditing ? "updated" : "created"} successfully`
      );
      onSave(response.data.product);
      onClose();
    } catch (error) {
      console.error("Full error:", error);
      console.error("Error response data:", error.response?.data);

      let errorMessage = "An error occurred";

      // Check for validation errors
      if (
        error.response?.data?.errors &&
        Array.isArray(error.response.data.errors)
      ) {
        // Join all validation errors
        errorMessage = error.response.data.errors.join(", ");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(
        `Failed to ${isEditing ? "update" : "create"} product: ${errorMessage}`
      );

      // Log detailed error info for debugging
      if (error.response?.data?.errors) {
        console.error("Validation errors:", error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const sizes = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "0",
    "2",
    "4",
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "18",
    "20",
  ];
  const colors = [
    { name: "Black", hexCode: "#000000" },
    { name: "White", hexCode: "#FFFFFF" },
    { name: "Navy Blue", hexCode: "#000080" },
    { name: "Gray", hexCode: "#808080" },
    { name: "Beige", hexCode: "#F5F5DC" },
    { name: "Red", hexCode: "#FF0000" },
    { name: "Pink", hexCode: "#FFC0CB" },
    { name: "Blue", hexCode: "#0000FF" },
    { name: "Green", hexCode: "#008000" },
    { name: "Brown", hexCode: "#A52A2A" },
  ];

  return (
    <div className="modal-overlay">
      <div className="add-product-modal">
        <div className="modal-header">
          <h2>{isEditing ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === "basic" ? "active" : ""}`}
            onClick={() => setActiveTab("basic")}
          >
            Basic Info
          </button>
          <button
            className={`tab ${activeTab === "variants" ? "active" : ""}`}
            onClick={() => setActiveTab("variants")}
          >
            Variants & Stock
          </button>
          <button
            className={`tab ${activeTab === "images" ? "active" : ""}`}
            onClick={() => setActiveTab("images")}
          >
            Images
          </button>
          <button
            className={`tab ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            className={`tab ${activeTab === "seo" ? "active" : ""}`}
            onClick={() => setActiveTab("seo")}
          >
            SEO
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="product-form">
          <div className="modal-body">
            {/* Basic Info Tab - Unchanged */}
            {activeTab === "basic" && (
              <div className="tab-content">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? "error" : ""}`}
                      {...register("name", {
                        required: "Product name is required",
                      })}
                    />
                    {errors.name && (
                      <span className="form-error">{errors.name.message}</span>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Description *</label>
                    <textarea
                      rows="4"
                      className={`form-control ${
                        errors.description ? "error" : ""
                      }`}
                      {...register("description", {
                        required: "Description is required",
                      })}
                    />
                    {errors.description && (
                      <span className="form-error">
                        {errors.description.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.brand ? "error" : ""}`}
                      {...register("brand", { required: "Brand is required" })}
                    />
                    {errors.brand && (
                      <span className="form-error">{errors.brand.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className={`form-control ${
                        errors.category ? "error" : ""
                      }`}
                      {...register("category", {
                        required: "Category is required",
                      })}
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <span className="form-error">
                        {errors.category.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.sku ? "error" : ""}`}
                      {...register("sku", { required: "SKU is required" })}
                    />
                    {errors.sku && (
                      <span className="form-error">{errors.sku.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      URL Slug *
                      {!isEditing && (
                        <label className="slug-toggle">
                          <input
                            type="checkbox"
                            checked={generateSlug}
                            onChange={(e) => setGenerateSlug(e.target.checked)}
                          />
                          Auto-generate
                        </label>
                      )}
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.slug ? "error" : ""}`}
                      disabled={generateSlug && !isEditing}
                      {...register("slug", { required: "Slug is required" })}
                    />
                    {errors.slug && (
                      <span className="form-error">{errors.slug.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Regular Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-control ${errors.price ? "error" : ""}`}
                      {...register("price", {
                        required: "Price is required",
                        min: { value: 0, message: "Price must be positive" },
                      })}
                    />
                    {errors.price && (
                      <span className="form-error">{errors.price.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sale Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      {...register("salePrice", {
                        min: {
                          value: 0,
                          message: "Sale price must be positive",
                        },
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cost Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      {...register("cost", {
                        min: { value: 0, message: "Cost must be positive" },
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" {...register("status")}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" {...register("featured")} />
                        <span>Featured Product</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" {...register("isNewArrival")} />
                        <span>New Arrival</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Variants Tab - Unchanged */}
            {activeTab === "variants" && (
              <div className="tab-content">
                <div className="variants-section">
                  <div className="section-header">
                    <h3>Product Variants</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendVariant({
                          size: "M",
                          color: { name: "Black", hexCode: "#000000" },
                          stock: 0,
                        })
                      }
                    >
                      <Plus size={16} />
                      Add Variant
                    </Button>
                  </div>

                  <div className="variants-list">
                    {variantFields.map((field, index) => (
                      <div key={field.id} className="variant-item">
                        <div className="variant-fields">
                          <div className="form-group">
                            <label>Size</label>
                            <select
                              className="form-control"
                              {...register(`variants.${index}.size`)}
                            >
                              {sizes.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Color</label>
                            <select
                              className="form-control"
                              {...register(`variants.${index}.color.name`)}
                              onChange={(e) => {
                                const selectedColor = colors.find(
                                  (c) => c.name === e.target.value
                                );
                                if (selectedColor) {
                                  setValue(
                                    `variants.${index}.color.hexCode`,
                                    selectedColor.hexCode
                                  );
                                }
                              }}
                            >
                              {colors.map((color) => (
                                <option key={color.name} value={color.name}>
                                  {color.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Stock</label>
                            <input
                              type="number"
                              min="0"
                              className="form-control"
                              {...register(`variants.${index}.stock`, {
                                min: {
                                  value: 0,
                                  message: "Stock must be 0 or positive",
                                },
                              })}
                            />
                          </div>

                          <button
                            type="button"
                            className="remove-variant-btn"
                            onClick={() => removeVariant(index)}
                            disabled={variantFields.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Images Tab - Updated */}
            {activeTab === "images" && (
              <div className="tab-content">
                <div className="images-section">
                  <div className="upload-area">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file-input"
                      id="image-upload"
                      style={{ display: "none" }}
                    />
                    <label htmlFor="image-upload" className="upload-label">
                      <Upload size={48} />
                      <span>Click to upload images or drag and drop</span>
                      <small>PNG, JPG, GIF up to 10MB</small>
                    </label>
                  </div>

                  {previewImages.length > 0 && (
                    <div className="image-previews">
                      {previewImages.map((image, index) => (
                        <div key={index} className="image-preview">
                          <img src={image.url} alt={`Preview ${index + 1}`} />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="image-controls">
                            <input
                              type="text"
                              placeholder="Alt text"
                              value={image.alt || ""}
                              onChange={(e) => {
                                setPreviewImages((prev) =>
                                  prev.map((img, i) =>
                                    i === index
                                      ? { ...img, alt: e.target.value }
                                      : img
                                  )
                                );
                              }}
                              className="alt-input"
                            />
                            {image.existing && (
                              <small
                                style={{ color: "#6b7280", fontSize: "0.7rem" }}
                              >
                                Existing image
                              </small>
                            )}
                            {image.new && (
                              <small
                                style={{ color: "#10b981", fontSize: "0.7rem" }}
                              >
                                New image
                              </small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && imagesToDelete.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        background: "#fee",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <small style={{ color: "#dc2626" }}>
                        {imagesToDelete.length} image(s) will be removed when
                        you save
                      </small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details Tab - Unchanged */}
            {activeTab === "details" && (
              <div className="tab-content">
                <div className="details-section">
                  <div className="form-group">
                    <label className="form-label">Materials</label>
                    <div className="array-inputs">
                      {materialFields.map((field, index) => (
                        <div key={field.id} className="array-item">
                          <input
                            type="text"
                            className="form-control"
                            {...register(`materials.${index}`)}
                          />
                          <button
                            type="button"
                            onClick={() => removeMaterial(index)}
                            className="remove-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => appendMaterial("")}
                        className="add-btn"
                      >
                        <Plus size={16} />
                        Add Material
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Features</label>
                    <div className="array-inputs">
                      {featureFields.map((field, index) => (
                        <div key={field.id} className="array-item">
                          <input
                            type="text"
                            className="form-control"
                            {...register(`features.${index}`)}
                          />
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="remove-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => appendFeature("")}
                        className="add-btn"
                      >
                        <Plus size={16} />
                        Add Feature
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Care Instructions</label>
                    <div className="array-inputs">
                      {careFields.map((field, index) => (
                        <div key={field.id} className="array-item">
                          <input
                            type="text"
                            className="form-control"
                            {...register(`careInstructions.${index}`)}
                          />
                          <button
                            type="button"
                            onClick={() => removeCare(index)}
                            className="remove-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => appendCare("")}
                        className="add-btn"
                      >
                        <Plus size={16} />
                        Add Instruction
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab - Unchanged */}
            {activeTab === "seo" && (
              <div className="tab-content">
                <div className="seo-section">
                  <div className="form-group">
                    <label className="form-label">Meta Title</label>
                    <input
                      type="text"
                      className="form-control"
                      {...register("seo.metaTitle")}
                    />
                    <small>Recommended: 50-60 characters</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Meta Description</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      {...register("seo.metaDescription")}
                    />
                    <small>Recommended: 150-160 characters</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Keywords</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Separate keywords with commas"
                      {...register("seo.keywords")}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <Save size={16} />
              {isEditing ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
