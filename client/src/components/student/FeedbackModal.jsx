import React, { useState } from "react";
import { X, Star, Loader2 } from "lucide-react";

const FeedbackModal = ({ isOpen, onClose, onSubmit, isLoading, initialRating = 0, initialComment = "", isEdit = false }) => {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(initialComment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // keep local state in sync when opening for edit
  React.useEffect(() => {
    if (isOpen) {
      setRating(initialRating || 0);
      setComment(initialComment || "");
    }
  }, [isOpen, initialRating, initialComment]);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ rating, comment });
      setRating(0);
      setComment("");
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Share Your Feedback</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              How would you rate this course?
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={isSubmitting}
                  className="p-1 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs text-gray-500 mt-2">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              placeholder="Share what you liked or areas for improvement..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#a435f0] focus:border-transparent outline-none text-sm disabled:bg-gray-100 disabled:opacity-50 text-gray-900"
              rows="4"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">
              {comment.length}/500 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="px-4 py-2 text-sm rounded bg-[#a435f0] text-white hover:bg-[#8710d8] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isEdit ? "Updating..." : "Submitting..."}
              </>
            ) : (
              isEdit ? "Update Feedback" : "Submit Feedback"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
