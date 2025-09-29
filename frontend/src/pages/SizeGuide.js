import React, { useState } from 'react';
import { Ruler, Info, ArrowRight } from 'lucide-react';
import './SizeGuide.css';
import BackgroundWrapper from '../components/common/BackgroundWrapper';


const SizeGuide = () => {
  const [activeCategory, setActiveCategory] = useState('tops');

  const sizeCharts = {
    tops: {
      title: 'Tops & Blouses',
      headers: ['Size', 'Bust (inches)', 'Waist (inches)', 'Length (inches)'],
      data: [
        ['XS', '32-34', '26-28', '24-25'],
        ['S', '34-36', '28-30', '25-26'],
        ['M', '36-38', '30-32', '26-27'],
        ['L', '38-40', '32-34', '27-28'],
        ['XL', '40-42', '34-36', '28-29'],
        ['XXL', '42-44', '36-38', '29-30']
      ]
    },
    bottoms: {
      title: 'Pants & Jeans',
      headers: ['Size', 'Waist (inches)', 'Hips (inches)', 'Inseam (inches)'],
      data: [
        ['XS', '26-28', '34-36', '30'],
        ['S', '28-30', '36-38', '30'],
        ['M', '30-32', '38-40', '30'],
        ['L', '32-34', '40-42', '30'],
        ['XL', '34-36', '42-44', '30'],
        ['XXL', '36-38', '44-46', '30']
      ]
    },
    dresses: {
      title: 'Dresses',
      headers: ['Size', 'Bust (inches)', 'Waist (inches)', 'Hips (inches)', 'Length (inches)'],
      data: [
        ['XS', '32-34', '26-28', '34-36', '35-36'],
        ['S', '34-36', '28-30', '36-38', '36-37'],
        ['M', '36-38', '30-32', '38-40', '37-38'],
        ['L', '38-40', '32-34', '40-42', '38-39'],
        ['XL', '40-42', '34-36', '42-44', '39-40'],
        ['XXL', '42-44', '36-38', '44-46', '40-41']
      ]
    }
  };

  return (
    <BackgroundWrapper>
    <div className="size-guide-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <h1>Size Guide</h1>
          <p>Find your perfect fit with our comprehensive sizing information</p>
        </div>

        {/* Measuring Instructions */}
        <section className="measuring-section">
          <h2>How to Measure</h2>
          <div className="measuring-grid">
            <div className="measuring-item">
              <div className="measure-icon">
                <Ruler size={32} />
              </div>
              <h3>Bust</h3>
              <p>Measure around the fullest part of your bust, keeping the tape parallel to the floor.</p>
            </div>
            <div className="measuring-item">
              <div className="measure-icon">
                <Ruler size={32} />
              </div>
              <h3>Waist</h3>
              <p>Measure around your natural waistline, which is the narrowest part of your torso.</p>
            </div>
            <div className="measuring-item">
              <div className="measure-icon">
                <Ruler size={32} />
              </div>
              <h3>Hips</h3>
              <p>Measure around the fullest part of your hips, about 7-9 inches below your waistline.</p>
            </div>
          </div>

          <div className="measuring-tips">
            <div className="tip-icon">
              <Info size={24} />
            </div>
            <div className="tip-content">
              <h4>Measuring Tips</h4>
              <ul>
                <li>Use a soft measuring tape for accurate results</li>
                <li>Measure over undergarments or form-fitting clothes</li>
                <li>Keep the tape snug but not tight</li>
                <li>Have someone help you for the most accurate measurements</li>
                <li>Measure twice to ensure accuracy</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Size Charts */}
        <section className="size-charts-section">
          <h2>Size Charts</h2>
          
          {/* Category Tabs */}
          <div className="category-tabs">
            {Object.entries(sizeCharts).map(([key, chart]) => (
              <button
                key={key}
                className={`tab-btn ${activeCategory === key ? 'active' : ''}`}
                onClick={() => setActiveCategory(key)}
              >
                {chart.title}
              </button>
            ))}
          </div>

          {/* Size Chart Table */}
          <div className="size-chart">
            <h3>{sizeCharts[activeCategory].title}</h3>
            <div className="table-container">
              <table className="size-table">
                <thead>
                  <tr>
                    {sizeCharts[activeCategory].headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeCharts[activeCategory].data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={cellIndex === 0 ? 'size-cell' : ''}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Fit Guide */}
        <section className="fit-guide-section">
          <h2>Fit Guide</h2>
          <div className="fit-grid">
            <div className="fit-item">
              <h3>Relaxed Fit</h3>
              <p>Loose and comfortable with extra room throughout. Perfect for casual wear and layering.</p>
            </div>
            <div className="fit-item">
              <h3>Regular Fit</h3>
              <p>Classic fit that's not too tight or too loose. Flatters most body types and suitable for any occasion.</p>
            </div>
            <div className="fit-item">
              <h3>Slim Fit</h3>
              <p>Tailored cut that follows your body's natural silhouette. Modern and sophisticated look.</p>
            </div>
            <div className="fit-item">
              <h3>Fitted</h3>
              <p>Close to the body with minimal ease. Shows your figure while maintaining comfort.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="size-faq-section">
          <h2>Sizing FAQ</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>What if I'm between sizes?</h4>
              <p>We generally recommend sizing up for comfort. Check the specific product description for fit notes.</p>
            </div>
            <div className="faq-item">
              <h4>Do sizes vary between brands?</h4>
              <p>Yes, sizing can vary between different brands. Always refer to our size chart for each specific item.</p>
            </div>
            <div className="faq-item">
              <h4>Can I exchange for a different size?</h4>
              <p>Absolutely! We offer free exchanges within 30 days of purchase. See our returns policy for details.</p>
            </div>
            <div className="faq-item">
              <h4>How accurate are the measurements?</h4>
              <p>Our measurements are taken flat and represent the garment itself, not body measurements.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="size-cta-section">
          <div className="cta-content">
            <h2>Still not sure about sizing?</h2>
            <p>Our customer service team is here to help you find the perfect fit.</p>
            <a href="/help/contact" className="btn btn-primary">
              Contact Us
              <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </div>
    </div>
    </BackgroundWrapper>
  );
};

export default SizeGuide;