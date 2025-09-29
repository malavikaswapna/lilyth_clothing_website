import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, User, Lock, Mail, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const ProfileSettings = () => {
    const [loading, setLoading] = useState(false);
    
    const {
      register,
      handleSubmit,
      formState: { errors }
    } = useForm({
      defaultValues: {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        gender: user?.gender || ''
      }
    });

    const onSubmit = async (data) => {
      try {
        setLoading(true);
        const response = await authAPI.updateProfile(data);
        updateUser(response.data.user);
        toast.success('Profile updated successfully');
      } catch (error) {
        toast.error('Failed to update profile');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="settings-section">
        <div className="section-header">
          <User size={24} />
          <div>
            <h2>Profile Information</h2>
            <p>Update your personal details and preferences</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-control"
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-control"
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+91 1234567890"
              {...register('phone')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                {...register('dateOfBirth')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-control" {...register('gender')}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Button type="submit" loading={loading} className="save-btn">
            Save Changes
          </Button>
        </form>
      </div>
    );
  };

  const PasswordSettings = () => {
    const [loading, setLoading] = useState(false);
    
    const {
      register,
      handleSubmit,
      formState: { errors },
      reset,
      watch
    } = useForm();

    const newPassword = watch('newPassword');

    const onSubmit = async (data) => {
      try {
        setLoading(true);
        await authAPI.updatePassword({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        });
        toast.success('Password updated successfully');
        reset();
      } catch (error) {
        toast.error('Failed to update password');
      } finally {
        setLoading(false);
      }
    };

    if (user?.authProvider === 'google') {
      return (
        <div className="settings-section">
          <div className="section-header">
            <Lock size={24} />
            <div>
              <h2>Password</h2>
              <p>Manage your account password</p>
            </div>
          </div>
          
          <div className="google-auth-notice">
            <p>You're signed in with Google. Password changes are managed through your Google account.</p>
            <a 
              href="https://myaccount.google.com/security" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Manage Google Account
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="settings-section">
        <div className="section-header">
          <Lock size={24} />
          <div>
            <h2>Password</h2>
            <p>Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="settings-form">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div className="password-input">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                className="form-control"
                {...register('currentPassword', { required: 'Current password is required' })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.currentPassword && <span className="form-error">{errors.currentPassword.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="password-input">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="form-control"
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.newPassword && <span className="form-error">{errors.newPassword.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="password-input">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-control"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === newPassword || 'Passwords do not match'
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
            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
          </div>

          <Button type="submit" loading={loading} className="save-btn">
            Update Password
          </Button>
        </form>
      </div>
    );
  };

  const NotificationSettings = () => {
    const [notifications, setNotifications] = useState({
      orderUpdates: true,
      promotions: true,
      newArrivals: false,
      backInStock: true,
      priceDrops: false
    });

    const handleNotificationChange = (key) => {
      setNotifications(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const saveNotifications = () => {
      toast.success('Notification preferences updated');
    };

    return (
      <div className="settings-section">
        <div className="section-header">
          <Bell size={24} />
          <div>
            <h2>Notifications</h2>
            <p>Choose what emails you'd like to receive</p>
          </div>
        </div>

        <div className="notifications-form">
          <div className="notification-item">
            <div className="notification-info">
              <h4>Order Updates</h4>
              <p>Receive emails about order confirmations, shipping, and delivery</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.orderUpdates}
                onChange={() => handleNotificationChange('orderUpdates')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h4>Promotions & Sales</h4>
              <p>Get notified about special offers, discounts, and sales</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.promotions}
                onChange={() => handleNotificationChange('promotions')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h4>New Arrivals</h4>
              <p>Be the first to know about new products and collections</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.newArrivals}
                onChange={() => handleNotificationChange('newArrivals')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h4>Back in Stock</h4>
              <p>Get alerts when wishlist items are available again</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.backInStock}
                onChange={() => handleNotificationChange('backInStock')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h4>Price Drops</h4>
              <p>Get notified when items on your wishlist go on sale</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.priceDrops}
                onChange={() => handleNotificationChange('priceDrops')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <Button onClick={saveNotifications} className="save-btn">
            Save Preferences
          </Button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={20} /> },
    { id: 'password', label: 'Password', icon: <Lock size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> }
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your account preferences and security settings</p>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'password' && <PasswordSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
};

export default Settings;