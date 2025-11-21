import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Scroll to top whenever pathname OR search params change
    window.scrollTo(0, 0);
  }, [pathname, search]); // Added 'search' to dependencies

  return null;
};

export default ScrollToTop;
