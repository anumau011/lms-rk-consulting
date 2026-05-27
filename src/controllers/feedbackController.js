const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

/**
 * One score per enrollment: prefer courseRating (star rating), else feedback.rating.
 * Both /add-rating and /add-feedback paths update Course.averageRating + totalReviews.
 */
async function recalculateCourseRating(courseId) {
  const enrollments = await Enrollment.find({
    courseId,
    'purchase.status': 'CAPTURED',
  })
    .select('courseRating feedback')
    .lean();

  const scores = enrollments
    .map((e) => {
      const cr = e.courseRating;
      if (typeof cr === 'number' && cr >= 1 && cr <= 5) return cr;
      const fr = e.feedback?.rating;
      if (typeof fr === 'number' && fr >= 1 && fr <= 5) return fr;
      return null;
    })
    .filter((s) => s != null);

  if (scores.length === 0) {
    await Course.findByIdAndUpdate(courseId, { $set: { averageRating: 0, totalReviews: 0 } });
    return { averageRating: 0, totalReviews: 0 };
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  const averageRating = Number((sum / scores.length).toFixed(2));
  const totalReviews = scores.length;

  await Course.findByIdAndUpdate(courseId, { $set: { averageRating, totalReviews } });
  return { averageRating, totalReviews };
}

/** POST /user/add-rating — Add or update a star rating. */
const addRating = async (req, res) => {
  const { courseId, rating } = req.body;
  const userId = String(req.user._id);
  const numericRating = Number(rating);

  if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required' });
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: 'rating must be an integer between 1 and 5' });
  }

  const enrollment = await Enrollment.findOne({ userId, courseId, 'purchase.status': 'CAPTURED' });
  if (!enrollment) return res.status(403).json({ success: false, message: 'You can rate only after purchasing this course' });

  enrollment.courseRating = numericRating;
  enrollment.ratedAt = new Date();
  await enrollment.save();

  const stats = await recalculateCourseRating(enrollment.courseId);

  return res.json({
    success: true,
    message: 'Rating submitted successfully',
    rating: enrollment.courseRating,
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
  });
};

/** POST /user/add-feedback — Add or update feedback (rating + comment). */
const addFeedback = async (req, res) => {
  const { courseId, rating, comment } = req.body;
  const userId = String(req.user._id);
  const numericRating = Number(rating);

  if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required' });
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: 'rating must be an integer between 1 and 5' });
  }
  if (comment && typeof comment !== 'string') {
    return res.status(400).json({ success: false, message: 'comment must be a string' });
  }

  const enrollment = await Enrollment.findOne({ userId, courseId, 'purchase.status': 'CAPTURED' });
  if (!enrollment) return res.status(403).json({ success: false, message: 'You can submit feedback only after purchasing this course' });

  enrollment.feedback = { rating: numericRating, comment: comment || undefined, submittedAt: new Date() };
  await enrollment.save();

  const stats = await recalculateCourseRating(enrollment.courseId);

  return res.json({
    success: true,
    message: 'Feedback submitted successfully',
    feedback: enrollment.feedback,
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
  });
};

/** GET /course/:courseId/feedback — Public: list course feedback. */
const getCourseFeedback = async (req, res) => {
  const { courseId } = req.params;
  if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required' });

  const feedbackList = await Enrollment.find({
    courseId,
    'purchase.status': 'CAPTURED',
    'feedback.rating': { $exists: true, $ne: null },
  })
    .select('feedback userId')
    .populate('userId', 'firstName lastName email')
    .sort({ 'feedback.submittedAt': -1 })
    .lean();

  const formattedFeedback = feedbackList
    .map((e) => ({
      studentName: e.userId
        ? `${e.userId.firstName || ''} ${e.userId.lastName || ''}`.trim()
        : 'Anonymous',
      rating: e.feedback.rating,
      comment: e.feedback.comment,
      submittedAt: e.feedback.submittedAt,
    }))
    .filter((f) => f.comment);

  res.json({ success: true, courseId, feedback: formattedFeedback, count: formattedFeedback.length });
};

module.exports = { addRating, addFeedback, getCourseFeedback, recalculateCourseRating };
