import React from "react";
import { HashRouter, Link, redirect } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  RefreshCcwDot,
  GitPullRequestCreate,
  HeartHandshake,
} from "lucide-react";
import logo from "../../assets/logo.png";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Company Info */}
          <div className="footer-section">
            <Link to="/" className="footer-logo">
              <img src={logo} alt="AMOURA" className="footer-logo-image" />
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
              >
                <Instagram size={18} />
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <Twitter size={18} />
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
                <Link to="/help/care">Care Instructions</Link>
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
            <form className="newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
                required
              />
              <button type="submit" className="newsletter-btn">
                Subscribe
              </button>
            </form>

            <div className="contact-info">
              <div className="contact-item">
                <Mail size={16} />
                <span>hello@lilyth.com</span>
              </div>
              <div className="contact-item">
                <Phone size={16} />
                <span>+91 1234567890</span>
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
