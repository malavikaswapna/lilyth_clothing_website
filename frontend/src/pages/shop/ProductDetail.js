import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  Star,
  Minus,
  Plus,
  Truck,
  RefreshCw,
  Shield,
  ArrowLeft,
  ChartNoAxesColumnIncreasing,
  AlignVerticalJustifyCenterIcon,
  Ticket,
  Space,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  productsAPI,
  ordersAPI,
  userAPI,
  reviewsAPI,
} from "../../services/api";
import Loading from "../../components/common/Loading";
import Button from "../../components/common/Button";
import toast from "react-hot-toast";
import "./ProductDetail.css";
import BackgroundWrapper from "../../components/common/BackgroundWrapper";
import ProductReviews from "../../components/ProductReviews";

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [userCanReview, setUserCanReview] = useState(false);
  const [relevantOrderId, setRelevantOrderId] = useState(null);
  const [userExistingReview, setUserExistingReview] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [slug]);

  useEffect(() => {
    if (isAuthenticated && product) {
      checkUserCanReview();

      // TEMPORARY: Allow all authenticated users to review for testing
      console.log("TEMP: Setting userCanReview to true for testing");
      setUserCanReview(true);
    }
  }, [isAuthenticated, product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProductBySlug(slug);
      const productData = response.data.product;
      setProduct(productData);

      // Set default selections
      if (productData.variants && productData.variants.length > 0) {
        const firstAvailable = productData.variants.find((v) => v.stock > 0);
        if (firstAvailable) {
          setSelectedSize(firstAvailable.size);
          setSelectedColor(firstAvailable.color.name);
        }
      }

      // Load related products
      if (productData._id) {
        try {
          const relatedResponse = await productsAPI.getRelatedProducts(
            productData._id
          );
          setRelatedProducts(relatedResponse.data.products);
        } catch (error) {
          console.log("Failed to load related products");
        }
      }
    } catch (error) {
      console.error("Failed to load product:", error);
      toast.error("Product not found");
      navigate("/shop");
    } finally {
      setLoading(false);
    }
  };

  const checkUserCanReview = async () => {
    console.log("=== CHECKING USER CAN REVIEW ===");
    console.log("User authenticated:", isAuthenticated);
    console.log("Product ID:", product._id);

    try {
      // Check if user has purchased this product and can review it
      const response = await ordersAPI.getMyOrders({
        status: "delivered",
      });

      console.log("Orders response:", response.data);

      if (response.data.orders && response.data.orders.length > 0) {
        console.log("Found delivered orders:", response.data.orders.length);
        // Find orders that contain this product
        const orderWithProduct = response.data.orders.find((order) => {
          console.log("Checking order:", order._id);
          console.log("Order items:", order.items);

          return order.items.some((item) => {
            console.log("Item product ID:", item.product._id || item.product);
            console.log("Current product ID:", product._id);
            return (
              item.product._id === product._id || item.product === product._id
            );
          });
        });

        console.log("Order with product found:", !!orderWithProduct);

        if (orderWithProduct) {
          setUserCanReview(true);
          setRelevantOrderId(orderWithProduct._id);
          console.log("User can review: TRUE");
        }
      } else {
        console.log("No delivered orders found");
      }

      // Check if user already has a review for this product
      const reviewResponse = await reviewsAPI.getUserReviews();
      console.log("User reviews response:", reviewResponse.data);

      if (
        reviewResponse.data.reviews &&
        reviewResponse.data.reviews.length > 0
      ) {
        const existingReview = reviewResponse.data.reviews.find(
          (review) =>
            review.product._id === product._id || review.product === product._id
        );

        console.log("Existing review found:", !!existingReview);

        if (existingReview) {
          setUserExistingReview(existingReview);
          setUserCanReview(false);
          console.log("User can review: FALSE (already reviewed)");
        }
      }
    } catch (error) {
      console.error("Failed to check review eligibility:", error);
      setUserCanReview(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      toast.error("Please select size and color");
      return;
    }

    const variant = product.variants.find(
      (v) => v.size === selectedSize && v.color.name === selectedColor
    );

    if (!variant || variant.stock < quantity) {
      toast.error("Selected variant is out of stock");
      return;
    }

    try {
      setAddingToCart(true);
      await addToCart(product._id, selectedSize, selectedColor, quantity);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to add to wishlist");
      return;
    }

    try {
      if (isWishlisted) {
        await userAPI.removeFromWishlist(product._id);
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await userAPI.addToWishlist(product._id);
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch (error) {
      console.error("Wishlist error:", error);
      toast.error("Failed to update wishlist");
    }
  };

  const getSelectedVariant = () => {
    return product.variants.find(
      (v) => v.size === selectedSize && v.color.name === selectedColor
    );
  };

  const getAvailableSizes = () => {
    if (!selectedColor) return [];
    return product.variants
      .filter((v) => v.color.name === selectedColor && v.stock > 0)
      .map((v) => v.size);
  };

  const getAvailableColors = () => {
    if (!selectedSize) return [];
    return product.variants
      .filter((v) => v.size === selectedSize && v.stock > 0)
      .map((v) => v.color);
  };

  const currentPrice = product?.salePrice || product?.price;
  const hasDiscount = product?.salePrice && product?.price > product?.salePrice;
  const discountPercentage = hasDiscount
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  if (loading) {
    return <Loading size="lg" text="Loading product..." fullScreen />;
  }

  if (!product) {
    return (
      <div className="container">
        <div className="product-not-found">
          <h2>Product not found</h2>
          <Button onClick={() => navigate("/shop")}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="product-detail">
        <div className="container">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={18} />
              Back
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item">{product.category?.name}</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{product.name}</span>
          </div>

          <div className="product-content">
            {/* Image Gallery */}
            <div className="product-images">
              <div className="main-image">
                <img
                  src={product.images[selectedImage]?.url}
                  alt={product.images[selectedImage]?.alt || product.name}
                  className="main-product-image"
                />
                {hasDiscount && (
                  <span className="discount-badge">-{discountPercentage}%</span>
                )}
                {product.isNewArrival && <span className="new-badge">New</span>}
              </div>

              {product.images.length > 1 && (
                <div className="image-thumbnails">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${
                        index === selectedImage ? "active" : ""
                      }`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img
                        src={image.url}
                        alt={image.alt || `${product.name} ${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="product-info">
              <div className="product-header">
                <h1 className="product-title">{product.name}</h1>
                <button
                  className={`wishlist-btn ${isWishlisted ? "active" : ""}`}
                  onClick={handleWishlistToggle}
                >
                  <Heart size={20} />
                </button>
              </div>

              <p className="product-brand">{product.brand}</p>

              {/* Rating */}
              {product.averageRating > 0 && (
                <div className="product-rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < Math.floor(product.averageRating) ? "filled" : ""
                        }
                      />
                    ))}
                  </div>
                  <span className="rating-text">
                    {product.averageRating} ({product.reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Pricing */}
              <div className="product-pricing">
                <span className="current-price">₹{currentPrice}</span>
                {hasDiscount && (
                  <span className="original-price">₹{product.price}</span>
                )}
              </div>

              {/* Description */}
              <div className="product-description">
                <p>{product.description}</p>
              </div>

              {/* Color Selection */}
              {product.variants && product.variants.length > 0 && (
                <div className="variant-selection">
                  <div className="color-selection">
                    <h3>
                      Color:{" "}
                      <span className="selected-value">{selectedColor}</span>
                    </h3>
                    <div className="color-options">
                      {[
                        ...new Map(
                          product.variants.map((v) => [v.color.name, v.color])
                        ).values(),
                      ].map((color) => (
                        <button
                          key={color.name}
                          className={`color-option ${
                            selectedColor === color.name ? "active" : ""
                          }`}
                          onClick={() => {
                            setSelectedColor(color.name);
                            // Reset size if current size not available in this color
                            const availableSizes = product.variants
                              .filter(
                                (v) =>
                                  v.color.name === color.name && v.stock > 0
                              )
                              .map((v) => v.size);
                            if (!availableSizes.includes(selectedSize)) {
                              setSelectedSize(availableSizes[0] || "");
                            }
                          }}
                          style={{ backgroundColor: color.hexCode }}
                          title={color.name}
                        >
                          <span className="color-name">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selection */}
                  <div className="size-selection">
                    <h3>
                      Size:{" "}
                      <span className="selected-value">{selectedSize}</span>
                    </h3>
                    <div className="size-options">
                      {[...new Set(product.variants.map((v) => v.size))].map(
                        (size) => {
                          const isAvailable = selectedColor
                            ? product.variants.some(
                                (v) =>
                                  v.size === size &&
                                  v.color.name === selectedColor &&
                                  v.stock > 0
                              )
                            : product.variants.some(
                                (v) => v.size === size && v.stock > 0
                              );

                          return (
                            <button
                              key={size}
                              className={`size-option ${
                                selectedSize === size ? "active" : ""
                              } ${!isAvailable ? "disabled" : ""}`}
                              onClick={() => {
                                if (isAvailable) {
                                  setSelectedSize(size);
                                  // Reset color if current color not available in this size
                                  if (selectedColor) {
                                    const availableColors = product.variants
                                      .filter(
                                        (v) => v.size === size && v.stock > 0
                                      )
                                      .map((v) => v.color.name);
                                    if (
                                      !availableColors.includes(selectedColor)
                                    ) {
                                      setSelectedColor(
                                        availableColors[0] || ""
                                      );
                                    }
                                  }
                                }
                              }}
                              disabled={!isAvailable}
                            >
                              {size}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity and Add to Cart */}
              <div className="purchase-section">
                <div className="quantity-selector">
                  <button
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => {
                      const variant = getSelectedVariant();
                      if (variant && quantity < variant.stock) {
                        setQuantity(quantity + 1);
                      }
                    }}
                    disabled={
                      !getSelectedVariant() ||
                      quantity >= getSelectedVariant()?.stock
                    }
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <Button
                  className="add-to-cart-btn"
                  onClick={handleAddToCart}
                  loading={addingToCart}
                  disabled={
                    !selectedSize ||
                    !selectedColor ||
                    !getSelectedVariant()?.stock
                  }
                >
                  <ShoppingBag size={18} />
                  Add to Cart - ₹{(currentPrice * quantity).toFixed(2)}
                </Button>
              </div>

              {/* Stock Info */}
              {getSelectedVariant() && (
                <div className="stock-info">
                  {getSelectedVariant().stock > 0 ? (
                    <span className="in-stock">
                      {getSelectedVariant().stock} in stock
                    </span>
                  ) : (
                    <span className="out-of-stock">Out of stock</span>
                  )}
                </div>
              )}

              {/* Features */}
              <div className="product-features">
                <div className="feature-item">
                  <Truck size={28} />
                  <div>
                    <h4>Free Shipping</h4>
                    <p>On orders over ₹2000</p>
                  </div>
                </div>
                <div className="feature-item">
                  <RefreshCw size={20} />
                  <div>
                    <h4>Easy Returns</h4>
                    <p>30-day return policy</p>
                  </div>
                </div>
                <div className="feature-item">
                  <Shield size={20} />
                  <div>
                    <h4>Secure Payment</h4>
                    <p>Your payment is secure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="product-details-tabs">
            <div className="tab-content">
              <div className="details-section">
                <h3>Product Details</h3>
                {product.materials && (
                  <div className="detail-item">
                    <strong>Materials:</strong> {product.materials.join(", ")}
                  </div>
                )}
                {product.features && (
                  <div className="detail-item">
                    <strong>Features:</strong> {product.features.join(", ")}
                  </div>
                )}
                {product.careInstructions && (
                  <div className="detail-item">
                    <strong>Care Instructions:</strong>
                    <ul>
                      {product.careInstructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="related-products">
              <h3>You Might Also Like</h3>
              <div className="related-products-grid">
                {relatedProducts.map((relatedProduct) => (
                  <div
                    key={relatedProduct._id}
                    className="related-product-card"
                  >
                    <button
                      onClick={() =>
                        navigate(`/product/${relatedProduct.slug}`)
                      }
                      className="related-product-link"
                    >
                      <img
                        src={relatedProduct.images?.[0]?.url}
                        alt={relatedProduct.name}
                        className="related-product-image"
                      />
                      <div className="related-product-info">
                        <h4>{relatedProduct.name}</h4>
                        <p className="related-product-price">
                          ₹{relatedProduct.salePrice || relatedProduct.price}
                        </p>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ProductReviews
            productId={product._id}
            userCanReview={userCanReview}
            orderId={relevantOrderId}
            existingUserReview={userExistingReview}
          />
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default ProductDetail;
