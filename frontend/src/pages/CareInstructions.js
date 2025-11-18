// src/pages/CareInstructions.js

import React, { useState } from "react";
import {
  Droplets,
  Wind,
  Sun,
  Shirt,
  AlertCircle,
  Snowflake,
  Flame,
  Hand,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import "./CareInstructions.css";

const CareInstructions = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const fabricCareGuide = [
    {
      id: "cotton",
      name: "Cotton",
      icon: "🌿",
      description: "Natural, breathable, and comfortable",
      instructions: [
        {
          icon: <Droplets size={20} />,
          title: "Washing",
          details: [
            "Machine wash in cold or warm water (30-40°C)",
            "Use mild detergent",
            "Separate whites and colors",
            "Turn garments inside out to prevent fading",
            "Avoid bleach on colored cotton",
          ],
        },
        {
          icon: <Wind size={20} />,
          title: "Drying",
          details: [
            "Line dry in shade for best results",
            "Can use tumble dryer on low heat",
            "Remove promptly to prevent wrinkles",
            "Avoid direct sunlight to prevent color fading",
          ],
        },
        {
          icon: <Flame size={20} />,
          title: "Ironing",
          details: [
            "Iron while slightly damp",
            "Use medium to high heat",
            "Iron on reverse side for prints",
            "Use steam for stubborn wrinkles",
          ],
        },
        {
          icon: <AlertCircle size={20} />,
          title: "Storage",
          details: [
            "Store in a cool, dry place",
            "Fold neatly or hang on padded hangers",
            "Keep away from direct sunlight",
            "Use mothballs for long-term storage",
          ],
        },
      ],
    },
    {
      id: "linen",
      name: "Linen",
      icon: "🌾",
      description: "Luxurious, breathable, and elegant",
      instructions: [
        {
          icon: <Droplets size={20} />,
          title: "Washing",
          details: [
            "Hand wash in cold water or machine wash on gentle cycle",
            "Use mild detergent",
            "Do not wring or twist",
            "Wash separately for first few washes",
            "Avoid harsh chemicals",
          ],
        },
        {
          icon: <Wind size={20} />,
          title: "Drying",
          details: [
            "Line dry in shade - never tumble dry",
            "Reshape while damp",
            "Lay flat for delicate items",
            "Linen wrinkles naturally - embrace the look!",
          ],
        },
        {
          icon: <Flame size={20} />,
          title: "Ironing",
          details: [
            "Iron while still damp for best results",
            "Use high heat setting",
            "Iron on reverse side",
            "Use plenty of steam",
            "For a relaxed look, skip ironing",
          ],
        },
        {
          icon: <AlertCircle size={20} />,
          title: "Storage",
          details: [
            "Store loosely folded or on hangers",
            "Allow air circulation",
            "Keep in cool, dry place",
            "Natural wrinkles are part of linen's charm",
          ],
        },
      ],
    },
    {
      id: "silk",
      name: "Silk & Delicates",
      icon: "✨",
      description: "Delicate, luxurious, needs gentle care",
      instructions: [
        {
          icon: <Hand size={20} />,
          title: "Washing",
          details: [
            "Hand wash only in cold water",
            "Use special silk detergent",
            "Do not soak for more than 5 minutes",
            "Gently squeeze - never wring",
            "Rinse thoroughly in cold water",
          ],
        },
        {
          icon: <Wind size={20} />,
          title: "Drying",
          details: [
            "Roll in a clean towel to remove excess water",
            "Lay flat on a dry towel to air dry",
            "Never tumble dry",
            "Keep away from direct heat or sunlight",
            "Do not hang - may stretch",
          ],
        },
        {
          icon: <Snowflake size={20} />,
          title: "Ironing",
          details: [
            "Iron on lowest setting while inside out",
            "Place a cloth between iron and fabric",
            "Never use steam directly on silk",
            "Can also steam from a distance",
            "Test on a hidden area first",
          ],
        },
        {
          icon: <AlertCircle size={20} />,
          title: "Storage",
          details: [
            "Store in breathable garment bags",
            "Use padded hangers",
            "Keep away from direct light",
            "Avoid plastic bags - silk needs to breathe",
            "Store away from perfumes and deodorants",
          ],
        },
      ],
    },
    {
      id: "synthetic",
      name: "Synthetic Blends",
      icon: "🧵",
      description: "Easy care, wrinkle-resistant",
      instructions: [
        {
          icon: <Droplets size={20} />,
          title: "Washing",
          details: [
            "Machine wash in warm water",
            "Use regular detergent",
            "Can be washed with similar colors",
            "Check care label for specific blend instructions",
            "Remove promptly after washing",
          ],
        },
        {
          icon: <Wind size={20} />,
          title: "Drying",
          details: [
            "Can tumble dry on low to medium heat",
            "Line dry for longer garment life",
            "Remove immediately to prevent wrinkles",
            "Most synthetics dry quickly",
          ],
        },
        {
          icon: <Flame size={20} />,
          title: "Ironing",
          details: [
            "Use low to medium heat",
            "Iron on reverse side",
            "Most synthetics are wrinkle-resistant",
            "Steam carefully - some may be heat sensitive",
          ],
        },
        {
          icon: <AlertCircle size={20} />,
          title: "Storage",
          details: [
            "Easy to store - fold or hang",
            "Resistant to moths and mildew",
            "Keep in cool, dry place",
            "Very low maintenance",
          ],
        },
      ],
    },
  ];

  const generalTips = [
    {
      icon: <Sparkles size={24} />,
      title: "Always Check Labels",
      description:
        "Read care labels before washing. They provide specific instructions for your garment.",
    },
    {
      icon: <Droplets size={24} />,
      title: "Treat Stains Immediately",
      description:
        "Blot (don't rub) stains immediately with cold water. Act fast for best results.",
    },
    {
      icon: <Sun size={24} />,
      title: "Avoid Direct Sunlight",
      description:
        "Dry colored garments in shade to prevent fading and maintain vibrant colors.",
    },
    {
      icon: <Shirt size={24} />,
      title: "Turn Inside Out",
      description:
        "Wash printed or embellished items inside out to protect designs and embroidery.",
    },
    {
      icon: <Wind size={24} />,
      title: "Air It Out",
      description:
        "Air garments between wears when possible. Not every wear needs a wash.",
    },
    {
      icon: <AlertCircle size={24} />,
      title: "Store Properly",
      description:
        "Clean clothes before storage. Never store damp or soiled garments.",
    },
  ];

  const washingSymbols = [
    {
      symbol: "🌊",
      meaning: "Machine wash",
      description: "Can be washed in washing machine",
    },
    {
      symbol: "✋",
      meaning: "Hand wash only",
      description: "Must be washed by hand",
    },
    {
      symbol: "🚫",
      meaning: "Do not wash",
      description: "Do not wash with water",
    },
    {
      symbol: "❄️",
      meaning: "Cold water",
      description: "Wash in cold water (30°C or below)",
    },
    {
      symbol: "🔥",
      meaning: "Hot water",
      description: "Can wash in hot water (60°C+)",
    },
    { symbol: "🔄", meaning: "Tumble dry", description: "Can be tumble dried" },
    { symbol: "🌤️", meaning: "Line dry", description: "Hang to dry naturally" },
    { symbol: "⬜", meaning: "Lay flat", description: "Dry flat on a surface" },
    { symbol: "🔥", meaning: "Iron", description: "Can be ironed" },
    { symbol: "⚠️", meaning: "Do not iron", description: "Do not iron" },
    {
      symbol: "☁️",
      meaning: "Dry clean",
      description: "Professional dry clean only",
    },
    {
      symbol: "🚫",
      meaning: "Do not bleach",
      description: "Do not use bleach",
    },
  ];

  return (
    <BackgroundWrapper>
      <div className="care-instructions-page">
        <div className="container">
          {/* Hero Section */}
          <div className="care-hero">
            <h1>Care Instructions</h1>
            <p className="subtitle">
              Keep your LILYTH garments looking beautiful for years to come
            </p>
            <div className="hero-icon">
              <Sparkles size={48} />
            </div>
          </div>

          {/* Introduction */}
          <div className="care-intro">
            <p>
              Proper care ensures your garments maintain their quality, color,
              and fit. Different fabrics require different care methods. Follow
              our comprehensive guide below to keep your wardrobe in perfect
              condition.
            </p>
          </div>

          {/* Fabric Care Guide */}
          <section className="fabric-care-section">
            <h2>Fabric-Specific Care Guide</h2>
            <p className="section-subtitle">
              Select your fabric type for detailed care instructions
            </p>

            <div className="fabric-cards">
              {fabricCareGuide.map((fabric) => (
                <div key={fabric.id} className="fabric-card">
                  <div
                    className="fabric-header"
                    onClick={() => toggleSection(fabric.id)}
                  >
                    <div className="fabric-title">
                      <span className="fabric-icon">{fabric.icon}</span>
                      <div>
                        <h3>{fabric.name}</h3>
                        <p>{fabric.description}</p>
                      </div>
                    </div>
                    <button className="expand-btn">
                      {expandedSection === fabric.id ? (
                        <ChevronUp size={24} />
                      ) : (
                        <ChevronDown size={24} />
                      )}
                    </button>
                  </div>

                  {expandedSection === fabric.id && (
                    <div className="fabric-content">
                      {fabric.instructions.map((instruction, index) => (
                        <div key={index} className="instruction-block">
                          <div className="instruction-header">
                            {instruction.icon}
                            <h4>{instruction.title}</h4>
                          </div>
                          <ul className="instruction-list">
                            {instruction.details.map((detail, idx) => (
                              <li key={idx}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* General Care Tips */}
          <section className="general-tips-section">
            <h2>General Care Tips</h2>
            <p className="section-subtitle">
              Essential tips that apply to all garments
            </p>

            <div className="tips-grid">
              {generalTips.map((tip, index) => (
                <div key={index} className="tip-card">
                  <div className="tip-icon">{tip.icon}</div>
                  <h3>{tip.title}</h3>
                  <p>{tip.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Washing Symbols Guide */}
          <section className="symbols-section">
            <h2>Understanding Care Symbols</h2>
            <p className="section-subtitle">
              Quick reference guide to common care label symbols
            </p>

            <div className="symbols-grid">
              {washingSymbols.map((item, index) => (
                <div key={index} className="symbol-card">
                  <div className="symbol">{item.symbol}</div>
                  <h4>{item.meaning}</h4>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Stain Removal Guide */}
          <section className="stain-guide-section">
            <h2>Quick Stain Removal Guide</h2>

            <div className="stain-grid">
              <div className="stain-card">
                <h3>Oil & Grease</h3>
                <ul>
                  <li>Blot excess with paper towel</li>
                  <li>Apply dish soap directly</li>
                  <li>Let sit for 5-10 minutes</li>
                  <li>Wash in hottest water safe for fabric</li>
                </ul>
              </div>

              <div className="stain-card">
                <h3>Red Wine</h3>
                <ul>
                  <li>Blot immediately - don't rub</li>
                  <li>Pour salt on stain to absorb</li>
                  <li>Rinse with cold water from back</li>
                  <li>Apply white wine or club soda</li>
                  <li>Wash as normal</li>
                </ul>
              </div>

              <div className="stain-card">
                <h3>Coffee & Tea</h3>
                <ul>
                  <li>Rinse with cold water immediately</li>
                  <li>Apply liquid detergent</li>
                  <li>Let sit for 5 minutes</li>
                  <li>Rinse and wash normally</li>
                </ul>
              </div>

              <div className="stain-card">
                <h3>Ink</h3>
                <ul>
                  <li>Place paper towel under stain</li>
                  <li>Dab with rubbing alcohol</li>
                  <li>Blot with clean cloth</li>
                  <li>Repeat until stain lifts</li>
                  <li>Wash normally</li>
                </ul>
              </div>

              <div className="stain-card">
                <h3>Makeup</h3>
                <ul>
                  <li>Use makeup remover or dish soap</li>
                  <li>Gently work into stain</li>
                  <li>Rinse with cold water</li>
                  <li>Repeat if necessary</li>
                  <li>Machine wash</li>
                </ul>
              </div>

              <div className="stain-card">
                <h3>Sweat Stains</h3>
                <ul>
                  <li>Mix baking soda with water (paste)</li>
                  <li>Apply to stain</li>
                  <li>Let sit for 1 hour</li>
                  <li>Add vinegar to wash cycle</li>
                  <li>Wash in warm water</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Important Notes */}
          <section className="important-notes">
            <div className="note-box">
              <AlertCircle size={24} />
              <div>
                <h3>Important Reminders</h3>
                <ul>
                  <li>Always test stain removers on a hidden area first</li>
                  <li>
                    Check garment care labels before attempting any cleaning
                    method
                  </li>
                  <li>When in doubt, consult a professional dry cleaner</li>
                  <li>
                    Never put stained items in the dryer - heat sets stains
                    permanently
                  </li>
                  <li>
                    For expensive or delicate items, professional cleaning is
                    recommended
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="care-contact">
            <h2>Need More Help?</h2>
            <p>
              If you have specific questions about caring for your LILYTH
              garments, our customer service team is here to help.
            </p>
            <a href="/contact" className="contact-link">
              Contact Us →
            </a>
          </section>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default CareInstructions;
