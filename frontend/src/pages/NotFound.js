import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import './NotFound.css';
import BackgroundWrapper from '../components/common/BackgroundWrapper';

const NotFound = () => {
  return (
    <BackgroundWrapper>
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <div className="error-graphic">
            <h1 className="error-code">404</h1>
            <div className="error-illustration">
              <div className="floating-elements">
                <div className="element element-1"></div>
                <div className="element element-2"></div>
                <div className="element element-3"></div>
              </div>
            </div>
          </div>
          
          <div className="error-message">
            <h2>Oops! Page Not Found</h2>
            <p>The page you're looking for seems to have wandered off. Don't worry, even the best outfits sometimes go missing!</p>
          </div>

          <div className="error-actions">
            <Link to="/" className="btn btn-primary">
              <Home size={18} />
              Go Home
            </Link>
            <Link to="/shop" className="btn btn-outline">
              <Search size={18} />
              Browse Shop
            </Link>
            <button onClick={() => window.history.back()} className="btn btn-ghost">
              <ArrowLeft size={18} />
              Go Back
            </button>
          </div>

          <div className="helpful-links">
            <h3>Looking for something specific?</h3>
            <div className="links-grid">
              <Link to="/shop?category=dresses" className="help-link">
                Popular Dresses
              </Link>
              <Link to="/shop?newArrivals=true" className="help-link">
                New Arrivals
              </Link>
              <Link to="/shop?onSale=true" className="help-link">
                Sale Items
              </Link>
              <Link to="/help/faq" className="help-link">
                FAQ
              </Link>
              <Link to="/help/contact" className="help-link">
                Contact Us
              </Link>
              <Link to="/account" className="help-link">
                My Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </BackgroundWrapper>
  );
};

export default NotFound;