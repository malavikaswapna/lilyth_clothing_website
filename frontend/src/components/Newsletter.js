import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Check } from 'lucide-react';
import Button from './common/Button';
import toast from 'react-hot-toast';
import './Newsletter.css';

const Newsletter = ({ variant = 'default' }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      console.log('Newsletter signup:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubscribed(true);
      toast.success('Successfully subscribed to our newsletter!');
      reset();
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className={`newsletter-signup ${variant}`}>
        <div className="newsletter-success">
          <Check size={32} className="success-icon" />
          <h3>You're all set!</h3>
          <p>Welcome to the AMOURA family. You'll be the first to know about new arrivals and exclusive offers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`newsletter-signup ${variant}`}>
      <div className="newsletter-content">
        <div className="newsletter-header">
          <Mail size={32} className="newsletter-icon" />
          <h3>Stay in Style</h3>
          <p>Get the latest fashion updates, exclusive offers, and styling tips delivered to your inbox.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="newsletter-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Enter your email address"
              className={`newsletter-input ${errors.email ? 'error' : ''}`}
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
            className="newsletter-btn"
            loading={loading}
            disabled={loading}
          >
            Subscribe
          </Button>
        </form>

        <p className="newsletter-disclaimer">
          By subscribing, you agree to receive marketing emails. You can unsubscribe at any time.
        </p>
      </div>
    </div>
  );
};

export default Newsletter;