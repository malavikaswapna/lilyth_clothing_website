import React from 'react';
import './Loading.css';

const Loading = ({ size = 'md', text = 'Loading...', fullScreen = false }) => {
  const sizeClass = `loading-${size}`;
  const containerClass = fullScreen ? 'loading-fullscreen' : 'loading-container';

  return (
    <div className={containerClass}>
      <div className={`loading-spinner ${sizeClass}`}>
        <div className="spinner"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loading;