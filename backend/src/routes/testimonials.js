const express = require('express');
const router = express.Router();
const { requireAuth, attachUser, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const testimonialCtrl = require('../controllers/testimonialController');

const educator = [requireAuth, attachUser, requireRole('educator', 'admin')];

// Public
router.get('/public', asyncHandler(testimonialCtrl.getPublicTestimonials));

// Educator/Admin
router.get('/', ...educator, asyncHandler(testimonialCtrl.getAllTestimonials));
router.post('/', ...educator, asyncHandler(testimonialCtrl.createTestimonial));
router.put('/reorder', ...educator, asyncHandler(testimonialCtrl.reorderTestimonials));
router.put('/:id', ...educator, asyncHandler(testimonialCtrl.updateTestimonial));
router.delete('/:id', ...educator, asyncHandler(testimonialCtrl.deleteTestimonial));

module.exports = router;
