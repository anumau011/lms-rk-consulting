const express = require('express');
const router = express.Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Controllers
const studentCtrl = require('../controllers/studentController');
const enrollmentCtrl = require('../controllers/enrollmentController');
const feedbackCtrl = require('../controllers/feedbackController');
const videoCtrl = require('../controllers/videoController');
const noteCtrl = require('../controllers/noteController');
const userCtrl = require('../controllers/userController');

// ── Public Routes ───────────────────────────────────────────────────────────

router.get('/course/all', asyncHandler(studentCtrl.getAllCourses));
router.get('/course/topcourses', asyncHandler(studentCtrl.getTopCourses));
router.get('/course/:id', asyncHandler(studentCtrl.getCourseById));
router.get('/course/:courseId/free-previews', asyncHandler(studentCtrl.getFreePreviews));
router.get('/course/:courseId/feedback', asyncHandler(feedbackCtrl.getCourseFeedback));

// ── Authenticated Routes ────────────────────────────────────────────────────

router.get('/user/data', requireAuth, attachUser, asyncHandler(studentCtrl.getUserData));
router.get('/user/enrolled-courses', requireAuth, attachUser, asyncHandler(studentCtrl.getEnrolledCourses));
router.post('/user/get-course-progress', requireAuth, attachUser, asyncHandler(studentCtrl.getCourseProgress));
router.post('/user/complete-profile', requireAuth, attachUser, asyncHandler(userCtrl.completeProfile));

// ── Ratings & Feedback ──────────────────────────────────────────────────────

router.post('/user/add-rating', requireAuth, attachUser, asyncHandler(feedbackCtrl.addRating));
router.post('/user/add-feedback', requireAuth, attachUser, asyncHandler(feedbackCtrl.addFeedback));

// ── Purchase & Enrollment ───────────────────────────────────────────────────

router.post('/user/purchase', requireAuth, attachUser, asyncHandler(enrollmentCtrl.purchaseCourse));
router.post('/user/upgrade', requireAuth, attachUser, asyncHandler(enrollmentCtrl.upgradeToPremium));
router.post('/user/verify-payment', requireAuth, attachUser, asyncHandler(enrollmentCtrl.verifyPayment));

// ── Video Playback & Downloads ──────────────────────────────────────────────

router.get('/video/:lectureId/signed-thumbnail-url', requireAuth, attachUser, asyncHandler(videoCtrl.getSignedThumbnailUrl));
router.get('/video/:lectureId/signed-video-url', requireAuth, attachUser, asyncHandler(videoCtrl.getSignedVideoUrl));

// ── Student Notes ───────────────────────────────────────────────────────────

router.get('/notes/lecture/:lectureId', requireAuth, attachUser, asyncHandler(noteCtrl.getNotesForLecture));
router.get('/notes/course/:courseId', requireAuth, attachUser, asyncHandler(noteCtrl.getNotesForCourse));
router.get('/notes/:noteId', requireAuth, attachUser, asyncHandler(noteCtrl.getNoteSignedUrl));
router.get('/notes/:noteId/file-url', requireAuth, attachUser, asyncHandler(noteCtrl.getNoteSignedUrl));
router.post('/notes', requireAuth, attachUser, asyncHandler(noteCtrl.createNote));
router.put('/notes/:noteId', requireAuth, attachUser, asyncHandler(noteCtrl.updateNote));
router.delete('/notes/:noteId', requireAuth, attachUser, asyncHandler(noteCtrl.deleteNote));

module.exports = router;
