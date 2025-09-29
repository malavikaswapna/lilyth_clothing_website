import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, User, Package, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { userAPI, ordersAPI } from '../services/api';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import BackgroundWrapper from '../components/common/BackgroundWrapper';
import toast from 'react-hot-toast';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, items, cartItems, cartTotal, clearCart, loading: cartLoading } = useCart();
  const { user, isAuthenticated } = useAuth();
  
  // Use items array as the actual cart data
  const actualCart = items || [];
  const actualTotal = cartTotal || 0;
  
  console.log('Checkout cart data:', { cart, items, cartItems, actualCart, cartTotal });
  
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null); // Track selected saved address
  
  // Form data
  const [shippingData, setShippingData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });
  
  const [paymentData, setPaymentData] = useState({
    method: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });

  // Redirect if not authenticated or empty cart
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    
    if (!actualCart || !Array.isArray(actualCart) || actualCart.length === 0) {
      navigate('/cart');
      return;
    }
    
    loadUserData();
  }, [isAuthenticated, actualCart]);

  const loadUserData = async () => {
  try {
    setLoading(true);
    
    // Use your existing API service instead of fetch
    const response = await userAPI.getProfile();
    console.log('User data response:', response.data); // Debug log
    
    if (response.data.success && response.data.user && response.data.user.addresses) {
      setUserAddresses(response.data.user.addresses);
      console.log('Found addresses:', response.data.user.addresses); // Debug log
      
      // Pre-fill with default address if available
      const defaultAddress = response.data.user.addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setShippingData({
          ...shippingData,
          firstName: defaultAddress.firstName || user?.firstName || '',
          lastName: defaultAddress.lastName || user?.lastName || '',
          email: user?.email || '',
          phone: defaultAddress.phone || '',
          address: defaultAddress.addressLine1 || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          zipCode: defaultAddress.postalCode || '',
          country: defaultAddress.country || 'India'
        });
      }
    } else {
      console.log('No addresses found in user data');
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    // Continue without pre-filled data - don't show error to user
  } finally {
    setLoading(false);
  }
};

  const handleAddressSelection = (address, index) => {
    if (address === null || index === null) {
      // Deselect if the same address is clicked again
      setSelectedAddressIndex(null);
      // Clear the form back to user defaults
      setShippingData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      });
    return;
  }

  if (selectedAddressIndex === index) {
    // Deselect if the same address is clicked again
    setSelectedAddressIndex(null);
    // Clear the form back to user defaults
    setShippingData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    });
    } else {
      // Select the new address
      setSelectedAddressIndex(index);
      setShippingData({
        firstName: address.firstName || user?.firstName || '',
        lastName: address.lastName || user?.lastName || '',
        email: user?.email || '',
        phone: address.phone || '',
        address: address.addressLine1 || address?.address || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.postalCode || address?.zipCode || '',
        country: address.country || 'India'
      });
    }
  };

  const calculateTotals = () => {
    if (!actualCart || !Array.isArray(actualCart) || actualCart.length === 0) {
      return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
    }
    
    // Try to use the existing cartTotal if available, otherwise calculate
    let subtotal;
    if (actualTotal && actualTotal > 0) {
      subtotal = actualTotal;
    } else {
      subtotal = actualCart.reduce((sum, item) => {
        const price = item.product?.salePrice || item.product?.price || 0;
        return sum + (price * (item.quantity || 1));
      }, 0);
    }
    
    const shipping = subtotal > 2000 ? 0 : 199; // Free shipping over ₹2000
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + shipping + tax;
    
    return { subtotal, shipping, tax, total };
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    
    // If a saved address is selected, use it directly
    if (selectedAddressIndex !== null) {
      setCurrentStep(2);
      return;
    }
    
    // Otherwise validate the manual form
    const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    const missing = required.filter(field => !shippingData[field]?.trim());
    
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (paymentData.method === 'card') {
      // Validate payment form
      const required = ['cardNumber', 'expiryDate', 'cvv', 'nameOnCard'];
      const missing = required.filter(field => !paymentData[field]?.trim());
      
      if (missing.length > 0) {
        toast.error(`Please fill in: ${missing.join(', ')}`);
        return;
      }
      
      // Basic card validation
      if (paymentData.cardNumber.replace(/\s/g, '').length < 16) {
        toast.error('Invalid card number');
        return;
      }
    }
    
    setCurrentStep(3);
  };

  const placeOrder = async () => {
    try {
      setProcessing(true);
      
      const { subtotal, shipping, tax, total } = calculateTotals();
      
      const orderData = {
        items: actualCart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          price: item.product.salePrice || item.product.price
        })),
        shippingAddress: shippingData,
        paymentMethod: paymentData.method,
        subtotal,
        shipping,
        tax,
        total,
        // In a real app, you'd process payment here and get payment details
        paymentStatus: 'completed'
      };

      const response = await ordersAPI.createOrder(orderData);
      
      if (response.data.success) {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/account/orders/${response.data.order._id}`, { 
          state: { orderSuccess: true }
        });
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return <Loading size="lg" text="Loading checkout..." fullScreen />;
  }

  return (
    <BackgroundWrapper>
      <div className="checkout-page">
        <div className="container">
          {/* Header */}
          <div className="checkout-header">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Checkout</h1>
            <div className="step-indicator">
              <span className={currentStep >= 1 ? 'active' : ''}>1</span>
              <span className={currentStep >= 2 ? 'active' : ''}>2</span>
              <span className={currentStep >= 3 ? 'active' : ''}>3</span>
            </div>
          </div>

          <div className="checkout-content">
            {/* Main Content */}
            <div className="checkout-main">
              
              {/* Step 1: Shipping Information */}
              {currentStep === 1 && (
                <div className="checkout-step">
                  <div className="step-header">
                    <MapPin size={24} />
                    <h2>Shipping Information</h2>
                  </div>
                  
                  {/* Saved Addresses */}
                  {userAddresses && userAddresses.length > 0 && (
                    <div className="saved-addresses">
                      <h3>Use Saved Address</h3>
                      <div className="address-options">
                        {userAddresses.map((address, index) => (
                          <div key={index} className={`address-option ${selectedAddressIndex === index ? 'selected' : ''}`}>
                            <label>
                              <input
                              type="radio"
                              name="savedAddress"
                              checked={selectedAddressIndex === index}
                              onChange={() => handleAddressSelection(address, index)}
                              />
                              <div className="address-display">
                                <p><strong>{address.firstName} {address.lastName}</strong></p>
                                <p>{address.addressLine1}</p>
                                {address.addressLine2 && <p>{address.addressLine2}</p>}
                                <p>{address.city}, {address.state} {address.postalCode}</p>
                                <p>{address.phone}</p>
                                {address.isDefault && <span className="default-badge">Default</span>}
                              </div>
                             </label>
                            </div>
                          ))}
                        </div>
                        
                        {selectedAddressIndex !== null && (
                          <div className="address-actions">
                            <button 
                            type="button" 
                            className="clear-selection-btn"
                            onClick={() => handleAddressSelection(null, null)}
                            >
                              Clear Selection & Enter New Address
                            </button>
                           </div>
                          )}
                        </div>
                      )}
                  
                  {selectedAddressIndex === null && (
                    <>
                      <div className="form-divider">
                        <span>Enter New Address</span>
                      </div>
                      
                      <form onSubmit={handleShippingSubmit} className="checkout-form">
                        {/* All your form fields go here */}
                        <div className="form-row">
                          <div className="form-group">
                            <label>First Name *</label>
                            <input
                              type="text"
                              value={shippingData.firstName}
                              onChange={(e) => setShippingData({...shippingData, firstName: e.target.value})}
                              placeholder="Enter first name"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Last Name *</label>
                            <input
                              type="text"
                              value={shippingData.lastName}
                              onChange={(e) => setShippingData({...shippingData, lastName: e.target.value})}
                              placeholder="Enter last name"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Email *</label>
                            <input
                              type="email"
                              value={shippingData.email}
                              onChange={(e) => setShippingData({...shippingData, email: e.target.value})}
                              placeholder="your@email.com"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Phone *</label>
                            <input
                              type="tel"
                              value={shippingData.phone}
                              onChange={(e) => setShippingData({...shippingData, phone: e.target.value})}
                              placeholder="+91 9876543210"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Street Address *</label>
                          <input
                            type="text"
                            value={shippingData.address}
                            onChange={(e) => setShippingData({...shippingData, address: e.target.value})}
                            placeholder="House number, street name, area"
                            required
                          />
                        </div>
                        
                        <div className="form-row three-col">
                          <div className="form-group">
                            <label>City *</label>
                            <input
                              type="text"
                              value={shippingData.city}
                              onChange={(e) => setShippingData({...shippingData, city: e.target.value})}
                              placeholder="City"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>State *</label>
                            <select
                              value={shippingData.state}
                              onChange={(e) => setShippingData({...shippingData, state: e.target.value})}
                              required
                            >
                              <option value="">Select State</option>
                              <option value="Kerala">Kerala</option>
                              <option value="Tamil Nadu">Tamil Nadu</option>
                              <option value="Karnataka">Karnataka</option>
                              <option value="Maharashtra">Maharashtra</option>
                              <option value="Delhi">Delhi</option>
                              <option value="West Bengal">West Bengal</option>
                              <option value="Gujarat">Gujarat</option>
                              <option value="Rajasthan">Rajasthan</option>
                              <option value="Punjab">Punjab</option>
                              <option value="Haryana">Haryana</option>
                              <option value="Uttar Pradesh">Uttar Pradesh</option>
                              <option value="Madhya Pradesh">Madhya Pradesh</option>
                              <option value="Bihar">Bihar</option>
                              <option value="Odisha">Odisha</option>
                              <option value="Jharkhand">Jharkhand</option>
                              <option value="Chhattisgarh">Chhattisgarh</option>
                              <option value="Assam">Assam</option>
                              <option value="Telangana">Telangana</option>
                              <option value="Andhra Pradesh">Andhra Pradesh</option>
                              <option value="Himachal Pradesh">Himachal Pradesh</option>
                              <option value="Uttarakhand">Uttarakhand</option>
                              <option value="Goa">Goa</option>
                              <option value="Manipur">Manipur</option>
                              <option value="Meghalaya">Meghalaya</option>
                              <option value="Tripura">Tripura</option>
                              <option value="Nagaland">Nagaland</option>
                              <option value="Mizoram">Mizoram</option>
                              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                              <option value="Sikkim">Sikkim</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>PIN Code *</label>
                            <input
                              type="text"
                              value={shippingData.zipCode}
                              onChange={(e) => setShippingData({...shippingData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                              placeholder="600001"
                              maxLength="6"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Country</label>
                          <input
                            type="text"
                            value={shippingData.country}
                            disabled
                            className="disabled-input"
                          />
                        </div>
                        
                        <Button type="submit" className="continue-btn">
                          Continue to Payment
                        </Button>
                      </form>
                    </>
                  )}
                  
                  {selectedAddressIndex !== null && (
                    <div className="selected-address-actions">
                      <Button 
                        type="button" 
                        className="continue-btn"
                        onClick={() => setCurrentStep(2)}
                      >
                        Continue with Selected Address
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Payment Information */}
              {currentStep === 2 && (
                <div className="checkout-step">
                  <div className="step-header">
                    <CreditCard size={24} />
                    <h2>Payment Information</h2>
                  </div>
                  
                  <form onSubmit={handlePaymentSubmit} className="checkout-form">
                    <div className="payment-methods">
                      <label className="payment-method">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentData.method === 'card'}
                          onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
                        />
                        <CreditCard size={20} />
                        Credit/Debit Card
                      </label>
                      
                      <label className="payment-method">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={paymentData.method === 'cod'}
                          onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
                        />
                        <Package size={20} />
                        Cash on Delivery
                      </label>
                    </div>
                    
                    {paymentData.method === 'card' && (
                      <div className="card-details">
                        <div className="form-group">
                          <label>Name on Card *</label>
                          <input
                            type="text"
                            value={paymentData.nameOnCard}
                            onChange={(e) => setPaymentData({...paymentData, nameOnCard: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Card Number *</label>
                          <input
                            type="text"
                            value={paymentData.cardNumber}
                            onChange={(e) => setPaymentData({...paymentData, cardNumber: formatCardNumber(e.target.value)})}
                            placeholder="1234 5678 9012 3456"
                            maxLength="19"
                            required
                          />
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Expiry Date *</label>
                            <input
                              type="text"
                              value={paymentData.expiryDate}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length >= 2) {
                                  value = value.substring(0, 2) + '/' + value.substring(2, 4);
                                }
                                setPaymentData({...paymentData, expiryDate: value});
                              }}
                              placeholder="MM/YY"
                              maxLength="5"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>CVV *</label>
                            <input
                              type="text"
                              value={paymentData.cvv}
                              onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value.replace(/\D/g, '')})}
                              placeholder="123"
                              maxLength="4"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="checkout-actions">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                        Back to Shipping
                      </Button>
                      <Button type="submit" className="continue-btn">
                        Review Order
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 3: Order Review */}
              {currentStep === 3 && (
                <div className="checkout-step">
                  <div className="step-header">
                    <CheckCircle size={24} />
                    <h2>Review Your Order</h2>
                  </div>
                  
                  <div className="order-review">
                    {/* Shipping Address */}
                    <div className="review-section">
                      <h3>Shipping Address</h3>
                      <div className="address-display">
                        <p>{shippingData.firstName} {shippingData.lastName}</p>
                        <p>{shippingData.address}</p>
                        <p>{shippingData.city}, {shippingData.state} {shippingData.zipCode}</p>
                        <p>{shippingData.phone}</p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(1)} className="edit-btn">
                        Edit
                      </button>
                    </div>
                    
                    {/* Payment Method */}
                    <div className="review-section">
                      <h3>Payment Method</h3>
                      <p>
                        {paymentData.method === 'card' 
                          ? `Card ending in ${paymentData.cardNumber.slice(-4)}` 
                          : 'Cash on Delivery'
                        }
                      </p>
                      <button type="button" onClick={() => setCurrentStep(2)} className="edit-btn">
                        Edit
                      </button>
                    </div>
                    
                    <div className="final-actions">
                      <Button 
                        onClick={placeOrder} 
                        loading={processing}
                        disabled={processing}
                        className="place-order-btn"
                      >
                        <Lock size={18} />
                        {processing ? 'Processing...' : `Place Order - ₹${totals.total}`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="order-summary">
              <h3>Order Summary</h3>
              
              <div className="cart-items">
                {actualCart && Array.isArray(actualCart) && actualCart.length > 0 ? (
                  actualCart.map((item, index) => (
                    <div key={`${item.product?._id || index}-${item.size}-${item.color}`} className="cart-item">
                      <img 
                        src={item.product?.images?.[0]?.url || '/placeholder-image.jpg'} 
                        alt={item.product?.name || 'Product'} 
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                      <div className="item-details">
                        <h4>{item.product?.name || 'Product'}</h4>
                        <p>Size: {item.size} | Color: {item.color}</p>
                        <p>Qty: {item.quantity}</p>
                      </div>
                      <div className="item-price">
                        ₹{((item.product?.salePrice || item.product?.price || 0) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-cart">
                    <p>Your cart is empty</p>
                  </div>
                )}
              </div>
              
              <div className="order-totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping:</span>
                  <span>{totals.shipping === 0 ? 'Free' : `₹${totals.shipping}`}</span>
                </div>
                <div className="total-row">
                  <span>Tax (GST):</span>
                  <span>₹{totals.tax.toFixed(2)}</span>
                </div>
                <div className="total-row final-total">
                  <span>Total:</span>
                  <span>₹{totals.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="security-notice">
                <Lock size={16} />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Checkout;
