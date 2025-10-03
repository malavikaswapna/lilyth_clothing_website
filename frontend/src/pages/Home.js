import React from "react";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import ScrollReveal from "../components/common/ScrollReveal";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Truck, Shield, RefreshCw } from "lucide-react";
import "./Home.css";

const Home = () => {
  return (
    <BackgroundWrapper className="home">
      {/* Hero Section */}
      <ScrollReveal direction="fade" duration={0.9}>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">Find Your Fit</h1>
              <p className="hero-subtitle">Discover Your Perfect Style</p>
              <p className="hero-description">
                Curated fashion pieces that celebrate your individuality. From
                elegant essentials to statement pieces, find clothing that fits
                your lifestyle and expresses your unique style.
              </p>
              <div className="hero-actions">
                <Link to="/shop" className="btn btn-primary btn-lg">
                  Explore Collection
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/shop?newArrivals=true"
                  className="btn btn-outline btn-lg"
                >
                  New Arrivals
                </Link>
              </div>
            </div>
            <div className="hero-image">
              <img
                src="https://i.postimg.cc/d3BWsxJd/image.jpg"
                alt="LILYTH Fashion"
                className="hero-img"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <ScrollReveal direction="up" delay={0.2}>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">
                  <Truck size={28} />
                </div>
                <h3 className="feature-title">Complimentary Shipping</h3>
                <p className="feature-description">
                  Free shipping on orders over ₹2000. Fast and reliable delivery
                  to your door.
                </p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <RefreshCw size={28} />
                </div>
                <h3 className="feature-title">Effortless Returns</h3>
                <p className="feature-description">
                  30-day return policy. Shop with confidence knowing you can
                  return anything.
                </p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Shield size={28} />
                </div>
                <h3 className="feature-title">Secure Checkout</h3>
                <p className="feature-description">
                  Your payment information is always protected with bank-level
                  security.
                </p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Star size={28} />
                </div>
                <h3 className="feature-title">Curated Quality</h3>
                <p className="feature-description">
                  Every piece is carefully selected for superior quality and
                  timeless style.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories">
        <div className="container">
          <ScrollReveal direction="up">
            <div className="section-header">
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">
                Discover pieces that define your style
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="categories-grid">
              <Link to="/shop?category=dresses" className="category-card large">
                <img
                  src="https://i.pinimg.com/736x/80/97/91/809791d59aa6ab9ec3eaad9a657278d3.jpg"
                  alt="Dresses"
                  className="category-image"
                />
                <div className="category-overlay">
                  <h3 className="category-title">Dresses</h3>
                  <p className="category-description">Elegant & Effortless</p>
                </div>
              </Link>

              <div className="category-group">
                <Link to="/shop?category=tops" className="category-card">
                  <img
                    src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                    alt="Tops"
                    className="category-image"
                  />
                  <div className="category-overlay">
                    <h3 className="category-title">Tops</h3>
                    <p className="category-description">Refined Essentials</p>
                  </div>
                </Link>

                <Link to="/shop?category=bottoms" className="category-card">
                  <img
                    src="https://images.unsplash.com/photo-1506629905332-b2f2d5d60e34?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                    alt="Bottoms"
                    className="category-image"
                  />
                  <div className="category-overlay">
                    <h3 className="category-title">Bottoms</h3>
                    <p className="category-description">Perfect Fit</p>
                  </div>
                </Link>
              </div>

              <Link
                to="/shop?category=activewear"
                className="category-card large"
              >
                <img
                  src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                  alt="Activewear"
                  className="category-image"
                />
                <div className="category-overlay">
                  <h3 className="category-title">Activewear</h3>
                  <p className="category-description">Statement Layers</p>
                </div>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="philosophy">
        <div className="container">
          <div className="philosophy-content">
            <ScrollReveal direction="left">
              <div className="philosophy-text">
                <h2 className="philosophy-title">Our Philosophy</h2>
                <p className="philosophy-description">
                  At LILYTH, we believe that the perfect fit goes beyond
                  measurements. It's about finding pieces that align with your
                  lifestyle, express your personality, and make you feel
                  confident in your own skin.
                </p>
                <p className="philosophy-description">
                  Every piece in our collection is chosen for its quality,
                  versatility, and timeless appeal. We're here to help you build
                  a wardrobe that truly fits you.
                </p>
                <Link to="/about" className="btn btn-outline">
                  Learn More About Us
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.2}>
              <div className="philosophy-image">
                <img
                  src="https://i.postimg.cc/d1ndLPTq/8568a5070c8fba1aad012e1632060ba5.jpg"
                  alt="LILYTH Philosophy"
                  className="philosophy-img"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <ScrollReveal direction="up">
            <div className="cta-content">
              <h2 className="cta-title">Ready to Find Your Fit?</h2>
              <p className="cta-description">
                Join the Lilyth community and discover clothing that truly fits
                your style.
              </p>
              <Link to="/shop" className="btn btn-primary btn-lg">
                Start Shopping
                <ArrowRight size={18} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </BackgroundWrapper>
  );
};

export default Home;
