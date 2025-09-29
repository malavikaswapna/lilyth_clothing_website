import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { productsAPI, categoriesAPI } from '../../services/api';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import './AddProductModal.css';

const generateSKU = (name, brand) => {
  const nameCode = name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${nameCode}-${timestamp}`;
};

const AddProductModal = ({ isOpen, onClose, product = null, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [generateSlug, setGenerateSlug] = useState(true);

  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      brand: '',
      sku: '',
      slug: '',
      price: '',
      salePrice: '',
      cost: '',
      category: '',
      status: 'active',
      featured: false,
      isNewArrival: false,
      materials: [],
      features: [],
      careInstructions: [],
      variants: [{ size: 'S', color: { name: 'Black', hexCode: '#000000' }, stock: 0 }],
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: ''
      }
    }
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants'
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control,
    name: 'materials'
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: 'features'
  });

  const { fields: careFields, append: appendCare, remove: removeCare } = useFieldArray({
    control,
    name: 'careInstructions'
  });

  const watchedName = watch('name');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        populateForm(product);
      } else {
        reset();
        setPreviewImages([]);
      }
    }
  }, [isOpen, product]);

// Auto-generate slug + SKU from name
useEffect(() => {
  if (watchedName && !isEditing) {
    // Auto-generate slug
    if (generateSlug) {
      const slug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', slug);
    }

    // Auto-generate SKU if empty
    const currentSku = watch('sku');
    if (!currentSku) {
      const autoSku = generateSKU(watchedName, watch('brand') || 'LILYTH');
      setValue('sku', autoSku);
    }
  }
}, [watchedName, generateSlug, isEditing, watch, setValue]);


  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const populateForm = (productData) => {
    // Populate all form fields with existing product data
    Object.keys(productData).forEach(key => {
      if (key === 'variants') {
        setValue('variants', productData.variants.map(v => ({
          size: v.size,
          color: v.color,
          stock: v.stock
        })));
      } else if (key === 'category') {
        setValue('category', productData.category?._id || '');
      } else if (key === 'images') {
        setPreviewImages(productData.images.map(img => ({
          url: img.url,
          alt: img.alt,
          existing: true
        })));
      } else {
        setValue(key, productData[key]);
      }
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewImages(prev => [...prev, {
            file,
            url: event.target.result,
            alt: '',
            new: true
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

const onSubmit = async (data) => {
  try {
    setLoading(true);

    // Debug: Log what we're getting from the form
    console.log('Form data received:', data);

    const formData = new FormData();
    
    // Add required fields first
    formData.append('name', data.name || '');
    formData.append('description', data.description || '');
    formData.append('brand', data.brand || '');
    formData.append('sku', data.sku || '');
    formData.append('price', data.price || '');
    formData.append('slug', data.slug || '');
    formData.append('category', data.category || '');
    formData.append('status', data.status || 'active');
    
    // Add optional fields only if they exist
    if (data.salePrice) formData.append('salePrice', data.salePrice);
    if (data.cost) formData.append('costPrice', data.cost);
    
    // Add boolean fields
    formData.append('isFeatured', data.featured ? 'true' : 'false');
    formData.append('isNewArrival', data.isNewArrival ? 'true' : 'false');

    const processedVariants = data.variants.map((variant) => ({
      size: variant.size,
      color: variant.color,
      stock: parseInt(variant.stock) || 0,
      variantSku: `${data.sku}-${variant.size}-${variant.color.name.replace(/\s+/g, '').toUpperCase()}`
    }));

    // Add variants as JSON string
    formData.append('variants', JSON.stringify(processedVariants));

    // Add arrays only if they have content
    const materials = data.materials?.filter(m => m && m.trim()) || [];
    const features = data.features?.filter(f => f && f.trim()) || [];
    const careInstructions = data.careInstructions?.filter(c => c && c.trim()) || [];
    
    if (materials.length > 0) formData.append('materials', JSON.stringify(materials));
    if (features.length > 0) formData.append('features', JSON.stringify(features));
    if (careInstructions.length > 0) formData.append('careInstructions', JSON.stringify(careInstructions));

    // Add SEO fields individually if they exist
    if (data.seo?.metaTitle) formData.append('metaTitle', data.seo.metaTitle);
    if (data.seo?.metaDescription) formData.append('metaDescription', data.seo.metaDescription);

    // Add new images
    previewImages
      .filter(img => img.new && img.file)
      .forEach((img) => {
        formData.append('images', img.file);
      });

    // Debug logging
    console.log('Processed variants:', processedVariants);
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    let response;
    if (isEditing) {
      response = await productsAPI.updateProduct(product._id, formData);
    } else {
      response = await productsAPI.createProduct(formData);
    }

    toast.success(`Product ${isEditing ? 'updated' : 'created'} successfully`);
    onSave(response.data.product);
    onClose();
  } catch (error) {
    console.error('Full error:', error);
    console.error('Error response data:', error.response?.data);
    
    const errorMessage = error.response?.data?.message || error.message;
    toast.error(`Failed to ${isEditing ? 'update' : 'create'} product: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

  if (!isOpen) return null;

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'];
  const colors = [
    { name: 'Black', hexCode: '#000000' },
    { name: 'White', hexCode: '#FFFFFF' },
    { name: 'Navy Blue', hexCode: '#000080' },
    { name: 'Gray', hexCode: '#808080' },
    { name: 'Beige', hexCode: '#F5F5DC' },
    { name: 'Red', hexCode: '#FF0000' },
    { name: 'Pink', hexCode: '#FFC0CB' },
    { name: 'Blue', hexCode: '#0000FF' },
    { name: 'Green', hexCode: '#008000' },
    { name: 'Brown', hexCode: '#A52A2A' }
  ];

  return (
    <div className="modal-overlay">
      <div className="add-product-modal">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button 
            className={`tab ${activeTab === 'variants' ? 'active' : ''}`}
            onClick={() => setActiveTab('variants')}
          >
            Variants & Stock
          </button>
          <button 
            className={`tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            Images
          </button>
          <button 
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab ${activeTab === 'seo' ? 'active' : ''}`}
            onClick={() => setActiveTab('seo')}
          >
            SEO
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="product-form">
          <div className="modal-body">
            
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="tab-content">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'error' : ''}`}
                      {...register('name', { required: 'Product name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Description *</label>
                    <textarea
                      rows="4"
                      className={`form-control ${errors.description ? 'error' : ''}`}
                      {...register('description', { required: 'Description is required' })}
                    />
                    {errors.description && <span className="form-error">{errors.description.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.brand ? 'error' : ''}`}
                      {...register('brand', { required: 'Brand is required' })}
                    />
                    {errors.brand && <span className="form-error">{errors.brand.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className={`form-control ${errors.category ? 'error' : ''}`}
                      {...register('category', { required: 'Category is required' })}
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && <span className="form-error">{errors.category.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.sku ? 'error' : ''}`}
                      {...register('sku', { required: 'SKU is required' })}
                    />
                    {errors.sku && <span className="form-error">{errors.sku.message}</span>}
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
                      className={`form-control ${errors.slug ? 'error' : ''}`}
                      disabled={generateSlug && !isEditing}
                      {...register('slug', { required: 'Slug is required' })}
                    />
                    {errors.slug && <span className="form-error">{errors.slug.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Regular Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-control ${errors.price ? 'error' : ''}`}
                      {...register('price', { 
                        required: 'Price is required',
                        min: { value: 0, message: 'Price must be positive' }
                      })}
                    />
                    {errors.price && <span className="form-error">{errors.price.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sale Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      {...register('salePrice', {
                        min: { value: 0, message: 'Sale price must be positive' }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cost Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      {...register('cost', {
                        min: { value: 0, message: 'Cost must be positive' }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" {...register('status')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" {...register('featured')} />
                        <span>Featured Product</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" {...register('isNewArrival')} />
                        <span>New Arrival</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && (
              <div className="tab-content">
                <div className="variants-section">
                  <div className="section-header">
                    <h3>Product Variants</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendVariant({ size: 'M', color: { name: 'Black', hexCode: '#000000' }, stock: 0 })}
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
                              {sizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Color</label>
                            <select
                              className="form-control"
                              {...register(`variants.${index}.color.name`)}
                              onChange={(e) => {
                                const selectedColor = colors.find(c => c.name === e.target.value);
                                if (selectedColor) {
                                  setValue(`variants.${index}.color.hexCode`, selectedColor.hexCode);
                                }
                              }}
                            >
                              {colors.map(color => (
                                <option key={color.name} value={color.name}>{color.name}</option>
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
                                min: { value: 0, message: 'Stock must be 0 or positive' }
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

            {/* Images Tab */}
            {activeTab === 'images' && (
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
                      style={{ display: 'none' }}
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
                              value={image.alt || ''}
                              onChange={(e) => {
                                setPreviewImages(prev => 
                                  prev.map((img, i) => 
                                    i === index ? { ...img, alt: e.target.value } : img
                                  )
                                );
                              }}
                              className="alt-input"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
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
                        onClick={() => appendMaterial('')}
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
                        onClick={() => appendFeature('')}
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
                        onClick={() => appendCare('')}
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

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="tab-content">
                <div className="seo-section">
                  <div className="form-group">
                    <label className="form-label">Meta Title</label>
                    <input
                      type="text"
                      className="form-control"
                      {...register('seo.metaTitle')}
                    />
                    <small>Recommended: 50-60 characters</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Meta Description</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      {...register('seo.metaDescription')}
                    />
                    <small>Recommended: 150-160 characters</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Keywords</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Separate keywords with commas"
                      {...register('seo.keywords')}
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
              {isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;