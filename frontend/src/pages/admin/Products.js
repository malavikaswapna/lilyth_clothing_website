import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  AlertTriangle,
  ChevronDown,
  Image as ImageIcon,
  Copy,
  Download,
  Upload,
} from "lucide-react";
import { productsAPI, categoriesAPI, adminAPI } from "../../services/api";
import Loading from "../../components/common/Loading";
import Button from "../../components/common/Button";
import AddProductModal from "./AddProductModal";
import toast from "react-hot-toast";
import "./Products.css";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  // Enhanced filters with new options
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    lowStock: false,
    featured: false,
    newArrival: false,
    priceRange: { min: "", max: "" },
    dateRange: { start: "", end: "" },
    page: 1,
    limit: 20,
  });

  // New state for bulk operations and advanced features
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Add/Edit Product Modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      // Build query parameters properly
      const queryParams = {};

      // Basic filters
      if (filters.search) queryParams.search = filters.search;
      if (filters.category) queryParams.category = filters.category;
      if (filters.status) queryParams.status = filters.status;

      // Advanced filters
      if (filters.lowStock) queryParams.lowStock = "true";
      if (filters.featured) queryParams.featured = "true";
      if (filters.newArrival) queryParams.newArrivals = "true";

      // Price range
      if (filters.priceRange.min) queryParams.minPrice = filters.priceRange.min;
      if (filters.priceRange.max) queryParams.maxPrice = filters.priceRange.max;

      // Date range
      if (filters.dateRange.start)
        queryParams.startDate = filters.dateRange.start;
      if (filters.dateRange.end) queryParams.endDate = filters.dateRange.end;

      // Pagination
      queryParams.page = filters.page;
      queryParams.limit = filters.limit;

      console.log("Sending query params:", queryParams);

      const response = await productsAPI.getProducts(queryParams);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  // Helper functions for enhanced features
  const calculateProfitMargin = (product) => {
    if (!product.cost || !product.price) return 0;
    return Math.round(((product.price - product.cost) / product.price) * 100);
  };

  const calculateConversionRate = (product) => {
    if (!product.viewCount || product.viewCount === 0) return 0;
    return Math.round(((product.salesCount || 0) / product.viewCount) * 100);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(new Set(products.map((p) => p._id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      category: "",
      status: "",
      lowStock: false,
      featured: false,
      newArrival: false,
      priceRange: { min: "", max: "" },
      dateRange: { start: "", end: "" },
      page: 1,
      limit: 20,
    });
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.size === 0) return;

    try {
      const productIds = Array.from(selectedProducts);

      switch (bulkAction) {
        case "activate":
          await adminAPI.bulkUpdateProductStatus(productIds, {
            status: "active",
          });
          break;
        case "deactivate":
          await adminAPI.bulkUpdateProductStatus(productIds, {
            status: "inactive",
          });
          break;
        case "feature":
          await adminAPI.bulkUpdateProductStatus(productIds, {
            featured: true,
          });
          break;
        case "unfeature":
          await adminAPI.bulkUpdateProductStatus(productIds, {
            featured: false,
          });
          break;
        case "delete":
          if (
            window.confirm(
              `Are you sure you want to delete ${selectedProducts.size} products?`
            )
          ) {
            await adminAPI.bulkDeleteProducts(productIds);
          }
          break;
      }

      toast.success(`Bulk action completed successfully`);
      setSelectedProducts(new Set());
      setBulkAction("");
      loadProducts();
    } catch (error) {
      toast.error("Failed to perform bulk action");
    }
  };

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await adminAPI.updateProductStatus(productId, { status: newStatus });
      toast.success("Product status updated");
      loadProducts();
    } catch (error) {
      toast.error("Failed to update product status");
    }
  };

  const duplicateProduct = async (productId) => {
    try {
      await adminAPI.duplicateProduct(productId);
      toast.success("Product duplicated successfully");
      loadProducts();
    } catch (error) {
      toast.error("Failed to duplicate product");
    }
  };

  const generateCSV = (products) => {
    const headers = [
      "Name",
      "SKU",
      "Brand",
      "Category",
      "Price",
      "Sale Price",
      "Stock",
      "Status",
      "Featured",
      "New Arrival",
      "Created Date",
    ];

    const rows = products.map((product) => [
      product.name,
      product.sku,
      product.brand,
      product.category?.name || "Uncategorized",
      product.price,
      product.salePrice || "",
      product.totalStock,
      product.status,
      product.featured ? "Yes" : "No",
      product.isNewArrival ? "Yes" : "No",
      new Date(product.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  };

  const exportProducts = async () => {
    try {
      setLoading(true);

      // Create CSV content from current products
      const csvContent = generateCSV(products);

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `products-export-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Products exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export products");
    } finally {
      setLoading(false);
    }
  };

  // Add Product Modal functions
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowAddProductModal(true);
  };

  // Update the editProduct function in Products.js
  const editProduct = async (productId) => {
    try {
      // Always fetch fresh product data to ensure we have all fields including images
      console.log("Fetching product for edit:", productId);
      const response = await productsAPI.getProduct(productId);
      console.log("Product fetched for editing:", response.data.product);
      console.log("Product images:", response.data.product.images);

      if (response.data.product) {
        handleEditProduct(response.data.product);
      } else {
        toast.error("Product data not found");
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product for editing");
    }
  };

  // Also ensure the handleEditProduct is passing the complete product
  const handleEditProduct = (product) => {
    console.log("Setting product for editing:", product);
    console.log("Product images count:", product.images?.length);
    setEditingProduct(product);
    setShowAddProductModal(true);
  };

  const handleProductSave = (savedProduct) => {
    loadProducts(); // Reload the products list
    setShowAddProductModal(false);
    setEditingProduct(null);
  };

  const viewProduct = async (productId) => {
    try {
      const response = await productsAPI.getProduct(productId);
      setSelectedProduct(response.data.product);
      setShowProductModal(true);
    } catch (error) {
      toast.error("Failed to load product details");
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await productsAPI.deleteProduct(productId);
        toast.success("Product deleted successfully");
        loadProducts();
      } catch (error) {
        toast.error("Failed to delete product");
      }
    }
  };

  // FIXED: Update stock function - always fetch fresh data
  const updateStock = async (product) => {
    try {
      // Always fetch fresh product data to ensure we have the latest stock values
      console.log("Fetching latest product data for:", product._id);
      const response = await productsAPI.getProduct(product._id);
      console.log("Fresh product data:", response.data.product);
      setSelectedProduct(response.data.product);
      setShowStockModal(true);
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product details");
    }
  };

  // FIXED: Handle stock update with proper cache-busting
  const handleStockUpdate = async (stockData) => {
    try {
      console.log("Updating stock with data:", stockData);
      console.log("For product ID:", selectedProduct._id);

      // Make the API call
      const response = await adminAPI.updateProductStock(selectedProduct._id, {
        variants: stockData,
      });

      console.log("Stock update response:", response.data);
      console.log(
        "Updated totalStock from server:",
        response.data.product.totalStock
      );
      console.log(
        "Updated variants from server:",
        response.data.product.variants
      );

      // Close modal first
      setShowStockModal(false);

      // Show success message
      toast.success("Stock updated successfully");

      // IMPORTANT: Force reload products list from server (don't trust cache)
      await loadProducts();

      // Clear selected product
      setSelectedProduct(null);

      // Optional: Scroll to and highlight the updated product
      setTimeout(() => {
        const element = document.querySelector(
          `[data-product-id="${selectedProduct._id}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a brief highlight effect
          element.classList.add("highlight-updated");
          setTimeout(() => element.classList.remove("highlight-updated"), 2000);
        }
      }, 100);
    } catch (error) {
      console.error("Stock update error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to update stock");
      setShowStockModal(false);
      setSelectedProduct(null);
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return "out-of-stock";
    if (stock < 10) return "low-stock";
    return "in-stock";
  };

  if (loading && products.length === 0)
    return <Loading size="lg" text="Loading products..." />;

  return (
    <div className="admin-products">
      <div className="products-header">
        <div className="header-content">
          <h1>Product Management</h1>
          <p>Manage your store's product catalog and inventory</p>
        </div>
        <div className="header-actions">
          <Button variant="outline" onClick={exportProducts} disabled={loading}>
            <Download size={18} />
            Export
          </Button>
          <Button className="add-product-btn" onClick={handleAddProduct}>
            <Plus size={18} />
            Add Product
          </Button>
        </div>
      </div>

      {/* Enhanced Filters Section */}
      <div className="products-filters">
        <div className="filters-row">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, SKU, or brand..."
              value={filters.search}
              onChange={handleSearch}
            />
          </div>

          <div className="filter-controls">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>

            <button
              className={`filter-toggle ${showAdvancedFilters ? "active" : ""}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter size={16} />
              Advanced Filters
            </button>

            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange("limit", e.target.value)}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Collapsible Section */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-grid">
              <div className="filter-group">
                <label>Price Range</label>
                <div className="price-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) =>
                      handleFilterChange("priceRange", {
                        ...filters.priceRange,
                        min: e.target.value,
                      })
                    }
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) =>
                      handleFilterChange("priceRange", {
                        ...filters.priceRange,
                        max: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Date Added</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) =>
                      handleFilterChange("dateRange", {
                        ...filters.dateRange,
                        start: e.target.value,
                      })
                    }
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) =>
                      handleFilterChange("dateRange", {
                        ...filters.dateRange,
                        end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Product Flags</label>
                <div className="checkbox-filters">
                  <label className="checkbox-filter">
                    <input
                      type="checkbox"
                      checked={filters.lowStock}
                      onChange={(e) =>
                        handleFilterChange("lowStock", e.target.checked)
                      }
                    />
                    <span>Low Stock Only</span>
                  </label>
                  <label className="checkbox-filter">
                    <input
                      type="checkbox"
                      checked={filters.featured}
                      onChange={(e) =>
                        handleFilterChange("featured", e.target.checked)
                      }
                    />
                    <span>Featured</span>
                  </label>
                  <label className="checkbox-filter">
                    <input
                      type="checkbox"
                      checked={filters.newArrival}
                      onChange={(e) =>
                        handleFilterChange("newArrival", e.target.checked)
                      }
                    />
                    <span>New Arrivals</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <button className="btn btn-ghost" onClick={clearAllFilters}>
                Clear All Filters
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowAdvancedFilters(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            <span>{selectedProducts.size} products selected</span>
          </div>

          <div className="bulk-controls">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Choose action...</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="feature">Mark as Featured</option>
              <option value="unfeature">Remove Featured</option>
              <option value="delete">Delete</option>
            </select>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleBulkAction}
              disabled={!bulkAction}
            >
              Apply
            </button>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedProducts(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedProducts.size === products.length &&
                    products.length > 0
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Performance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product._id}
                data-product-id={product._id}
                className={selectedProducts.has(product._id) ? "selected" : ""}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product._id)}
                    onChange={() => handleSelectProduct(product._id)}
                  />
                </td>
                <td>
                  <div className="product-info">
                    <div className="product-image">
                      {product.images?.[0] ? (
                        <img src={product.images[0].url} alt={product.name} />
                      ) : (
                        <div className="no-image">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      {/* Product badges */}
                      <div className="product-badges">
                        {product.featured && (
                          <span className="badge badge-featured">Featured</span>
                        )}
                        {product.isNewArrival && (
                          <span className="badge badge-new">New</span>
                        )}
                        {product.salePrice && (
                          <span className="badge badge-sale">Sale</span>
                        )}
                      </div>
                    </div>
                    <div className="product-details">
                      <h4>{product.name}</h4>
                      <p>{product.brand}</p>
                      <span className="product-sku">SKU: {product.sku}</span>
                      <div className="product-meta">
                        <span>{product.variants?.length || 0} variants</span>
                        <span>
                          Added{" "}
                          {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-tag">
                    {product.category?.name || "Uncategorized"}
                  </span>
                </td>
                <td>
                  <div className="price-info">
                    <span className="current-price">
                      ₹{product.salePrice || product.price}
                    </span>
                    {product.salePrice && (
                      <span className="original-price">₹{product.price}</span>
                    )}
                    <div className="price-meta">
                      <span className="profit-margin">
                        {calculateProfitMargin(product)}% margin
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="stock-info">
                    <span
                      className={`stock-count ${getStockStatus(
                        product.totalStock
                      )}`}
                    >
                      {product.totalStock}
                    </span>
                    <button
                      onClick={() => updateStock(product)}
                      className="stock-edit-btn"
                      title="Update Stock"
                    >
                      <Edit size={14} />
                    </button>
                    {product.totalStock <= 10 && (
                      <span className="low-stock-warning">
                        <AlertTriangle size={12} />
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="status-column">
                    <span className={`status-badge status-${product.status}`}>
                      {product.status}
                    </span>
                    <div className="status-actions">
                      <button
                        className="quick-status-btn"
                        onClick={() =>
                          toggleProductStatus(product._id, product.status)
                        }
                        title={
                          product.status === "active"
                            ? "Deactivate"
                            : "Activate"
                        }
                      >
                        {product.status === "active" ? (
                          <EyeOff size={20} strokeWidth={2.5} />
                        ) : (
                          <Eye size={20} strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="performance-metrics">
                    <div className="metric">
                      <span className="metric-value">
                        {product.viewCount || 0}
                      </span>
                      <span className="metric-label">Views</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">
                        {product.salesCount || 0}
                      </span>
                      <span className="metric-label">Sales</span>
                    </div>
                    <div className="conversion-rate">
                      {calculateConversionRate(product)}% conversion
                    </div>
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button
                      onClick={() => viewProduct(product._id)}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => editProduct(product._id)}
                      className="action-btn edit"
                      title="Edit Product"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => duplicateProduct(product._id)}
                      className="action-btn duplicate"
                      title="Duplicate Product"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product._id)}
                      className="action-btn delete"
                      title="Delete Product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} products
          </div>
          <div className="pagination">
            <button
              onClick={() => handleFilterChange("page", pagination.page - 1)}
              disabled={pagination.page === 1}
              className="page-btn"
            >
              Previous
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => handleFilterChange("page", page)}
                  className={`page-btn ${
                    pagination.page === page ? "active" : ""
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => handleFilterChange("page", pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setShowProductModal(false)}
        />
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() => setShowStockModal(false)}
          onUpdate={handleStockUpdate}
        />
      )}

      {/* Add/Edit Product Modal */}
      {showAddProductModal && (
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={() => {
            setShowAddProductModal(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          onSave={handleProductSave}
        />
      )}
    </div>
  );
};

// Enhanced Product Details Modal Component
const ProductModal = ({ product, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{product.name}</h2>
        <button onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="product-modal-content">
          <div className="product-images">
            {product.images.map((image, index) => (
              <img
                key={index}
                src={image.url}
                alt={`${product.name} ${index + 1}`}
              />
            ))}
          </div>
          <div className="product-info-detailed">
            <p>
              <strong>Brand:</strong> {product.brand}
            </p>
            <p>
              <strong>SKU:</strong> {product.sku}
            </p>
            <p>
              <strong>Category:</strong> {product.category?.name}
            </p>
            <p>
              <strong>Description:</strong> {product.description}
            </p>
            <p>
              <strong>Price:</strong> ₹{product.price}
            </p>
            {product.salePrice && (
              <p>
                <strong>Sale Price:</strong> ₹{product.salePrice}
              </p>
            )}
            <p>
              <strong>Total Stock:</strong> {product.totalStock}
            </p>
            <p>
              <strong>Views:</strong> {product.viewCount || 0}
            </p>
            <p>
              <strong>Sales:</strong> {product.salesCount || 0}
            </p>
            <p>
              <strong>Featured:</strong> {product.featured ? "Yes" : "No"}
            </p>
            <p>
              <strong>New Arrival:</strong>{" "}
              {product.isNewArrival ? "Yes" : "No"}
            </p>

            <div className="variants-info">
              <h4>Variants:</h4>
              {product.variants.map((variant, index) => (
                <div key={index} className="variant-item">
                  <span>Size: {variant.size}</span>
                  <span>Color: {variant.color.name}</span>
                  <span>Stock: {variant.stock}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// FIXED: Stock Update Modal Component with proper initialization
const StockModal = ({ product, onClose, onUpdate }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialize variants from product prop whenever it changes
  useEffect(() => {
    if (product && product.variants) {
      console.log(
        "🔄 StockModal: Initializing with product variants:",
        product.variants
      );
      const initialVariants = product.variants.map((v) => ({
        size: v.size,
        color: v.color.name,
        stock: v.stock,
        _id: v._id,
      }));
      console.log("🔄 StockModal: Setting variants to:", initialVariants);
      setVariants(initialVariants);
    }
  }, [product]);

  const handleStockChange = (index, newStock) => {
    const updated = [...variants];
    updated[index].stock = Math.max(0, parseInt(newStock) || 0);
    setVariants(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("Original total stock:", product.totalStock);
    console.log(
      "New total stock:",
      variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)
    );

    try {
      await onUpdate(variants);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render until variants are loaded
  if (!variants || variants.length === 0) {
    return null;
  }

  const currentTotal = variants.reduce(
    (sum, v) => sum + (parseInt(v.stock) || 0),
    0
  );
  const hasChanges = currentTotal !== product.totalStock;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Stock - {product.name}</h2>
          <button onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="stock-form">
            <div className="stock-variants-list">
              {variants.map((variant, index) => (
                <div key={index} className="stock-variant">
                  <div className="variant-info">
                    <span className="variant-label">Size: {variant.size}</span>
                    <span className="variant-label">
                      Color: {variant.color}
                    </span>
                  </div>
                  <div className="stock-input-wrapper">
                    <label>Stock:</label>
                    <input
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(e) => handleStockChange(index, e.target.value)}
                      className="stock-input"
                      disabled={loading}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="total-stock-display">
              <strong>Total Stock:</strong>
              <span className={hasChanges ? "stock-changed" : ""}>
                {currentTotal}
                {hasChanges && (
                  <small
                    style={{
                      marginLeft: "8px",
                      color: "#6b7280",
                      fontSize: "0.875rem",
                    }}
                  >
                    (was {product.totalStock})
                  </small>
                )}
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Stock"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Products;
