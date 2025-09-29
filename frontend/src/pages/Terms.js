import React from 'react';
import { FileText } from 'lucide-react';
import './Legal.css';
import BackgroundWrapper from '../components/common/BackgroundWrapper';


const Terms = () => {
  return (
    <BackgroundWrapper>
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <FileText size={48} className="legal-icon" />
          <h1>Terms of Service</h1>
          <p>Last updated: September 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Acceptance of Terms</h2>
            <p>By accessing and using the LILYTH website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
          </section>

          <section className="legal-section">
            <h2>Use License</h2>
            <p>Permission is granted to temporarily download one copy of LILYTH's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul className="legal-list">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>Product Information</h2>
            <p>We strive to provide accurate product information, including descriptions, prices, and availability. However:</p>
            <ul className="legal-list">
              <li>Product colors may vary due to monitor settings</li>
              <li>Prices are subject to change without notice</li>
              <li>We reserve the right to limit quantities</li>
              <li>All measurements are approximate</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>Orders and Payment</h2>
            <ul className="legal-list">
              <li>All orders are subject to acceptance and availability</li>
              <li>We reserve the right to refuse or cancel any order</li>
              <li>Payment must be received before items are shipped</li>
              <li>Prices do not include applicable taxes and shipping fees</li>
              <li>Orders may be cancelled if payment cannot be processed</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>Shipping and Delivery</h2>
            <ul className="legal-list">
              <li>Delivery times are estimates and not guaranteed</li>
              <li>Risk of loss transfers upon delivery to carrier</li>
              <li>We are not responsible for shipping delays beyond our control</li>
              <li>Additional fees may apply for expedited shipping</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>Returns and Exchanges</h2>
            <p>Items may be returned within 30 days of delivery if:</p>
            <ul className="legal-list">
              <li>Items are in original condition with tags attached</li>
              <li>Items are unworn and unwashed</li>
              <li>Original packaging is included</li>
              <li>Proof of purchase is provided</li>
            </ul>
            <p>Certain items may not be eligible for return due to hygiene reasons.</p>
          </section>

          <section className="legal-section">
            <h2>User Account</h2>
            <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding your password and for maintaining the confidentiality of your account.</p>
          </section>

          <section className="legal-section">
            <h2>Limitation of Liability</h2>
            <p>In no event shall LILYTH or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on LILYTH's website, even if LILYTH or an authorized representative has been notified orally or in writing of the possibility of such damage.</p>
          </section>

          <section className="legal-section">
            <h2>Governing Law</h2>
            <p>These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
          </section>

          <section className="legal-section">
            <h2>Contact Information</h2>
            <p>Questions about the Terms of Service should be sent to us at:</p>
            <div className="contact-info">
              <p>Email: <a href="mailto:legal@amoura.com">legal@lilyth.com</a></p>
              <p>Phone: +91 1234567890</p>
            </div>
          </section>
        </div>
      </div>
    </div>
    </BackgroundWrapper>
  );
};

export default Terms;