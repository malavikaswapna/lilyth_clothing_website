import React from "react";
import { Shield, Eye, Lock, UserCheck } from "lucide-react";
import "./Legal.css";
import BackgroundWrapper from "../components/common/BackgroundWrapper";

const Privacy = () => {
  return (
    <BackgroundWrapper>
      <div className="legal-page">
        <div className="container">
          <div className="legal-header">
            <Shield size={48} className="legal-icon" />
            <h1>Privacy Policy</h1>
            <p>Last updated: September 2025</p>
          </div>

          <div className="legal-content">
            <section className="legal-section">
              <h2>Information We Collect</h2>
              <div className="info-grid">
                <div className="info-item">
                  <Eye size={24} />
                  <h3>Personal Information</h3>
                  <p>
                    Name, email address, phone number, shipping and billing
                    addresses, and payment information when you make a purchase
                    or create an account.
                  </p>
                </div>
                <div className="info-item">
                  <UserCheck size={24} />
                  <h3>Account Data</h3>
                  <p>
                    Order history, preferences, wishlist items, and
                    communication history when you interact with our customer
                    service.
                  </p>
                </div>
                <div className="info-item">
                  <Lock size={24} />
                  <h3>Usage Information</h3>
                  <p>
                    How you interact with our website, including pages visited,
                    products viewed, and time spent browsing.
                  </p>
                </div>
              </div>
            </section>

            <section className="legal-section">
              <h2>How We Use Your Information</h2>
              <ul className="legal-list">
                <li>Process and fulfill your orders</li>
                <li>Provide customer service and support</li>
                <li>Send you order confirmations and shipping updates</li>
                <li>Improve our website and shopping experience</li>
                <li>Send promotional emails (with your consent)</li>
                <li>Prevent fraud and enhance security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>Information Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal information to
                third parties. We may share your information with:
              </p>
              <ul className="legal-list">
                <li>
                  <strong>Service Providers:</strong> Payment processors,
                  shipping companies, and email service providers
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law or
                  to protect our rights
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a
                  merger, sale, or acquisition
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>Data Security</h2>
              <p>
                We implement appropriate technical and organizational security
                measures to protect your personal information against
                unauthorized access, alteration, disclosure, or destruction.
                This includes:
              </p>
              <ul className="legal-list">
                <li>SSL encryption for data transmission</li>
                <li>Secure payment processing</li>
                <li>Regular security audits</li>
                <li>Limited access to personal information</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="legal-list">
                <li>Access the personal information we have about you</li>
                <li>Correct or update your personal information</li>
                <li>Delete your account and personal information</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data in a portable format</li>
              </ul>
              <p>
                To exercise these rights, please contact us at{" "}
                <a href="mailto:privacy@lilyth.com">privacy@lilyth.com</a>.
              </p>
            </section>

            <section className="legal-section">
              <h2>Cookies</h2>
              <p>
                We use cookies and similar technologies to enhance your browsing
                experience, analyze site traffic, and personalize content. You
                can control cookies through your browser settings, but disabling
                cookies may affect website functionality.
              </p>
            </section>

            <section className="legal-section">
              <h2>Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact
                us:
              </p>
              <div className="contact-info">
                <p>
                  Email:{" "}
                  <a href="mailto:clothingbrand@lilyth.in">
                    clothingbrand@lilyth.in
                  </a>
                </p>
                <p>Phone: +91 9447598431</p>
                <p>
                  Mail: LILYTH Privacy Team
                  <br />
                  Pathirappally
                  <br />
                  Alappuzha, 688521
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Privacy;
