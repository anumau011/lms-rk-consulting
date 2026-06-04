const Course = require('../models/Course');
const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Progress = require('../models/Progress');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const {
  normalizeEnrollmentTier,
  canDownloadCourseNotes,
  canViewVideo,
  normalizePricingTiersForDisplay,
  tierFinalAmount,
  isEnrollmentExpired,
} = require('../utils/tierAccess');

/**
 * Assemble course content (sections + lectures) for student-facing views.
 * @param {string} courseId
 * @returns {Promise<Array>}
 */
const getCourseContent = async (courseId) => {
  const sections = await Section.find({ courseId })
    .select('title order')
    .sort({ order: 1 })
    .lean();

  return Promise.all(
    sections.map(async (section) => {
      const lectures = await Lecture.find({ sectionId: section._id })
        .select('title order isFreePreview videoId')
        .populate('videoId', 'duration status')
        .sort({ order: 1 })
        .lean();

      return {
        chapterTitle: section.title,
        chapterContent: lectures.map((l) => ({
          lectureId: l._id,
          lectureTitle: l.title,
          lectureDuration: l.videoId?.duration || 0,
          isFreePreview: l.isFreePreview || false,
        })),
      };
    })
  );
};

/** GET /course/all — Public course catalog. */
const getAllCourses = async (req, res) => {
  const courses = await Course.find({ status: 'published' })
    .select('title slug subtitle thumbnail category level currency pricingTiers averageRating totalReviews enrollmentCount instructorId createdAt')
    .populate('instructorId', 'firstName lastName')
    .lean();

  const formattedCourses = courses.map((course) => {
    const displayTiers = normalizePricingTiersForDisplay(course.pricingTiers || []);
    const basicTier = displayTiers.find((t) => t.tier === 'basic');
    const goldTier = displayTiers.find((t) => t.tier === 'gold');
    const platinumTier = displayTiers.find((t) => t.tier === 'platinum');

    return {
      _id: course._id,
      title: course.title,
      subtitle: course.subtitle,
      thumbnail: course.thumbnail,
      category: course.category,
      level: course.level,
      currency: course.currency?.toUpperCase(),
      createdAt: course.createdAt,
      pricingTiers: displayTiers,
      price: {
        basic: basicTier != null ? tierFinalAmount(basicTier) : null,
        gold: goldTier != null ? tierFinalAmount(goldTier) : null,
        platinum: platinumTier != null ? tierFinalAmount(platinumTier) : null,
        standard: goldTier != null ? tierFinalAmount(goldTier) : null,
        premium: platinumTier != null ? tierFinalAmount(platinumTier) : null,
      },
      averageRating:
        course.averageRating != null && course.averageRating !== ''
          ? Number(course.averageRating)
          : 0,
      rating:
        course.averageRating != null && course.averageRating !== ''
          ? Number(course.averageRating)
          : 0,
      totalReviews: course.totalReviews || 0,
      enrollmentCount: course.enrollmentCount || 0,
      instructor: {
        name: `${course.instructorId?.firstName || ''} ${course.instructorId?.lastName || ''}`.trim(),
      },
      instructorId: course.instructorId,
    };
  });

  res.json({ success: true, courses: formattedCourses });
};

/** GET /course/:id — Single course details (public). */
const getCourseById = async (req, res) => {
  const course = await Course.findById(req.params.id)
    .select('title subtitle description thumbnail category level currency pricingTiers averageRating totalReviews enrollmentCount instructorId createdAt')
    .populate('instructorId', 'firstName lastName')
    .lean();

  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  const courseContent = await getCourseContent(course._id);
  const displayTiers = normalizePricingTiersForDisplay(course.pricingTiers || []);
  const basicTier = displayTiers.find((t) => t.tier === 'basic');
  const goldTier = displayTiers.find((t) => t.tier === 'gold');
  const platinumTier = displayTiers.find((t) => t.tier === 'platinum');

  res.json({
    success: true,
    course: {
      _id: course._id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      level: course.level,
      currency: course.currency?.toUpperCase(),
      createdAt: course.createdAt,
      pricingTiers: displayTiers,
      price: {
        basic: basicTier != null ? tierFinalAmount(basicTier) : null,
        gold: goldTier != null ? tierFinalAmount(goldTier) : null,
        platinum: platinumTier != null ? tierFinalAmount(platinumTier) : null,
      },
      enrollmentCount: course.enrollmentCount || 0,
      averageRating: course.averageRating || 0,
      totalReviews: course.totalReviews || 0,
      instructorId: course.instructorId,
      courseContent,
      courseRatings: [],
    },
  });
};

/** GET /user/data — Authenticated user profile + enrollments. */
const getUserData = async (req, res) => {
  const user = await User.findById(req.user._id);

  const enrollments = await Enrollment.find({
    userId: req.user._id,
    'purchase.status': 'CAPTURED',
  }).lean();

  // Filter out expired enrollments
  const activeEnrollments = enrollments.filter((e) => !isEnrollmentExpired(e));

  const enrolledCourses = activeEnrollments.map((e) => e.courseId.toString());
  const tierByCourse = {};
  activeEnrollments.forEach((e) => {
    tierByCourse[e.courseId.toString()] = normalizeEnrollmentTier(e.tier);
  });
  const premiumCourses = activeEnrollments
    .filter((e) => canDownloadCourseNotes(e.tier))
    .map((e) => e.courseId.toString());
  const videoAccessCourses = activeEnrollments
    .filter((e) => canViewVideo(e.tier))
    .map((e) => e.courseId.toString());

  res.json({
    success: true,
    user: {
      ...user.toObject(),
      enrolledCourses,
      premiumCourses,
      tierByCourse,
      videoAccessCourses,
    },
  });
};

