import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft, Lock } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import BackgroundWrapper from '../../components/common/BackgroundWrapper';
import toast from 'react-hot-toast';
import './Auth.css';

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resettoken } = useParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm();

  const password = watch('password');

  useEffect(() => {
    console.log('Reset token from URL:', resettoken);
    if (!resettoken) {
      toast.error('Invalid reset link');
      navigate('/login');
    }
  }, [resettoken, navigate]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      console.log('Attempting password reset with token:', resettoken);
      
      const response = await authAPI.resetPassword(resettoken, data.password);
      
      console.log('Reset response:', response.data);
      
      if (response.data.success) {
        toast.success('Password reset successful!');
        
        // Auto-login user after successful reset
        if (response.data.token && response.data.user) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Force page refresh to update auth state
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
      setError('root', { message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <button onClick={() => navigate('/login')} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <h1 className="auth-title">Reset Password</h1>
          <div></div>
        </div>

        <div className="auth-content">
          <div className="auth-form-container">
            <div className="auth-welcome">
              <Lock size={48} className="reset-icon" />
              <h2>Set New Password</h2>
              <p>
                Please enter your new password. Make sure it's secure and easy for you to remember.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              {errors.root && (
                <div className="error-message">{errors.root.message}</div>
              )}

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  New Password
                </label>
                <div className="password-input">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    placeholder="Enter your new password"
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

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <div className="password-input">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
                    placeholder="Confirm your new password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === password || 'Passwords do not match'
                    })}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="form-error">{errors.confirmPassword.message}</span>
                )}
              </div>

              <Button
                type="submit"
                className="auth-submit-btn"
                loading={loading}
                disabled={loading}
              >
                Reset Password
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
              src="https://images.unsplash.com/photo-1555421689-491a97ff2040?w=600"
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

export default ResetPassword;