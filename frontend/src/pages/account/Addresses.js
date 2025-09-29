import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { userAPI, authAPI } from '../../services/api';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { useAuth } from '../../context/AuthContext'; 
import toast from 'react-hot-toast';
import './Addresses.css';

const AddressModal = ({ isOpen, onClose, address, onSave }) => {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm();

  useEffect(() => {
    if (address) {
      // Populate form with existing address data
      Object.keys(address).forEach(key => {
        setValue(key, address[key]);
      });
    } else {
      reset();
    }
  }, [address, setValue, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await onSave(data);
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to save address:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{address ? 'Edit Address' : 'Add New Address'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="address-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address Type</label>
              <select 
                className="form-control"
                {...register('type', { required: 'Address type is required' })}
              >
                <option value="both">Shipping & Billing</option>
                <option value="shipping">Shipping Only</option>
                <option value="billing">Billing Only</option>
              </select>
              {errors.type && <span className="form-error">{errors.type.message}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-control"
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-control"
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company (Optional)</label>
            <input
              type="text"
              className="form-control"
              {...register('company')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address Line 1 *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Street address, P.O. box, c/o"
              {...register('addressLine1', { required: 'Address is required' })}
            />
            {errors.addressLine1 && <span className="form-error">{errors.addressLine1.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Address Line 2 (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Apartment, suite, unit, building, floor, etc."
              {...register('addressLine2')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">State *</label>
              <input
                type="text"
                className="form-control"
                {...register('state', { required: 'State is required' })}
              />
              {errors.state && <span className="form-error">{errors.state.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">City *</label>
              <input
               type="text" 
               className="form-control"
               placeholder="Enter your city"
                {...register('city', { required: 'City is required' })}
              />
              {errors.district && <span className="form-error">{errors.district.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">PIN Code *</label>
              <input
                type="text"
                className="form-control"
                {...register('postalCode', { 
                  required: 'PIN code is required',
                  pattern: {
                    value: /^[1-9][0-9]{5}$/,
                    message: 'Please enter a valid 6-digit PIN code'
                  }
                })}
              />
              {errors.postalCode && <span className="form-error">{errors.postalCode.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('isDefault')}
              />
              <span>Set as default address</span>
            </label>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {address ? 'Update Address' : 'Save Address'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Addresses = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
  if (isAuthenticated && !authLoading) {
    loadAddresses();
  }
}, [isAuthenticated, authLoading]);
  
  const loadAddresses = async () => {
    try {
        setLoading(true);
         const response = await authAPI.getProfile(); // or userAPI.getProfile()
         setAddresses(response.data.user.addresses || []);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleDeleteAddress = async (addressId) => {
  if (window.confirm('Are you sure you want to delete this address?')) {
    try {
      await userAPI.deleteAddress(addressId);
      await loadAddresses(); // Reload to get updated data
      toast.success('Address deleted successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete address';
      toast.error(message);
    }
  }
};

  const handleSaveAddress = async (addressData) => {
  try {
    if (editingAddress) {
      // Update existing address
      const response = await userAPI.updateAddress(editingAddress._id, addressData);
      // Reload addresses to get updated data
      await loadAddresses();
      toast.success('Address updated successfully');
    } else {
      // Add new address
      const response = await userAPI.addAddress(addressData);
      // Reload addresses to get updated data
      await loadAddresses();
      toast.success('Address added successfully');
    }
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to save address';
    toast.error(message);
    throw error;
  }
};

  if (loading) return <Loading size="lg" text="Loading addresses..." />;

  return (
    <div className="addresses-page">
      <div className="addresses-header">
        <h1>My Addresses</h1>
        <p>Manage your shipping and billing addresses</p>
        <Button onClick={handleAddAddress} className="add-address-btn">
          <Plus size={18} />
          Add New Address
        </Button>
      </div>

      <div className="addresses-grid">
        {addresses.length > 0 ? (
          addresses.map(address => (
            <div key={address._id} className="address-card">
              <div className="address-header">
                <div className="address-type">
                  <MapPin size={16} />
                  <span>{address.type === 'both' ? 'Shipping & Billing' : 
                        address.type === 'shipping' ? 'Shipping' : 'Billing'}</span>
                </div>
                {address.isDefault && (
                  <span className="default-badge">
                    <Check size={14} />
                    Default
                  </span>
                )}
              </div>

              <div className="address-details">
                <h3>{address.firstName} {address.lastName}</h3>
                {address.company && <p className="company">{address.company}</p>}
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>{address.city}, {address.state} {address.postalCode}</p>
                <p>{address.country}</p>
              </div>

              <div className="address-actions">
                <button 
                  onClick={() => handleEditAddress(address)}
                  className="action-btn edit-btn"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteAddress(address._id)}
                  className="action-btn delete-btn"
                  disabled={address.isDefault}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-addresses">
            <MapPin size={64} />
            <h3>No addresses saved</h3>
            <p>Add your first address to speed up checkout</p>
            <Button onClick={handleAddAddress}>
              <Plus size={18} />
              Add Address
            </Button>
          </div>
        )}
      </div>

      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        address={editingAddress}
        onSave={handleSaveAddress}
      />
    </div>
  );
};

export default Addresses;