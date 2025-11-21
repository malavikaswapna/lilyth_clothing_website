import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "./context/AuthContext";

// Layout Components
import Layout from "./components/layout/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminRoute from "./components/admin/AdminRoute";
import ScrollToTop from "./components/common/ScrollToTop";

// Public Pages
import Home from "./pages/Home";
import Shop from "./pages/shop/Shop";
import ProductDetail from "./pages/shop/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import SizeGuide from "./pages/SizeGuide";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import CareInstructions from "./pages/CareInstructions";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import PromoCodes from "./pages/admin/PromoCodes";
import PromoCodeForm from "./pages/admin/PromoCodeForm";

// Customer Pages
import Account from "./pages/account/Account";
import OrderSuccess from "./pages/OrderSuccess";
import Unsubscribe from "./pages/Unsubscribe";

// Admin Pages
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import Newsletter from "./pages/admin/Newsletter";

// Components
import Loading from "./components/common/Loading";

// Styles
import "./styles/globals.css";
import { AlertOctagon } from "lucide-react";

// Route Wrapper Components
const CustomerRoutes = () => (
  <Layout>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product/:slug" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/care-instructions" element={<CareInstructions />} />

      {/* Email Verification Route */}
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Help Routes */}
      <Route path="/help/contact" element={<Contact />} />
      <Route path="/help/size-guide" element={<SizeGuide />} />
      <Route path="/help/faq" element={<FAQ />} />
      <Route path="/help/shipping" element={<FAQ />} />
      <Route path="/help/returns" element={<FAQ />} />

      {/* Legal Routes */}
      <Route path="/legal/privacy" element={<Privacy />} />
      <Route path="/legal/terms" element={<Terms />} />

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:resettoken" element={<ResetPassword />} />

      {/* Protected Customer Routes */}
      <Route path="/account/*" element={<Account />} />
      <Route path="/order-success/:orderId" element={<OrderSuccess />} />

      {/* Redirect admin attempts to login */}
      <Route path="/admin/*" element={<Navigate to="/login" replace />} />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
);

const AdminRoutes = () => (
  <AdminLayout>
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="users" element={<Users />} />
      <Route path="products" element={<Products />} />
      <Route path="orders" element={<Orders />} />
      <Route path="reports" element={<Reports />} />
      <Route path="settings" element={<Settings />} />
      <Route path="promo-codes" element={<PromoCodes />} />
      <Route path="promo-codes/create" element={<PromoCodeForm />} />
      <Route path="promo-codes/edit/:id" element={<PromoCodeForm />} />
      <Route path="promo-codes/:id" element={<PromoCodeForm />} />
      <Route path="newsletter" element={<Newsletter />} />

      {/* Redirect any unmatched admin routes to dashboard */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </AdminLayout>
);

// Protected Route Component for Admin
const AdminProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading size="lg" text="Checking authentication..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Router Component
const AppRouter = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading size="lg" text="Loading application..." fullScreen />;
  }

  // If user is authenticated and is admin, show only admin interface
  if (isAuthenticated && user?.role === "admin") {
    return (
      <Routes>
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminRoutes />
            </AdminProtectedRoute>
          }
        />

        {/* Allow admin to access login page if they want to switch accounts */}
        <Route path="/login" element={<Login />} />

        {/* Redirect all other routes to admin dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // For regular customers or non-authenticated users
  return <CustomerRoutes />;
};

// Main App Component
function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <AppRouter />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
