import React from "react";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import ScrollReveal from "../components/common/ScrollReveal";
import WhatsAppChat from "../components/common/WhatsAppChat";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Clock,
} from "lucide-react";
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
                your lifestyle and expresses your unique style. More categories
                launching soon!
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
                src="https://i.pinimg.com/1200x/10/0f/be/100fbea502ce917357ba4af016fa41fe.jpg"
                alt="LILYTH Fashion"
                className="hero-img"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Features Section */}
      {/* Trust Badges Section */}
      <section className="trust-badges">
        <div className="container">
          <ScrollReveal direction="up" delay={0.1}>
            <div className="trust-badges-grid">
              <div className="trust-badge">
                <div className="trust-icon pink">
                  <Truck size={28} />
                </div>
                <h3 className="trust-title">Free Shipping</h3>
                <p className="trust-desc">On all orders over ₹2000</p>
              </div>
              <div className="trust-badge">
                <div className="trust-icon blue">
                  <RefreshCw size={28} />
                </div>
                <h3 className="trust-title">Easy Returns</h3>
                <p className="trust-desc">30-day no-hassle returns</p>
              </div>
              <div className="trust-badge">
                <div className="trust-icon yellow">
                  <Shield size={28} />
                </div>
                <h3 className="trust-title">Secure Checkout</h3>
                <p className="trust-desc">SSL-encrypted payments</p>
              </div>
              <div className="trust-badge">
                <div className="trust-icon purple">
                  <Star size={28} />
                </div>
                <h3 className="trust-title">Curated Quality</h3>
                <p className="trust-desc">Handpicked with love</p>
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
                Indo-Western available now • More styles launching soon
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="categories-grid">
              {/* AVAILABLE NOW - Indo-Western */}
              <Link
                to="/shop?category=indo-western"
                className="category-card available"
              >
                <img
                  src="https://i.pinimg.com/736x/c7/39/ac/c739ac1b82625b7bc05d2a3a5c1fe1b7.jpg"
                  alt="Indo-Western"
                  className="category-image"
                />
                <div className="category-overlay">
                  <div className="available-badge">Available Now</div>
                  <h3 className="category-title">Indo-Western</h3>
                  <p className="category-description">Fusion Fashion</p>
                </div>
              </Link>

              {/* COMING SOON Categories */}
              <div className="category-card coming-soon">
                <img
                  src="https://i.pinimg.com/736x/da/eb/10/daeb1097ff9e5dc93c8366c00e28c43a.jpg"
                  alt="Tops"
                  className="category-image"
                />
                <div className="category-overlay">
                  <div className="coming-soon-badge">
                    <Clock size={16} />
                    Coming Soon
                  </div>
                  <h3 className="category-title">Tops</h3>
                  <p className="category-description">Refined Essentials</p>
                </div>
              </div>

              <div className="category-card coming-soon">
                <img
                  src="https://i.pinimg.com/736x/0b/32/6f/0b326feaa578a869db576f437b49e973.jpg"
                  alt="Bottoms"
                  className="category-image"
                />
                <div className="category-overlay">
                  <div className="coming-soon-badge">
                    <Clock size={16} />
                    Coming Soon
                  </div>
                  <h3 className="category-title">Bottoms</h3>
                  <p className="category-description">Perfect Fit</p>
                </div>
              </div>

              <div className="category-card coming-soon">
                <img
                  src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                  alt="Dresses"
                  className="category-image"
                />
                <div className="category-overlay">
                  <div className="coming-soon-badge">
                    <Clock size={16} />
                    Coming Soon
                  </div>
                  <h3 className="category-title">Dresses</h3>
                  <p className="category-description">Elegant & Effortless</p>
                </div>
              </div>
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
                  src="https://i.pinimg.com/736x/d5/b9/25/d5b92507e098d5f83a9d90a6897cdd8e.jpg"
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

      {/* WhatsApp Chat Widget */}
      <WhatsAppChat />
    </BackgroundWrapper>
  );
};

export default Home;
