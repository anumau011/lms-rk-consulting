const express = require('express');
const router = express.Router();
const { requireAuth, attachUser, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const educatorCtrl = require('../controllers/educatorController');

const educator = [requireAuth, attachUser, requireRole('educator', 'admin')];

// Public
router.get('/public', asyncHandler(educatorCtrl.getPublicEducators));

// Educator/Admin
router.get('/', ...educator, asyncHandler(educatorCtrl.getAllEducators));
router.post('/', ...educator, asyncHandler(educatorCtrl.createEducator));
router.put('/reorder', ...educator, asyncHandler(educatorCtrl.reorderEducators));
router.put('/:id', ...educator, asyncHandler(educatorCtrl.updateEducator));
router.delete('/:id', ...educator, asyncHandler(educatorCtrl.deleteEducator));

module.exports = router;
