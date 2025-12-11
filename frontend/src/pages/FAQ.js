import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Package,
  CreditCard,
  RefreshCw,
  Truck,
  HelpCircle,
} from "lucide-react";
import "./FAQ.css";
import BackgroundWrapper from "../components/common/BackgroundWrapper";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqCategories = [
    {
      title: "Orders & Shipping",
      icon: <Package size={24} />,
      items: [
        {
          question: "How long does shipping take?",
          answer:
            "Standard shipping takes 3-5 business days. Expedited shipping (1-2 business days) and overnight shipping are also available. Free standard shipping on orders over ₹2000.",
        },
        {
          question: "Can I track my order?",
          answer:
            'Yes! Once your order ships, you\'ll receive a tracking number via email. You can also track your order in your account dashboard under "My Orders".',
        },
        {
          question: "Do you ship internationally?",
          answer:
            "Currently, we only ship within the state of Kerala. We're working on expanding to out-of-state and international shipping in the near future.",
        },
        {
          question: "What if my order is damaged or incorrect?",
          answer:
            "If you receive a damaged or incorrect item, please contact us within 48 hours of delivery. We'll arrange for a replacement or full refund at no cost to you.",
        },
      ],
    },
    {
      title: "Returns & Exchanges",
      icon: <RefreshCw size={24} />,
      items: [
        {
          question: "Can I cancel my order?",
          answer:
            "Yes! You can cancel your order depending on the payment method:\n\n• Online Payment (Razorpay): Cancel within 24 hours of order placement for automatic refund\n• Cash on Delivery: Cancel anytime before the order is shipped\n\nOnce the cancellation window expires or order is shipped, you can still return the product after delivery within our 30-day return policy.",
        },
        {
          question: "How long do I have to cancel my order?",
          answer:
            'For online payments (credit/debit card, UPI, net banking), you have 24 hours from the time of order placement to cancel. For Cash on Delivery orders, you can cancel anytime before the order status changes to "Shipped". After these windows, please use our return process after receiving your order.',
        },
        {
          question: "How do I cancel my order?",
          answer:
            'Log into your account, go to "My Orders," find your order, and click "Cancel Order." For online payment orders cancelled within 24 hours, your refund will be processed automatically and will reflect in your account within 5-7 business days. You\'ll receive a confirmation email with refund details.',
        },
        {
          question: "What is your return policy?",
          answer:
            "We offer free returns and exchanges within 30 days of purchase. Items must be unworn, unwashed, and in original condition with tags attached.",
        },
        {
          question: "How do I start a return?",
          answer:
            'Log into your account, go to "My Orders," find your order, and click "Return Items." You can also contact customer service for assistance.',
        },
        {
          question: "How long do refunds take?",
          answer:
            "For order cancellations (within 24 hours): Refunds are processed automatically within 5-7 business days. For returns: Refunds are processed within 3-5 business days after we receive your return. You'll receive an email confirmation when your refund is processed.",
        },
        {
          question: "Can I exchange for a different size?",
          answer:
            "Yes! Exchanges are free and easy. You can exchange for a different size or color of the same item within 30 days.",
        },
      ],
    },
    {
      title: "Sizing & Fit",
      icon: <Truck size={24} />,
      items: [
        {
          question: "How do I find my size?",
          answer:
            "Check our detailed size guide with measurements for each category. When in doubt, we recommend sizing up for comfort. Our customer service team can also help with sizing questions.",
        },
        {
          question: "What if something doesn't fit?",
          answer:
            "No problem! We offer free exchanges within 30 days. You can easily exchange for a different size through your account or by contacting us.",
        },
        {
          question: "Do sizes run large or small?",
          answer:
            "Our sizing is generally true to size, but it can vary by brand. Check individual product pages for specific fit notes and customer reviews for sizing feedback.",
        },
        {
          question: "Can I get help with sizing before I order?",
          answer:
            "Absolutely! Our customer service team is available to help with sizing questions. You can also check our size guide and read customer reviews for fit insights.",
        },
      ],
    },
    {
      title: "Payment & Account",
      icon: <CreditCard size={24} />,
      items: [
        {
          question: "What payment methods do you accept?",
          answer:
            "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay.",
        },
        {
          question: "Is my payment information secure?",
          answer:
            "Yes! We use industry-standard SSL encryption to protect your payment information. We never store your full credit card details on our servers.",
        },
        {
          question: "Can I save multiple addresses?",
          answer:
            "Yes! You can save multiple shipping and billing addresses in your account for faster checkout. You can also set a default address.",
        },
        {
          question: "How do I reset my password?",
          answer:
            'Click "Forgot Password" on the sign-in page, enter your email address, and we\'ll send you a reset link. The link expires in 15 minutes for security.',
        },
      ],
    },
  ];

  const filteredFAQs = faqCategories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <BackgroundWrapper>
      <div className="faq-page">
        <div className="container">
          {/* Header */}
          <div className="faq-header">
            <HelpCircle size={48} className="faq-icon" />
            <h1>Frequently Asked Questions</h1>
            <p>Find answers to common questions about shopping with AMOURA</p>
          </div>

          {/* Search */}
          <div className="faq-search">
            <div className="search-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search FAQ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* FAQ Content */}
          <div className="faq-content">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((category, categoryIndex) => (
                <div key={categoryIndex} className="faq-category">
                  <div className="category-header">
                    <div className="category-icon">{category.icon}</div>
                    <h2>{category.title}</h2>
                  </div>

                  <div className="faq-items">
                    {category.items.map((item, itemIndex) => {
                      const globalIndex = `${categoryIndex}-${itemIndex}`;
                      const isOpen = openItems.has(globalIndex);

                      return (
                        <div key={itemIndex} className="faq-item">
                          <button
                            className="faq-question"
                            onClick={() => toggleItem(globalIndex)}
                          >
                            <span>{item.question}</span>
                            {isOpen ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                          {isOpen && (
                            <div className="faq-answer">
                              <p>{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <Search size={48} />
                <h3>No results found</h3>
                <p>
                  Try different search terms or browse our categories above.
                </p>
              </div>
            )}
          </div>

          {/* Contact CTA */}
          <div className="faq-cta">
            <h2>Still have questions?</h2>
            <p>Our customer service team is here to help</p>
            <div className="cta-buttons">
              <a href="/help/contact" className="btn btn-primary">
                Contact Us
              </a>
              <a href="mailto:hello@lilyth.com" className="btn btn-outline">
                Send Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default FAQ;
