import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { userAPI } from '../../services/api';
import './ProductCard.css';

const ProductCard = ({ product, viewMode = 'grid' }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    
    try {
      // Add to wishlist logic here
      await userAPI.addToWishlist(product._id);
    } catch (error) {
      console.error('Failed to update wishlist:', error);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (product.variants && product.variants.length > 0) {
      const firstAvailableVariant = product.variants.find(v => v.stock > 0);
      if (firstAvailableVariant) {
        await addToCart(
          product._id,
          firstAvailableVariant.size,
          firstAvailableVariant.color.name,
          1
        );
      }
    }
  };

  const currentPrice = product.salePrice || product.price;
  const hasDiscount = product.salePrice && product.price > product.salePrice;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
  const isOutOfStock = product.totalStock <= 0;

  if (viewMode === 'list') {
    return (
      <div className="product-card list-view">
        <Link to={`/product/${product.slug}`} className="product-link">
          <div className="product-image-container">
            {primaryImage && (
              <img 
                src={primaryImage.url} 
                alt={product.name}
                className="product-image"
              />
            )}
            {hasDiscount && (
              <span className="discount-badge">-{discountPercentage}%</span>
            )}
            {product.isNewArrival && (
              <span className="new-badge">New</span>
            )}
            {isOutOfStock && (
              <div className="out-of-stock-overlay">Out of Stock</div>
            )}
          </div>
          
          <div className="product-info">
            <div className="product-main-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-brand">{product.brand}</p>
              <p className="product-description">{product.shortDescription}</p>
              
              <div className="product-rating">
                {product.averageRating > 0 && (
                  <>
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={14} 
                          className={i < Math.floor(product.averageRating) ? 'filled' : ''}
                        />
                      ))}
                    </div>
                    <span className="rating-text">
                      ({product.reviewCount} reviews)
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="product-actions">
              <div className="product-pricing">
                <span className="current-price">₹{currentPrice}</span>
                {hasDiscount && (
                  <span className="original-price">₹{product.price}</span>
                )}
              </div>
              
              <div className="action-buttons">
                {isAuthenticated && (
                  <button 
                    className="wishlist-btn"
                    onClick={handleWishlistToggle}
                    aria-label="Add to wishlist"
                  >
                    <Heart size={18} />
                  </button>
                )}
                
                {!isOutOfStock && (
                  <button 
                    className="quick-add-btn"
                    onClick={handleQuickAdd}
                  >
                    <ShoppingBag size={18} />
                    Quick Add
                  </button>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="product-card grid-view">
      <Link to={`/product/${product.slug}`} className="product-link">
        <div className="product-image-container">
          {primaryImage && (
            <img 
              src={primaryImage.url} 
              alt={product.name}
              className="product-image"
            />
          )}
          {hasDiscount && (
            <span className="discount-badge">-{discountPercentage}%</span>
          )}
          {product.isNewArrival && (
            <span className="new-badge">New</span>
          )}
          {isOutOfStock && (
            <div className="out-of-stock-overlay">Out of Stock</div>
          )}
          
          <div className="product-overlay">
            <div className="overlay-actions">
              {isAuthenticated && (
                <button 
                  className="overlay-btn wishlist-btn"
                  onClick={handleWishlistToggle}
                  aria-label="Add to wishlist"
                >
                  <Heart size={18} />
                </button>
              )}
              
              {!isOutOfStock && (
                <button 
                  className="overlay-btn quick-add-btn"
                  onClick={handleQuickAdd}
                >
                  <ShoppingBag size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-brand">{product.brand}</p>
          
          <div className="product-rating">
            {product.averageRating > 0 && (
              <>
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      className={i < Math.floor(product.averageRating) ? 'filled' : ''}
                    />
                  ))}
                </div>
                <span className="rating-text">({product.reviewCount})</span>
              </>
            )}
          </div>
          
          <div className="product-pricing">
            <span className="current-price">₹{currentPrice}</span>
            {hasDiscount && (
              <span className="original-price">₹{product.price}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;