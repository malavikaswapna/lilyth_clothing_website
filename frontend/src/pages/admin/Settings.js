//src/pages/admin/Settings.js
import React, { useState, useEffect } from "react";
import {
  Save,
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Palette,
  Globe,
  DollarSign,
  Truck,
  CreditCard,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import toast from "react-hot-toast";
import "./Settings.css";
import { adminAPI } from "../../services/api";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Form states
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderUpdates: true,
    newUsers: true,
    lowStock: true,
    salesReports: false,
    systemUpdates: true,
  });

  const [storeSettings, setStoreSettings] = useState({
    storeName: "LILYTH",
    storeDescription: "Discover Your Perfect Style",
    currency: "INR",
    timezone: "Asia/Kolkata",
    language: "en",
    taxRate: 18,
    freeShippingThreshold: 2000,
    expressShippingCost: 199,
    standardShippingCost: 99,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    razorpayEnabled: true,
    codEnabled: true,
    paymentGatewayMode: "test",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // ✅ Load notification settings from backend
      try {
        const response = await adminAPI.getNotificationSettings();
        if (response.data.settings) {
          setNotificationSettings(response.data.settings);
        }
      } catch (error) {
        console.log("Using default notification settings");
      }

      // ✅ NEW: Load payment settings from backend
      try {
        const paymentResponse = await adminAPI.getPaymentSettings();
        if (paymentResponse.data.data) {
          setPaymentSettings({
            razorpayEnabled: paymentResponse.data.data.razorpayEnabled,
            codEnabled: paymentResponse.data.data.codEnabled,
            paymentGatewayMode:
              paymentResponse.data.data.paymentGatewayMode || "test",
          });
        }
      } catch (error) {
        console.error("Failed to load payment settings:", error);
      }

      // ✅ Load store settings from backend
      try {
        const response = await adminAPI.getStoreSettings();
        if (response.data.settings) {
          setStoreSettings(response.data.settings);
        }
      } catch (error) {
        console.log("Using default store settings");
      }

      // Payment settings still from localStorage (sensitive data)
      const savedPayment = localStorage.getItem("paymentSettings");
      if (savedPayment) {
        setPaymentSettings(JSON.parse(savedPayment));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Update profile info (without password)
      const profileUpdateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        email: profileData.email,
      };

      const response = await authAPI.updateProfile(profileUpdateData);

      // Update user in context
      if (updateUser) {
        updateUser(response.data.user);
      }

      toast.success("Profile updated successfully");

      // If password change is requested
      if (profileData.currentPassword && profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast.error("New passwords do not match");
          return;
        }

        if (profileData.newPassword.length < 6) {
          toast.error("New password must be at least 6 characters");
          return;
        }

        await authAPI.updatePassword({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        });

        toast.success("Password updated successfully");

        // Clear password fields
        setProfileData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // ✅ Save to backend instead of localStorage
      await adminAPI.updateNotificationSettings({
        notificationSettings,
      });

      toast.success("Notification settings updated");
    } catch (error) {
      console.error("Notification settings error:", error);
      toast.error("Failed to update notification settings");
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // ✅ Save to backend database
      await adminAPI.updateStoreSettings(storeSettings);

      toast.success("Store settings updated successfully");
    } catch (error) {
      console.error("Store settings error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update store settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validate: At least one payment method must be enabled
    if (!paymentSettings.razorpayEnabled && !paymentSettings.codEnabled) {
      toast.error("At least one payment method must be enabled");
      return;
    }

    try {
      setLoading(true);

      // ✅ Save to backend
      const response = await adminAPI.updatePaymentSettings({
        razorpayEnabled: paymentSettings.razorpayEnabled,
        codEnabled: paymentSettings.codEnabled,
        paymentGatewayMode: paymentSettings.paymentGatewayMode,
      });

      if (response.data.success) {
        toast.success("Payment settings updated successfully");

        // Also save to localStorage as backup
        localStorage.setItem(
          "paymentSettings",
          JSON.stringify(paymentSettings)
        );
      }
    } catch (error) {
      console.error("Failed to update payment settings:", error);
      toast.error(
        error.response?.data?.message || "Failed to update payment settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "store", label: "Store", icon: SettingsIcon },
    { id: "payment", label: "Payment", icon: CreditCard },
  ];

  if (loading && !user) {
    return <Loading size="lg" text="Loading settings..." />;
  }

  return (
    <div className="admin-settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your admin account and store configuration</p>
      </div>

      <div className="settings-content">
        {/* Settings Navigation */}
        <div className="settings-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Forms */}
        <div className="settings-panel">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Profile Settings</h2>
                <p>Update your personal information and password</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="settings-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          firstName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          lastName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="password-section">
                  <h3>Change Password</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <div className="password-input">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          value={profileData.currentPassword}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              currentPassword: e.target.value,
                            })
                          }
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        value={profileData.newPassword}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        value={profileData.confirmPassword}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" loading={loading}>
                    <Save size={18} />
                    Save Profile
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Notification Settings</h2>
                <p>Choose which notifications you want to receive</p>
              </div>

              <form
                onSubmit={handleNotificationsSubmit}
                className="settings-form"
              >
                <div className="notification-options">
                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Email Notifications</h4>
                      <p>Receive notifications via email</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked,
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Order Updates</h4>
                      <p>Get notified about new orders and status changes</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.orderUpdates}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            orderUpdates: e.target.checked,
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>New Users</h4>
                      <p>Get notified when new users register</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.newUsers}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            newUsers: e.target.checked,
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Low Stock Alerts</h4>
                      <p>Get notified when products are running low</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.lowStock}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            lowStock: e.target.checked,
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>Sales Reports</h4>
                      <p>Receive weekly sales report summaries</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.salesReports}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            salesReports: e.target.checked,
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h4>System Updates</h4>
                      <p>Get notified about system maintenance and updates</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.systemUpdates}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            systemUpdates: e.target.checked,
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" loading={loading}>
                    <Save size={18} />
                    Save Notifications
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Store Settings */}
          {activeTab === "store" && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Store Settings</h2>
                <p>Configure your store information and regional settings</p>
              </div>

              <form onSubmit={handleStoreSubmit} className="settings-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Store Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={storeSettings.storeName}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          storeName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Store Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={storeSettings.storeDescription}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          storeDescription: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                      className="form-control"
                      value={storeSettings.currency}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          currency: e.target.value,
                        })
                      }
                    >
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="GBP">British Pound (£)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select
                      className="form-control"
                      value={storeSettings.timezone}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          timezone: e.target.value,
                        })
                      }
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">
                        America/New_York (EST)
                      </option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={storeSettings.taxRate}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          taxRate: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Free Shipping Threshold (₹)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={storeSettings.freeShippingThreshold}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          freeShippingThreshold: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Standard Shipping Cost (₹)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={storeSettings.standardShippingCost}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          standardShippingCost: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Express Shipping Cost (₹)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={storeSettings.expressShippingCost}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          expressShippingCost: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" loading={loading}>
                    <Save size={18} />
                    Save Store Settings
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === "payment" && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Payment Settings</h2>
                <p>Configure payment gateways and options</p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="settings-form">
                <div className="payment-methods">
                  <div className="payment-method">
                    <div className="method-header">
                      <h3>Razorpay</h3>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={paymentSettings.razorpayEnabled}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              razorpayEnabled: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    {/* {paymentSettings.razorpayEnabled && (
                      <div className="method-config">
                        <div className="form-group">
                          <label className="form-label">Razorpay Key ID</label>
                          <input
                            type="text"
                            className="form-control"
                            value={paymentSettings.razorpayKeyId}
                            onChange={(e) =>
                              setPaymentSettings({
                                ...paymentSettings,
                                razorpayKeyId: e.target.value,
                              })
                            }
                            placeholder="rzp_test_xxxxxxxxxx"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Razorpay Key Secret
                          </label>
                          <input
                            type="password"
                            className="form-control"
                            value={paymentSettings.razorpayKeySecret}
                            onChange={(e) =>
                              setPaymentSettings({
                                ...paymentSettings,
                                razorpayKeySecret: e.target.value,
                              })
                            }
                            placeholder="••••••••••••••••"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Mode</label>
                          <select
                            className="form-control"
                            value={paymentSettings.paymentGatewayMode}
                            onChange={(e) =>
                              setPaymentSettings({
                                ...paymentSettings,
                                paymentGatewayMode: e.target.value,
                              })
                            }
                          >
                            <option value="test">Test Mode</option>
                            <option value="live">Live Mode</option>
                          </select>
                        </div>
                      </div>
                    )} */}
                  </div>

                  <div className="payment-method">
                    <div className="method-header">
                      <h3>Cash on Delivery</h3>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={paymentSettings.codEnabled}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              codEnabled: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" loading={loading}>
                    <Save size={18} />
                    Save Payment Settings
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
