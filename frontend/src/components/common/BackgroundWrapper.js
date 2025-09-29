import React from 'react';

const BackgroundWrapper = ({ children, className = '' }) => {
  const backgroundStyle = {
    backgroundImage: `url(${process.env.PUBLIC_URL}/grid-bg.png)`,
    backgroundRepeat: 'repeat',
    backgroundSize: '300px 300px',
    backgroundAttachment: 'fixed',
    minHeight: '100vh'
  };

  return (
    <div 
      className={`background-wrapper ${className}`}
      style={backgroundStyle}
    >
      {children}
    </div>
  );
};

export default BackgroundWrapper;