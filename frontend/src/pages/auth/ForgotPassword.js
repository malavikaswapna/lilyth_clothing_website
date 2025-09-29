import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import BackgroundWrapper from '../../components/common/BackgroundWrapper';
import './Auth.css';

const ForgotPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetInfo, setResetInfo] = useState(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    getValues
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      console.log('Sending forgot password request for:', data.email);
      
      const response = await authAPI.forgotPassword(data.email);
      
      console.log('Response:', response.data);
      
      if (response.data.success) {
        setIsSubmitted(true);
        setResetInfo(response.data);
        toast.success('Password reset instructions sent!');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      setError('root', { message });
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setResetInfo(null);
  };

  if (isSubmitted) {
    return (
        <BackgroundWrapper>
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <button onClick={() => navigate('/login')} className="back-btn">
              <ArrowLeft size={20} />
            </button>
            <h1 className="auth-title">Check Your Email</h1>
            <div></div>
          </div>

          <div className="auth-content">
            <div className="auth-form-container">
              <div className="success-message">
                <CheckCircle size={64} className="success-icon" />
                <h2>Email Sent!</h2>
                <p>
                  We've sent password reset instructions to <strong>{getValues('email')}</strong>
                </p>
                <p>
                  Please check your email and click the link to reset your password.
                  The link will expire in 15 minutes for security.
                </p>
                
                {/* Development helper */}
                {process.env.NODE_ENV === 'development' && resetInfo?.resetUrl && (
                  <div style={{
                    background: '#f0f0f0',
                    padding: '15px',
                    borderRadius: '5px',
                    margin: '20px 0',
                    fontSize: '0.9rem'
                  }}>
                    <strong>Development Mode - Direct Link:</strong>
                    <br />
                    <a 
                      href={resetInfo.resetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#44465d', wordBreak: 'break-all' }}
                    >
                      {resetInfo.resetUrl}
                    </a>
                  </div>
                )}
                
                <div className="success-actions">
                  <Button onClick={handleTryAgain} variant="outline">
                    Try Different Email
                  </Button>
                  <Link to="/login" className="btn btn-primary">
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>

            <div className="auth-image">
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"
                alt="Email sent"
                className="auth-bg-image"
              />
            </div>
          </div>
        </div>
      </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <h1 className="auth-title">Forgot Password</h1>
          <div></div>
        </div>

        <div className="auth-content">
          <div className="auth-form-container">
            <div className="auth-welcome">
              <Mail size={48} className="forgot-icon" />
              <h2>Reset Your Password</h2>
              <p>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              {errors.root && (
                <div className="error-message">{errors.root.message}</div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email address"
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

              <Button
                type="submit"
                className="auth-submit-btn"
                loading={loading}
                disabled={loading}
              >
                Send Reset Link
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Remember your password?{' '}
                <Link to="/login" className="auth-link">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="auth-image">
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"
              alt="Reset password"
              className="auth-bg-image"
            />
          </div>
        </div>
      </div>
    </div>
    </BackgroundWrapper>
  );
};

export default ForgotPassword;