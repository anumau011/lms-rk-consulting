const express = require('express');
const router = express.Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const Enrollment = require('../models/Enrollment');
const Lecture = require('../models/Lecture');
const Progress = require('../models/Progress');
const { normalizeEnrollmentTier, canViewVideo } = require('../utils/tierAccess');

/** POST /:lectureId/complete — Mark a lecture as completed. */
router.post(
  '/:lectureId/complete',
  requireAuth,
  attachUser,
  asyncHandler(async (req, res) => {
    const { lectureId } = req.params;
    const userId = String(req.user._id);

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

    const enrollment = await Enrollment.findOne({
      userId,
      courseId: lecture.courseId,
      'purchase.status': 'CAPTURED',
    });
    if (!enrollment) return res.status(403).json({ error: 'Not Enrolled' });

    if (!canViewVideo(normalizeEnrollmentTier(enrollment.tier))) {
      return res.status(403).json({
        error: 'Lecture completion is available on Gold and Platinum plans.',
        code: 'TIER_PROGRESS_BLOCKED',
      });
    }

    const existingProgress = await Progress.findOne({ userId, courseId: lecture.courseId })
      .select('lectureCompleted')
      .lean();

    const alreadyCompleted = (existingProgress?.lectureCompleted || []).some(
      (id) => String(id) === String(lecture._id)
    );

    if (!alreadyCompleted) {
      await Progress.findOneAndUpdate(
        { userId, courseId: lecture.courseId },
        {
          $addToSet: { lectureCompleted: lecture._id },
          $set: { lastUpdatedAt: new Date() },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      success: true,
      message: alreadyCompleted ? 'Lecture already completed' : 'Lecture marked as completed',
    });
  })
);

module.exports = router;
