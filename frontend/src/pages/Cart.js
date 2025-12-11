//src/pages/Cart.js
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useGuest } from "../context/GuestContext"; // ✅ ADD THIS
import Loading from "../components/common/Loading";
import Button from "../components/common/Button";
import GuestCartPrompt from "../components/cart/GuestCartPrompt";
import "./Cart.css";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import ScrollReveal from "../components/common/ScrollReveal";

const Cart = () => {
  const {
    cart,
    items,
    savedItems,
    loading,
    updateCartItem,
    removeFromCart,
    clearCart,
    moveToCart,
    loadCart,
  } = useCart();

  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { guestId } = useGuest();
  const navigate = useNavigate();
  const {
    guestItems,
    guestSubtotal,
    updateGuestCartItem,
    removeFromGuestCart,
  } = useGuest();
  const subtotal = isAuthenticated ? cart?.subtotal || 0 : guestSubtotal || 0;

  useEffect(() => {
    console.log("Cart component state:", {
      isAuthenticated,
      guestId, // ✅ ADD THIS
      user: user?.firstName || "No user",
      cartItems: items?.length || 0,
      cartLoading: loading,
    });
  }, [isAuthenticated, authLoading, user, items, loading, guestId]); // ✅ ADD guestId

  if (authLoading) {
    return <Loading size="lg" text="Loading..." fullScreen />;
  }

  // ✅ UPDATED: Show cart for both authenticated and guest users
  if (loading) {
    return <Loading size="lg" text="Loading your cart..." fullScreen />;
  }

  const handleQuantityChange = async (item, newQuantity) => {
    if (newQuantity < 1) return;

    if (isAuthenticated) {
      await updateCartItem(
        item.product._id,
        item.variant.size,
        item.variant.color.name,
        newQuantity
      );
    } else {
      await updateGuestCartItem(
        item.product._id,
        item.variant.size,
        item.variant.color.name,
        newQuantity
      );
    }
  };

  const handleRemoveItem = async (item) => {
    if (isAuthenticated) {
      await removeFromCart(
        item.product._id,
        item.variant.size,
        item.variant.color.name
      );
    } else {
      await removeFromGuestCart(
        item.product._id,
        item.variant.size,
        item.variant.color.name
      );
    }
  };

  const handleMoveToCart = async (item) => {
    await moveToCart(
      item.product._id,
      item.variant.size,
      item.variant.color.name
    );
  };

  const cartItems = isAuthenticated ? items : guestItems;

  if (!cartItems || cartItems.length === 0) {
    return (
      <BackgroundWrapper>
        <div className="cart-page">
          <div className="container">
            <ScrollReveal direction="fade">
              <div className="cart-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                  <ArrowLeft size={20} />
                  Continue Shopping
                </button>
                <h1 className="cart-title">Shopping Cart</h1>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up">
              <div className="empty-cart">
                <ShoppingBag size={64} className="empty-icon" />
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <Link to="/shop" className="btn btn-primary">
                  Start Shopping
                </Link>
              </div>
            </ScrollReveal>

            {savedItems && savedItems.length > 0 && (
              <ScrollReveal direction="up" delay={0.2}>
                <div className="saved-items-section">
                  <h3>Saved for Later ({savedItems.length})</h3>
                  <div className="saved-items">
                    {savedItems.map((item, index) => (
                      <div key={index} className="saved-item">
                        <div className="item-image">
                          <img
                            src={item.product.images?.[0]?.url}
                            alt={item.product.name}
                          />
                        </div>
                        <div className="item-details">
                          <Link
                            to={`/product/${item.product.slug}`}
                            className="item-name"
                          >
                            {item.product.name}
                          </Link>
                          <p className="item-variant">
                            Size: {item.variant.size} | Color:{" "}
                            {item.variant.color.name}
                          </p>
                          <p className="item-price">
                            ₹{item.product.salePrice || item.product.price}
                          </p>
                        </div>
                        <div className="item-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveToCart(item)}
                          >
                            Move to Cart
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="cart-page">
        <div className="container">
          <ScrollReveal direction="fade">
            <div className="cart-header">
              <button onClick={() => navigate(-1)} className="back-btn">
                <ArrowLeft size={20} />
                Continue Shopping
              </button>
              <h1 className="cart-title">Shopping Cart ({cartItems.length})</h1>
              <button onClick={clearCart} className="clear-cart-btn">
                Clear Cart
              </button>
            </div>
          </ScrollReveal>

          {/* ✅ NEW: Show guest prompt if not authenticated and has items */}
          {!isAuthenticated && cartItems.length > 0 && (
            <ScrollReveal direction="up" delay={0.1}>
              <GuestCartPrompt itemCount={guestItems?.length || 0} />
            </ScrollReveal>
          )}

          <div className="cart-content">
            <div className="cart-items">
              {cartItems.map((item, index) => (
                <ScrollReveal
                  key={index}
                  direction="up"
                  delay={Math.min(index * 0.1, 0.5)}
                >
                  <div className="cart-item">
                    <div className="item-image">
                      <Link to={`/product/${item.product.slug}`}>
                        <img
                          src={
                            item.product.images?.find((img) => img.isPrimary)
                              ?.url || item.product.images?.[0]?.url
                          }
                          alt={item.product.name}
                        />
                      </Link>
                    </div>

                    <div className="item-details">
                      <Link
                        to={`/product/${item.product.slug}`}
                        className="item-name"
                      >
                        {item.product.name}
                      </Link>
                      <p className="item-brand">{item.product.brand}</p>
                      <div className="item-variant">
                        <span>Size: {item.variant.size}</span>
                        <span>Color: {item.variant.color.name}</span>
                      </div>
                      <p className="item-price">
                        ₹{item.priceAtAdd}
                        {item.product.salePrice &&
                          item.product.price > item.product.salePrice && (
                            <span className="original-price">
                              ₹{item.product.price}
                            </span>
                          )}
                      </p>
                    </div>

                    <div className="item-quantity">
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity + 1)
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <p className="item-total">
                        ₹{(item.priceAtAdd * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="item-actions">
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveItem(item)}
                        title="Remove item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal direction="left" delay={0.3}>
              <div className="cart-summary">
                <div className="summary-card">
                  <h3>Order Summary</h3>

                  <div className="summary-row">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="free-shipping">
                      {subtotal >= 2000 ? "FREE" : "₹99"}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span>Tax</span>
                    <span>₹{(subtotal * 0.18).toFixed(2)}</span>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-row total">
                    <span>Total</span>
                    <span>
                      ₹
                      {(
                        subtotal +
                        (subtotal >= 2000 ? 0 : 99) +
                        subtotal * 0.18
                      ).toFixed(2)}
                    </span>
                  </div>

                  {/* ✅ UPDATED: Different checkout button based on auth status */}
                  {isAuthenticated ? (
                    <Link
                      to="/checkout"
                      className="btn btn-primary checkout-btn"
                    >
                      Proceed to Checkout
                    </Link>
                  ) : (
                    <Link
                      to="/guest-checkout"
                      className="btn btn-primary checkout-btn"
                    >
                      Continue as Guest
                    </Link>
                  )}

                  <div className="shipping-info">
                    <p>Free shipping across Kerala on orders over ₹2000</p>
                  </div>
                </div>

                {savedItems && savedItems.length > 0 && (
                  <div className="saved-items-card">
                    <h4>Saved for Later ({savedItems.length})</h4>
                    {savedItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="saved-item">
                        <img
                          src={item.product.images?.[0]?.url}
                          alt={item.product.name}
                          className="saved-item-image"
                        />
                        <div className="saved-item-info">
                          <p className="saved-item-name">{item.product.name}</p>
                          <p className="saved-item-price">
                            ₹{item.product.salePrice || item.product.price}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveToCart(item)}
                          >
                            Move to Cart
                          </Button>
                        </div>
                      </div>
                    ))}
                    {savedItems.length > 3 && (
                      <p className="saved-items-more">
                        +{savedItems.length - 3} more items
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Cart;
