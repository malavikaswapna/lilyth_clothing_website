import React, { useState, useEffect } from 'react';
import { reviewsAPI } from '../../services/api';
import { Star, Edit, Trash2, Package, X } from 'lucide-react';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const UserReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [editingReview, setEditingReview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    rating: 5,
    sizing: '',
    isRecommended: true
  });

  useEffect(() => {
    loadUserReviews();
  }, []);

  const loadUserReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsAPI.getUserReviews();
      setReviews(response.data.reviews);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setEditForm({
      title: review.title,
      content: review.content,
      rating: review.rating,
      sizing: review.sizing || '',
      isRecommended: review.isRecommended
    });
    setShowEditModal(true);
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await reviewsAPI.updateReview(editingReview._id, editForm);
      toast.success('Review updated successfully');
      setShowEditModal(false);
      setEditingReview(null);
      loadUserReviews(); // Refresh the list
    } catch (error) {
      console.error('Failed to update review:', error);
      toast.error('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await reviewsAPI.deleteReview(reviewId);
        toast.success('Review deleted successfully');
        loadUserReviews();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete review');
      }
    }
  };

  // Keep your existing star rendering style (Lucide icons)
  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${star <= rating ? 'filled' : 'empty'} ${interactive ? 'interactive' : ''}`}
            onClick={interactive ? () => onRatingChange(star) : undefined}
            style={interactive ? { cursor: 'pointer' } : {}}
          />
        ))}
      </div>
    );
  };

  if (loading) return <Loading size="md" text="Loading your reviews..." />;

  return (
    <div className="user-reviews">
      <div className="reviews-header">
        <h2>My Reviews</h2>
        <p>Manage all your product reviews</p>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="review-modal-overlay">
          <div className="review-modal">
            <div className="review-modal-header">
              <h3>Edit Review</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReview(null);
                }}
                className="modal-close-btn"
              >
                <X size={24} />
              </button>
            </div>

            <div className="review-modal-body">
              <form onSubmit={handleUpdateReview} className="review-form">
                <div className="form-section">
                  <label className="form-label">Overall Rating *</label>
                  <div className="rating-section">
                    {renderStars(editForm.rating, true, (rating) =>
                      setEditForm({ ...editForm, rating })
                    )}
                    <span className="rating-text">({editForm.rating} out of 5 stars)</span>
                  </div>
                </div>

                <div className="form-section">
                  <label className="form-label">Review Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Review *</label>
                  <textarea
                    className="form-textarea"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows="4"
                    required
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Sizing</label>
                  <select
                    className="form-select"
                    value={editForm.sizing}
                    onChange={(e) => setEditForm({ ...editForm, sizing: e.target.value })}
                  >
                    <option value="">Select sizing</option>
                    <option value="runs_small">Runs Small</option>
                    <option value="true_to_size">True to Size</option>
                    <option value="runs_large">Runs Large</option>
                  </select>
                </div>

                <div className="form-section">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={editForm.isRecommended}
                      onChange={(e) => setEditForm({ ...editForm, isRecommended: e.target.checked })}
                    />
                    <span className="checkmark"></span>
                    I recommend this product
                  </label>
                </div>

                <div className="form-actions">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Review
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="no-reviews">
          <Package size={48} />
          <h3>No Reviews Yet</h3>
          <p>You haven't written any reviews yet. Purchase products and share your experience!</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review._id} className="review-card">
              <div className="product-info">
                <img 
                  src={review.product.images?.[0]?.url} 
                  alt={review.product.name}
                  className="product-image"
                />
                <div className="product-details">
                  <h4>{review.product.name}</h4>
                  <div className="review-rating">
                    {renderStars(review.rating)}
                    <span className="rating-text">{review.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="review-content">
                <h5>{review.title}</h5>
                <p>{review.content}</p>
                <div className="review-meta">
                  <span>Written on {new Date(review.createdAt).toLocaleDateString()}</span>
                  {review.isVerifiedPurchase && (
                    <span className="verified-badge">Verified Purchase</span>
                  )}
                </div>
              </div>

              <div className="review-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditReview(review)}
                >
                  <Edit size={14} />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteReview(review._id)}
                  className="delete-btn"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserReviews;