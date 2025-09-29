import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { authAPI } from '../../services/api';
import BackgroundWrapper from '../../components/common/BackgroundWrapper';
import Button from '../../components/common/Button';
import './Auth.css';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await authAPI.verifyEmail(token);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Email verified! Please sign in.' }
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(
        error.response?.data?.message || 
        'Failed to verify email. The link may be invalid or expired.'
      );
    }
  };

  return (
    <BackgroundWrapper>
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-content">
            <div className="auth-form-container">
              <div className="auth-welcome">
                {status === 'verifying' && (
                  <>
                    <Loader size={48} className="forgot-icon spinning" />
                    <h2>Verifying Email</h2>
                    <p>Please wait while we verify your email address...</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <CheckCircle size={48} className="success-icon" />
                    <h2>Email Verified!</h2>
                    <p>{message}</p>
                    <p>Redirecting to login...</p>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <XCircle size={48} className="error-icon" />
                    <h2>Verification Failed</h2>
                    <p>{message}</p>
                    
                    <div className="success-actions">
                      <Link to="/login" className="btn btn-primary">
                        Go to Login
                      </Link>
                      <Link to="/register" className="btn btn-outline">
                        Create New Account
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="auth-image">
              <img
                src="https://images.unsplash.com/photo-1557683316-973673baf926?w=600"
                alt="Email Verification"
                className="auth-bg-image"
              />
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default VerifyEmail;