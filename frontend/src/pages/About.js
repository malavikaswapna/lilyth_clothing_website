import React from "react";
import { Link } from "react-router-dom";
import { Heart, Users, Award, Truck } from "lucide-react";
import ScrollReveal from "../components/common/ScrollReveal";
import "./About.css";
import BackgroundWrapper from "../components/common/BackgroundWrapper";

const About = () => {
  return (
    <BackgroundWrapper>
      <div className="about-page">
        {/* Hero Section */}
        <ScrollReveal direction="fade" duration={0.8}>
          <section className="about-hero">
            <div className="container">
              <div className="hero-content">
                <div className="hero-text">
                  <h1>About LILYTH</h1>
                  <p className="hero-subtitle">Find Your Perfect Fit</p>
                  <p className="hero-description">
                    We believe that every woman deserves to feel confident and
                    beautiful in her own skin. Our carefully curated collection
                    celebrates individuality while offering timeless pieces that
                    fit seamlessly into your lifestyle.
                  </p>
                </div>
                <div className="hero-image">
                  <img
                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="LILYTH Story"
                  />
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Our Story */}
        <section className="our-story">
          <div className="container">
            <div className="story-content">
              <ScrollReveal direction="left">
                <div className="story-image">
                  <img
                    src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                    alt="Our Story"
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.2}>
                <div className="story-text">
                  <h2>Our Story</h2>
                  <p>
                    Founded in 2025, Lilyth began with a simple mission: to make
                    high-quality, stylish clothing accessible to women
                    everywhere. We noticed a gap in the market for pieces that
                    were both fashion-forward and inclusive, comfortable yet
                    sophisticated.
                  </p>
                  <p>
                    Our name, Lilyth, reflects timeless femininity and graceful
                    elegance. With careful attention from design to detail,
                    every piece is created to embody luxury, comfort, and the
                    effortless beauty of the women who wear it.
                  </p>
                  <p>
                    Today, we're proud to serve thousands of women who have made
                    Lilyth part of their personal style journey. Each piece in
                    our collection is chosen with intention, designed to empower
                    and inspire confidence.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="our-values">
          <div className="container">
            <ScrollReveal direction="up">
              <h2>Our Values</h2>
            </ScrollReveal>

            <div className="values-grid">
              <ScrollReveal direction="up" delay={0.1}>
                <div className="value-item">
                  <div className="value-icon">
                    <Heart size={32} />
                  </div>
                  <h3>Quality First</h3>
                  <p>
                    Every piece is carefully selected and tested for quality,
                    comfort, and durability. We believe in clothing that lasts.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.2}>
                <div className="value-item">
                  <div className="value-icon">
                    <Users size={32} />
                  </div>
                  <h3>Inclusive Style</h3>
                  <p>
                    Fashion should be for everyone. Our size-inclusive range
                    ensures every woman can find pieces that fit and flatter.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.3}>
                <div className="value-item">
                  <div className="value-icon">
                    <Award size={32} />
                  </div>
                  <h3>Sustainable Choices</h3>
                  <p>
                    We're committed to making responsible choices in our
                    sourcing and packaging, caring for both our customers and
                    our planet.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.4}>
                <div className="value-item">
                  <div className="value-icon">
                    <Truck size={32} />
                  </div>
                  <h3>Exceptional Service</h3>
                  <p>
                    From browsing to delivery and beyond, we're here to ensure
                    your experience with LILYTH is nothing short of exceptional.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="our-team">
          <div className="container">
            <ScrollReveal direction="up">
              <h2>Meet Our Team</h2>
              <p className="team-intro">
                Behind Lilyth is a passionate team of fashion enthusiasts,
                stylists, and customer service experts who are dedicated to
                helping you find your perfect fit.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <div className="team-grid">
                <div className="team-member">
                  <img
                    src="https://i.postimg.cc/C52TKgfY/IMG-0747.jpg"
                    alt="Amritha"
                  />
                  <h3>Amritha</h3>
                  <p>Founder & Creative Director</p>
                  <p>
                    "Fashion should make you feel like the best version of
                    yourself."
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Call to Action */}
        <ScrollReveal direction="up">
          <section className="cta-section">
            <div className="container">
              <div className="cta-content">
                <h2>Ready to Find Your Fit?</h2>
                <p>
                  Join thousands of women who have discovered their perfect
                  style with Lilyth.
                </p>
                <div className="cta-actions">
                  <Link to="/shop" className="btn btn-primary btn-lg">
                    Shop Collection
                  </Link>
                  <Link to="/help/contact" className="btn btn-outline btn-lg">
                    Get in Touch
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </BackgroundWrapper>
  );
};

export default About;
