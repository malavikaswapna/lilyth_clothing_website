import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import GoogleSignIn from '../../components/auth/GoogleSignIn';
import BackgroundWrapper from '../../components/common/BackgroundWrapper';
import './Auth.css';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm();

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      if (result.isAdmin) {

      navigate('/admin', { replace: true });
    } else {

      navigate(from, { replace: true });
    }
    } else {
      setError('root', { message: result.message });
    }
  };

  return (
    <BackgroundWrapper>
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <h1 className="auth-title">Sign In</h1>
          <div></div>
        </div>

        <div className="auth-content">
          <div className="auth-form-container">
            <div className="auth-welcome">
              <h2>Welcome Back</h2>
              <p>Sign in to your Lilyth account to continue your style journey</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                {/* Success message from email verification */}
                {successMessage && (
                  <div className="success-message" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#dcfce7', 
                    color: '#166534', 
                    borderRadius: '0.5rem', 
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    {successMessage}
                  </div>
                )}
                
              {errors.root && (
                <div className="error-message">{errors.root.message}</div>
              )}

              {/* Google Sign In Button */}
              <GoogleSignIn loading={loading} />

              <div className="divider">
                <span>or</span>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                      message: 'Please enter a valid email address'
                    }
                  })}
                />
                {errors.email && (
                  <span className="form-error">{errors.email.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-input">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="form-error">{errors.password.message}</span>
                )}
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span className="checkbox-text">Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="auth-submit-btn"
                loading={loading}
                disabled={loading}
              >
                Sign In
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="auth-link">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          <div className="auth-image">
            <img
              src="https://i.pinimg.com/1200x/67/dc/91/67dc91d74cb94a037e2b643a04e89643.jpg"
              alt="Fashion"
              className="auth-bg-image"
            />
          </div>
        </div>
      </div>
    </div>
    </BackgroundWrapper>
  );
};

export default Login;