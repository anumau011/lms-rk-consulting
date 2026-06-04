const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, attachUser, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const Course = require('../models/Course');

// Controllers
const courseCtrl = require('../controllers/courseController');
const sectionCtrl = require('../controllers/sectionController');
const lectureCtrl = require('../controllers/lectureController');
const noteCtrl = require('../controllers/noteController');

const notesUpload = multer({ dest: 'uploads/' });

// ── Middleware: Course Ownership ─────────────────────────────────────────────

const isCourseOwner = async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.instructorId !== req.user._id) return res.status(403).json({ error: 'Access denied' });
  req.course = course;
  next();
};

// Shorthand: auth + role + ownership
const educatorOwner = [requireAuth, attachUser, requireRole('educator', 'admin'), isCourseOwner];
const educator = [requireAuth, attachUser, requireRole('educator', 'admin')];

// ── Course CRUD ─────────────────────────────────────────────────────────────

router.post('/', ...educator, asyncHandler(courseCtrl.createCourse));
router.get('/instructor', ...educator, asyncHandler(courseCtrl.getInstructorCourses));
router.get('/:courseId', ...educatorOwner, asyncHandler(courseCtrl.getCourseById));
router.patch('/:courseId/basic-info', ...educatorOwner, asyncHandler(courseCtrl.updateBasicInfo));
router.patch('/:courseId/details', ...educatorOwner, asyncHandler(courseCtrl.updateDetails));
router.patch('/:courseId/pricing', ...educatorOwner, asyncHandler(courseCtrl.updatePricing));
router.post('/:courseId/publish', ...educatorOwner, asyncHandler(courseCtrl.publishCourse));
router.post('/:courseId/unpublish', ...educatorOwner, asyncHandler(courseCtrl.unpublishCourse));
router.delete('/:courseId', ...educatorOwner, asyncHandler(courseCtrl.archiveCourse));

// ── Sections ────────────────────────────────────────────────────────────────

router.post('/:courseId/sections', ...educatorOwner, asyncHandler(sectionCtrl.createSection));
router.get('/:courseId/sections', ...educatorOwner, asyncHandler(sectionCtrl.getSections));
router.patch('/:courseId/sections/:sectionId', ...educatorOwner, asyncHandler(sectionCtrl.updateSection));
router.delete('/:courseId/sections/:sectionId', ...educatorOwner, asyncHandler(sectionCtrl.deleteSection));
router.put('/:courseId/sections/reorder', ...educatorOwner, asyncHandler(sectionCtrl.reorderSections));

// ── Lectures ────────────────────────────────────────────────────────────────

router.post('/:courseId/sections/:sectionId/lectures', ...educatorOwner, asyncHandler(lectureCtrl.createLecture));
router.get('/:courseId/sections/:sectionId/lectures', ...educatorOwner, asyncHandler(lectureCtrl.getLectures));
router.get('/:courseId/curriculum', ...educatorOwner, asyncHandler(lectureCtrl.getCurriculum));
router.patch('/:courseId/lectures/:lectureId', ...educatorOwner, asyncHandler(lectureCtrl.updateLecture));
router.delete('/:courseId/lectures/:lectureId', ...educatorOwner, asyncHandler(lectureCtrl.deleteLecture));
router.put('/:courseId/sections/:sectionId/lectures/reorder', ...educatorOwner, asyncHandler(lectureCtrl.reorderLectures));
router.patch('/:courseId/curriculum/complete', ...educatorOwner, asyncHandler(lectureCtrl.completeCurriculum));

// ── Notes (Educator) ────────────────────────────────────────────────────────

router.post('/:courseId/lectures/:lectureId/notes', ...educatorOwner, asyncHandler(noteCtrl.addNoteToLecture));
router.post('/:courseId/lectures/:lectureId/notes/upload', ...educatorOwner, notesUpload.single('file'), asyncHandler(noteCtrl.uploadNoteToCourse));
router.get('/:courseId/lectures/:lectureId/notes', ...educatorOwner, asyncHandler(noteCtrl.getNotesForLectureCourse));
router.get('/:courseId/lectures/:lectureId/notes/:noteId/file', ...educatorOwner, asyncHandler(noteCtrl.getNoteFile));
router.delete('/:courseId/lectures/:lectureId/notes/:noteId', ...educatorOwner, asyncHandler(noteCtrl.deleteNoteFromLecture));

module.exports = router;