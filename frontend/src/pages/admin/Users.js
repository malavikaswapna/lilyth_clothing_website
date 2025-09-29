import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    active: '',
    page: 1
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
  try {
    setLoading(true);
    
    // Clean up filters - remove empty values
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    console.log('Sending filters to backend:', cleanFilters); // Debug log
    
      const response = await adminAPI.getAllUsers(filters);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
  
    // Remove empty filter values to ensure they don't get sent to backend
    if (value === '') {
      delete newFilters[key];
    }
    
    setFilters(newFilters);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUser(response.data);
      setShowUserModal(true);
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  if (loading) return <Loading size="lg" text="Loading users..." />;

  return (
    <div className="admin-users">
      <div className="users-header">
        <h1>User Management</h1>
        <p>Manage your store's customers and their accounts</p>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={filters.search}
            onChange={handleSearch}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.active || ''}
            onChange={(e) => handleFilterChange('active', e.target.value)}
          >
            <option value="">All Users</option>
            <option value="true">Active Users</option>
            <option value="false">Inactive Users</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Join Date</th>
              <th>Orders</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <h4>{user.firstName} {user.lastName}</h4>
                      <p>{user.phone || 'No phone'}</p>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>{user.totalOrders || 0}</td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      onClick={() => viewUserDetails(user._id)}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user._id, user.isActive)}
                      className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handleFilterChange('page', page)}
              className={`page-btn ${pagination.page === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                <div className="user-avatar large">
                  {selectedUser.user.firstName[0]}{selectedUser.user.lastName[0]}
                </div>
                <h3>{selectedUser.user.firstName} {selectedUser.user.lastName}</h3>
                
                <div className="detail-grid">
                  <div className="detail-item">
                    <Mail size={16} />
                    <span>{selectedUser.user.email}</span>
                  </div>
                  {selectedUser.user.phone && (
                    <div className="detail-item">
                      <Phone size={16} />
                      <span>{selectedUser.user.phone}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>Joined {new Date(selectedUser.user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="user-stats">
                  <div className="stat">
                    <h4>{selectedUser.user.totalOrders || 0}</h4>
                    <p>Total Orders</p>
                  </div>
                  <div className="stat">
                    <h4>₹{selectedUser.user.totalSpent || 0}</h4>
                    <p>Total Spent</p>
                  </div>
                </div>

                {selectedUser.orders.length > 0 && (
                  <div className="recent-orders">
                    <h4>Recent Orders</h4>
                    {selectedUser.orders.map((order) => (
                      <div key={order._id} className="order-item">
                        <span>#{order.orderNumber}</span>
                        <span>₹{order.total}</span>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;