/** GET /user/enrolled-courses — List user's enrolled courses with content. */
const getEnrolledCourses = async (req, res) => {
  const enrollments = await Enrollment.find({
    userId: req.user._id,
    'purchase.status': 'CAPTURED',
  })
    .populate({
      path: 'courseId',
      select: 'title subtitle thumbnail category level averageRating totalReviews instructorId',
      populate: { path: 'instructorId', select: 'firstName lastName' },
    })
    .lean();

  // Filter out expired enrollments
  const activeEnrollments = enrollments.filter((e) => !isEnrollmentExpired(e));

  const enrolledCourses = await Promise.all(
    activeEnrollments.map(async (enrollment) => {
      const course = enrollment.courseId;
      const content = await getCourseContent(course._id);

      return {
        _id: course._id,
        title: course.title,
        courseTitle: course.title,
        subtitle: course.subtitle,
        thumbnail: course.thumbnail,
        courseThumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        averageRating: course.averageRating || 0,
        totalReviews: course.totalReviews || 0,
        instructorId: course.instructorId,
        courseContent: content,
        purchaseTier: enrollment.tier,
        userRating: enrollment.courseRating || 0,
        feedback: enrollment.feedback || null,
        progress: 0,
        expiresAt: enrollment.expiresAt, // Include enrollment expiration date
      };
    })
  );

  res.json({ success: true, enrolledCourses });
};

/** GET /course/:courseId/free-previews — Public free preview lectures. */
const getFreePreviews = async (req, res) => {
  const { courseId } = req.params;

  const lectures = await Lecture.find({ courseId, isFreePreview: true })
    .populate('videoId')
    .populate('sectionId', 'title')
    .sort({ order: 1 })
    .lean();

  const readyLectures = lectures
    .filter((l) => l.videoId && l.videoId.status === 'READY')
    .map((l) => ({
      lectureId: l._id,
      title: l.title,
      sectionTitle: l.sectionId?.title,
      duration: l.videoId?.duration || 0,
      thumbnailUrl: l.videoId?.thumbnailFileName
        ? `https://${process.env.BUNNY_CDN_HOSTNAME}/${l.videoId.videoGuid}/thumbnail.jpg`
        : null,
      order: l.order,
    }));

  res.json({ success: true, courseId, previews: readyLectures, count: readyLectures.length });
};

/** POST /user/get-course-progress — Get completed lectures for a course. */
const getCourseProgress = async (req, res) => {
  const { courseId } = req.body;
  const userId = String(req.user._id);

  if (!courseId) return res.status(400).json({ success: false, message: 'Course ID is required' });

  const enrollment = await Enrollment.findOne({ userId, courseId, 'purchase.status': 'CAPTURED' });
  if (!enrollment) return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });

  // Check if enrollment is expired
  if (isEnrollmentExpired(enrollment)) {
    return res.status(403).json({ success: false, message: 'Your enrollment has expired. Please renew to access this course.' });
  }

  const progressDoc = await Progress.findOne({ userId, courseId }).select('lectureCompleted').lean();
  let lectureCompleted = (progressDoc?.lectureCompleted || []).map((id) => String(id));

  // Remove any stale completed lecture IDs that no longer exist in the course
  const existingLectures = await Lecture.find({ courseId }).select('_id').lean();
  const existingLectureIds = new Set(existingLectures.map((l) => String(l._id)));
  const filteredCompleted = lectureCompleted.filter((id) => existingLectureIds.has(id));

  if (filteredCompleted.length !== lectureCompleted.length) {
    // Update the progress doc to clean up removed lecture references
    try {
      await Progress.updateOne(
        { userId, courseId },
        { $set: { lectureCompleted: filteredCompleted, lastUpdatedAt: new Date() } }
      );
      lectureCompleted = filteredCompleted;
    } catch (e) {
      // Non-fatal: proceed with filtered list even if cleanup fails
      lectureCompleted = filteredCompleted;
    }
  }

  // Backward compat: use analytics events if dedicated progress doc empty
  if (!lectureCompleted.length) {
    const completedEvents = await AnalyticsEvent.find({
      userId,
      eventType: 'LECTURE_COMPLETED',
      'payload.courseId': courseId,
    }).lean();
    lectureCompleted = [...new Set(completedEvents.map((e) => String(e.payload.lectureId)))];
  }

  res.json({
    success: true,
    progressData: { lectureCompleted, totalCompleted: lectureCompleted.length },
  });
};

module.exports = {
  getAllCourses,
  getCourseById,
  getUserData,
  getEnrolledCourses,
  getFreePreviews,
  getCourseProgress,
};
