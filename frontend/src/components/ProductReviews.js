import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, Edit, Trash2, X } from 'lucide-react';
import { reviewsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from './common/Button';
import Loading from './common/Loading';
import toast from 'react-hot-toast';
import './ProductReviews.css';

const ProductReviews = ({ productId, userCanReview, orderId, existingUserReview }) => {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    rating: '',
    sort: 'newest',
    page: 1
  });

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    title: '',
    content: '',
    rating: 5,
    pros: [''],
    cons: [''],
    sizing: '',
    isRecommended: true
  });

  useEffect(() => {
    loadReviews();
  }, [productId, filters]);

  const loadReviews = async () => {
    try {
    console.log('=== LOADING REVIEWS ===');
    console.log('Product ID:', productId);
    console.log('Filters:', filters);

      setLoading(true);
      const response = await reviewsAPI.getProductReviews(productId, filters);
    
    console.log('Reviews API response:', response.data);
    console.log('Reviews found:', response.data.reviews);
    console.log('Reviews count:', response.data.reviews?.length);

      setReviews(response.data.reviews);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!reviewForm.title.trim() || !reviewForm.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const reviewData = {
        ...reviewForm,
        pros: reviewForm.pros.filter(p => p.trim()),
        cons: reviewForm.cons.filter(c => c.trim()),
        orderId
      };

      if (editingReview) {
        await reviewsAPI.updateReview(editingReview._id, reviewData);
        toast.success('Review updated successfully');
      } else {
        await reviewsAPI.createReview(productId, reviewData);
        toast.success('Review submitted successfully');
      }

      setShowReviewForm(false);
      setEditingReview(null);
      resetForm();
      loadReviews();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const resetForm = () => {
    setReviewForm({
      title: '',
      content: '',
      rating: 5,
      pros: [''],
      cons: [''],
      sizing: '',
      isRecommended: true
    });
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setReviewForm({
      title: review.title,
      content: review.content,
      rating: review.rating,
      pros: review.pros?.length ? review.pros : [''],
      cons: review.cons?.length ? review.cons : [''],
      sizing: review.sizing || '',
      isRecommended: review.isRecommended
    });
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await reviewsAPI.deleteReview(reviewId);
        toast.success('Review deleted successfully');
        loadReviews();
      } catch (error) {
        toast.error('Failed to delete review');
      }
    }
  };

  const handleHelpfulVote = async (reviewId, isHelpful) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      return;
    }

    try {
      await reviewsAPI.markHelpful(reviewId, { isHelpful });
      loadReviews();
    } catch (error) {
      toast.error('Failed to record vote');
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null, size = "normal") => {
    const handleStarClick = (starValue) => {
      if (interactive && onRatingChange) {
        onRatingChange(starValue);
      }
    };

    const handleStarHover = (starValue) => {
      if (interactive) {
         // You can add hover preview logic here if needed
      }
    };

    return (
      <div className={`star-rating ${interactive ? 'interactive' : ''} ${size}`}>
      {[1, 2, 3, 4, 5].map((starValue) => (
        <span
          key={starValue}
          className={`star ${starValue <= rating ? 'filled' : 'empty'} ${interactive ? 'clickable' : ''}`}
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
        >
          ★
        </span>
        ))}
        {interactive && (
          <span className="rating-text">({rating} out of 5 stars)</span>
        )}
      </div>
    );
  };

  if (loading) {
    return <Loading size="md" text="Loading reviews..." />;
  }

  return (
    <div className="product-reviews">
      <div className="reviews-header">
        <h3>Customer Reviews</h3>
        {userCanReview && !existingUserReview && (
          <Button
            onClick={() => setShowReviewForm(true)}
            className="write-review-btn"
          >
            Write a Review
          </Button>
        )}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="review-modal-overlay">
          <div className="review-modal">
            <div className="review-modal-header">
              <h3>{editingReview ? 'Edit Review' : 'Write a Review'}</h3>
              <button
                onClick={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                  resetForm();
                }}
                className="modal-close-btn"
              >
                <X size={24} />
              </button>
            </div>

            <div className="review-modal-body">
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="form-section">
                  <label className="form-label">Overall Rating *</label>
                  <div className="rating-section">
                    {renderStars(reviewForm.rating, true, (rating) =>
                      setReviewForm({ ...reviewForm, rating })
                    )}
                    <span className="rating-text">({reviewForm.rating} out of 5 stars)</span>
                  </div>
                </div> 

                <div className="form-section">
                  <label className="form-label">Review Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    placeholder="Summarize your experience"
                    required
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Review *</label>
                  <textarea
                    className="form-textarea"
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                    placeholder="Tell others about your experience with this product"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Sizing</label>
                  <select
                    className="form-select"
                    value={reviewForm.sizing}
                    onChange={(e) => setReviewForm({ ...reviewForm, sizing: e.target.value })}
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
                      checked={reviewForm.isRecommended}
                      onChange={(e) => setReviewForm({ ...reviewForm, isRecommended: e.target.checked })}
                    />
                    <span className="checkmark"></span>
                    I recommend this product
                  </label>
                </div>

                <div className="form-actions">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowReviewForm(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="submit-btn">
                    {editingReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="review-item">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">
                    {review.user.firstName} {review.user.lastName[0]}.
                  </span>
                  {review.isVerifiedPurchase && (
                    <span className="verified-badge">Verified Purchase</span>
                  )}
                </div>
                <div className="review-meta">
                  {renderStars(review.rating)}
                  <span className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="review-content">
                <h4>{review.title}</h4>
                <p>{review.content}</p>
                
                {review.sizing && (
                  <div className="sizing-info">
                    <strong>Sizing: </strong>
                    {review.sizing.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                )}
              </div>

              <div className="review-actions">
                {isAuthenticated && user?.id === review.user._id && (
                  <div className="owner-actions">
                    <button
                      onClick={() => handleEditReview(review)}
                      className="action-btn edit"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review._id)}
                      className="action-btn delete"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}

                <div className="review-interactions">
                  <button
                    onClick={() => handleHelpfulVote(review._id, true)}
                    className="helpful-btn"
                  >
                    <ThumbsUp size={14} />
                    Helpful ({review.helpfulCount || 0})
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="reviews-pagination">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`page-btn ${pagination.page === page ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, page })}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
