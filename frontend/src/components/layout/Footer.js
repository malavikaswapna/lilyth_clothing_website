import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, Facebook, Instagram, MessageCircle } from "lucide-react";
import logo from "../../assets/logo.png";
import "./Footer.css";
import api from "../../services/api";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!email) {
      setMessage({ type: "error", text: "Please enter your email address" });
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.post("/newsletter/subscribe", {
        email: email.trim(),
        source: "footer",
      });

      setMessage({
        type: "success",
        text: response.data.message || "Thank you for subscribing!",
      });
      setEmail(""); // Clear the input on success

      // Clear success message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    } catch (error) {
      console.error("Newsletter subscription error:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to subscribe. Please try again later.";

      setMessage({ type: "error", text: errorMessage });

      // Clear error message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Company Info */}
          <div className="footer-section">
            <Link to="/" className="footer-logo">
              <img src={logo} alt="LILYTH" className="footer-logo-image" />
            </Link>
            <p className="footer-description">
              Curated fashion pieces that celebrate your individuality. Find
              clothing that fits your lifestyle and expresses your unique style.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a
                href="https://www.instagram.com/lilyth.in"
                className="social-link"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://wa.me/919188019110"
                className="social-link"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h3 className="footer-title">Shop</h3>
            <ul className="footer-links">
              <li>
                <Link to="/shop?category=dresses">Dresses</Link>
              </li>
              <li>
                <Link to="/shop?category=tops">Tops</Link>
              </li>
              <li>
                <Link to="/shop?category=bottoms">Bottoms</Link>
              </li>
              <li>
                <Link to="/shop?category=sleepwear">Sleepwear</Link>
              </li>
              <li>
                <Link to="/shop?newArrivals=true">New Arrivals</Link>
              </li>
              <li>
                <Link to="/shop?onSale=true">Sale</Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="footer-section">
            <h3 className="footer-title">Customer Care</h3>
            <ul className="footer-links">
              <li>
                <Link to="/help/contact">Contact Us</Link>
              </li>
              <li>
                <Link to="/help/shipping">Shipping & Returns</Link>
              </li>
              <li>
                <Link to="/help/size-guide">Size Guide</Link>
              </li>
              <li>
                <Link to="/care-instructions">Care Instructions</Link>
              </li>
              <li>
                <Link to="/help/faq">FAQ</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-section">
            <h3 className="footer-title">Stay Connected</h3>
            <p className="newsletter-description">
              Be the first to know about new arrivals and exclusive offers.
            </p>
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="submit"
                className="newsletter-btn"
                disabled={loading}
              >
                {loading ? "Subscribing..." : "Subscribe"}
              </button>
            </form>

            {/* Success/Error Message */}
            {message.text && (
              <div
                style={{
                  padding: "10px",
                  marginTop: "10px",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  backgroundColor:
                    message.type === "success" ? "#d4edda" : "#f8d7da",
                  color: message.type === "success" ? "#155724" : "#721c24",
                  border: `1px solid ${
                    message.type === "success" ? "#c3e6cb" : "#f5c6cb"
                  }`,
                }}
              >
                {message.text}
              </div>
            )}

            <div className="contact-info">
              <div className="contact-item">
                <Mail size={16} />
                <span>clothingbrand@lilyth.in</span>
              </div>
              <div className="contact-item">
                <Phone size={16} />
                <span>+91 9447598431</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="copyright">© 2025 LILYTH. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
