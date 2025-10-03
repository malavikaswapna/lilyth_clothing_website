import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Play, RotateCcw } from 'lucide-react';
import './NotFound.css';
import BackgroundWrapper from '../components/common/BackgroundWrapper';

const NotFound = () => {
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [items, setItems] = useState([]);
  const [basketPosition, setBasketPosition] = useState(50);
  const gameRef = useRef(null);
  const animationFrameRef = useRef(null);
  const itemIdRef = useRef(0);
  const spawnIntervalRef = useRef(null);

  const fashionItems = ['👗', '👠', '👜', '👒', '🧣', '💄', '👓', '💍'];

  // Spawn items
  useEffect(() => {
    if (!gameActive) return;

    const spawnItem = () => {
      const newItem = {
        id: itemIdRef.current++,
        emoji: fashionItems[Math.floor(Math.random() * fashionItems.length)],
        x: Math.random() * 80 + 10,
        y: 0,
        speed: Math.random() * 0.8 + 0.6  // Slower speed: 0.6 to 1.4
      };
      setItems(prev => [...prev, newItem]);
    };

    spawnIntervalRef.current = setInterval(spawnItem, 1500);  // Spawn less frequently

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
    };
  }, [gameActive]);

  // Game loop
  useEffect(() => {
    if (!gameActive) return;

    const updateGame = () => {
      setItems(prevItems => {
        const updatedItems = prevItems
          .map(item => ({ ...item, y: item.y + item.speed }))
          .filter(item => {
            if (item.y > 85) {
              if (Math.abs(item.x - basketPosition) < 8) {
                setScore(s => s + 1);
                return false;
              }
              setGameOver(true);
              setGameActive(false);
              return false;
            }
            return true;
          });
        return updatedItems;
      });

      if (gameActive) {
        animationFrameRef.current = requestAnimationFrame(updateGame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive, basketPosition]);

  // Mouse and touch controls
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!gameActive || !gameRef.current) return;
      const rect = gameRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setBasketPosition(Math.max(5, Math.min(95, x)));
    };

    const handleTouchMove = (e) => {
      if (!gameActive || !gameRef.current) return;
      const rect = gameRef.current.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      setBasketPosition(Math.max(5, Math.min(95, x)));
    };

    if (gameActive && gameRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [gameActive]);

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setItems([]);
    setBasketPosition(50);
    itemIdRef.current = 0;
  };

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

            {/* Game Section */}
            <div className="game-section">
              <h3 className="game-title">While you're here... 🎮</h3>
              <p className="game-subtitle">Play our mini-game! Catch the falling fashion items!</p>

              {!gameActive && !gameOver && (
                <button onClick={startGame} className="btn btn-primary game-start-btn">
                  <Play size={18} />
                  Start Game
                </button>
              )}

              {gameActive && (
                <div ref={gameRef} className="game-canvas">
                  <div className="score-display">
                    Score: {score}
                  </div>

                  {items.map(item => (
                    <div
                      key={item.id}
                      className="falling-item"
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {item.emoji}
                    </div>
                  ))}

                  <div
                    className="basket"
                    style={{
                      left: `${basketPosition}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    🛍️
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="game-over-screen">
                  <p className="game-over-title">Game Over!</p>
                  <p className="final-score">
                    You caught <span className="score-highlight">{score}</span> items! 🎉
                  </p>
                  <button onClick={startGame} className="btn btn-primary">
                    <RotateCcw size={18} />
                    Play Again
                  </button>
                </div>
              )}
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