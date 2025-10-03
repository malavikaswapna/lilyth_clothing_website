// Shop.js
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Grid, List, ChevronDown, X } from "lucide-react";
import { productsAPI, categoriesAPI } from "../../services/api";
import ProductCard from "../../components/product/ProductCard";
import Loading from "../../components/common/Loading";
import "./Shop.css";
import ScrollReveal from "../../components/common/ScrollReveal";
import BackgroundWrapper from "../../components/common/BackgroundWrapper";

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    search: searchParams.get("search") || "",
    sort: searchParams.get("sort") || "newest",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    size: searchParams.get("size") || "",
    color: searchParams.get("color") || "",
    featured: searchParams.get("featured") === "true",
    newArrivals: searchParams.get("newArrivals") === "true",
    onSale: searchParams.get("onSale") === "true",
  });

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "popular", label: "Most Popular" },
    { value: "rating", label: "Highest Rated" },
  ];

  const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL"];
  const colorOptions = [
    { name: "Black", value: "Black" },
    { name: "White", value: "White" },
    { name: "Navy Blue", value: "Navy Blue" },
    { name: "Gray", value: "Gray" },
    { name: "Beige", value: "Beige" },
    { name: "Red", value: "Red" },
    { name: "Pink", value: "Pink" },
    { name: "Rose Pink", value: "Rose Pink" },
    { name: "Blue", value: "Blue" },
    { name: "Green", value: "Green" },
    { name: "Yellow", value: "Yellow" },
    { name: "Purple", value: "Purple" },
    { name: "Brown", value: "Brown" },
    { name: "Cream", value: "Cream" },
  ];

  // Load categories and products
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filters, searchParams]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      const allCategories = [
        { _id: "", name: "All Items", slug: "" },
        ...response.data.categories,
      ];
      setCategories(allCategories);
    } catch (error) {
      console.error("Failed to load categories:", error);
      // Fallback categories if API fails
      setCategories([
        { _id: "", name: "All Items", slug: "" },
        { _id: "1", name: "Dresses", slug: "dresses" },
        { _id: "2", name: "Activewear", slug: "activewear" },
        { _id: "3", name: "Indo-Western", slug: "indo-western" },
        { _id: "4", name: "Tops", slug: "tops" },
        { _id: "5", name: "Bottoms", slug: "bottoms" },
        { _id: "6", name: "Sleepwear", slug: "sleepwear" },
        { _id: "7", name: "Cord Sets", slug: "cord-sets" },
      ]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: searchParams.get("page") || 1,
        limit: 12,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === false) {
          delete params[key];
        }
      });

      console.log("Loading products with params:", params);
      const response = await productsAPI.getProducts(params);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
      setPagination({ total: 0, pages: 0, page: 1 });
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const newParams = new URLSearchParams();
    Object.keys(newFilters).forEach((key) => {
      if (
        newFilters[key] &&
        newFilters[key] !== false &&
        newFilters[key] !== ""
      ) {
        newParams.set(key, newFilters[key]);
      }
    });
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    const clearedFilters = {
      category: "",
      search: filters.search, // Keep search term
      sort: "newest",
      minPrice: "",
      maxPrice: "",
      size: "",
      color: "",
      featured: false,
      newArrivals: false,
      onSale: false,
    };
    setFilters(clearedFilters);

    const newParams = new URLSearchParams();
    if (filters.search) {
      newParams.set("search", filters.search);
    }
    setSearchParams(newParams);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key];
      return value && value !== "" && value !== false && key !== "sort";
    }).length;
  };

  const getCategoryDisplayName = (categorySlug) => {
    if (!categorySlug) return "All Items";
    const category = categories.find((c) => c.slug === categorySlug);
    return category ? category.name : "Shop";
  };

  const getPageTitle = () => {
    if (filters.search) return `Search: "${filters.search}"`;
    if (filters.featured) return "Featured Items";
    if (filters.newArrivals) return "New Arrivals";
    if (filters.onSale) return "Sale Items";
    return getCategoryDisplayName(filters.category);
  };

  return (
    <BackgroundWrapper>
      <div className="shop">
        <div className="container">
          {/* Header */}
          <div className="shop-header">
            <div className="shop-title-section">
              <h1 className="shop-title">{getPageTitle()}</h1>
              {!loading && (
                <p className="shop-subtitle">
                  {pagination.total || 0}{" "}
                  {pagination.total === 1 ? "item" : "items"}
                </p>
              )}
            </div>

            <div className="shop-controls">
              {/* Sort */}
              <div className="sort-dropdown">
                <select
                  value={filters.sort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className="sort-select"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode */}
              <div className="view-controls">
                <button
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid size={18} />
                </button>
                <button
                  className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List size={18} />
                </button>
              </div>

              {/* Filter Toggle */}
              <button
                className="filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                <span>Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="filter-count">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="shop-content">
            {/* Sidebar Filters */}
            <aside className={`shop-sidebar ${showFilters ? "show" : ""}`}>
              <div className="sidebar-header">
                <h3>Filters</h3>
                <button
                  className="close-sidebar"
                  onClick={() => setShowFilters(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="filter-section">
                <h4>Categories</h4>
                <div className="filter-options">
                  {categories.map((category) => (
                    <label
                      key={category._id || category.slug}
                      className="filter-option"
                    >
                      <input
                        type="radio"
                        name="category"
                        value={category.slug}
                        checked={filters.category === category.slug}
                        onChange={(e) =>
                          updateFilter("category", e.target.value)
                        }
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4>Price Range</h4>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => updateFilter("minPrice", e.target.value)}
                    className="price-input"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilter("maxPrice", e.target.value)}
                    className="price-input"
                  />
                </div>
              </div>

              <div className="filter-section">
                <h4>Size</h4>
                <div className="size-options">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      className={`size-btn ${
                        filters.size === size ? "active" : ""
                      }`}
                      onClick={() =>
                        updateFilter("size", filters.size === size ? "" : size)
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4>Color</h4>
                <div className="color-options">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      className={`color-btn ${
                        filters.color === color.value ? "active" : ""
                      }`}
                      onClick={() =>
                        updateFilter(
                          "color",
                          filters.color === color.value ? "" : color.value
                        )
                      }
                      title={color.name}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4>Special Collections</h4>
                <div className="filter-options">
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.featured}
                      onChange={(e) =>
                        updateFilter("featured", e.target.checked)
                      }
                    />
                    Featured Items
                  </label>
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.newArrivals}
                      onChange={(e) =>
                        updateFilter("newArrivals", e.target.checked)
                      }
                    />
                    New Arrivals
                  </label>
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.onSale}
                      onChange={(e) => updateFilter("onSale", e.target.checked)}
                    />
                    Sale Items
                  </label>
                </div>
              </div>

              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear All Filters
              </button>
            </aside>

            {/* Products Grid */}
            <main className="shop-main">
              {loading ? (
                <Loading size="lg" text="Loading products..." />
              ) : products.length === 0 ? (
                <ScrollReveal direction="fade">
                  <div className="no-products">
                    <h3>No products found</h3>
                    <p>
                      {filters.category
                        ? `No items available in ${getCategoryDisplayName(
                            filters.category
                          )} category.`
                        : "Try adjusting your filters or search terms."}
                    </p>
                    <button className="btn btn-primary" onClick={clearFilters}>
                      Clear Filters
                    </button>
                  </div>
                </ScrollReveal>
              ) : (
                <>
                  <div className={`products-grid ${viewMode}`}>
                    {products.map((product, index) => (
                      <ScrollReveal
                        key={product._id}
                        direction="up"
                        delay={Math.min(index * 0.05, 0.5)} // Cap delay at 0.5s
                      >
                        <ProductCard product={product} viewMode={viewMode} />
                      </ScrollReveal>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="pagination">
                      {Array.from(
                        { length: pagination.pages },
                        (_, i) => i + 1
                      ).map((page) => (
                        <button
                          key={page}
                          className={`page-btn ${
                            pagination.page === page ? "active" : ""
                          }`}
                          onClick={() => {
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set("page", page);
                            setSearchParams(newParams);
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Shop;
