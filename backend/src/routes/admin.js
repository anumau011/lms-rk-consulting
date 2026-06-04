const express = require('express');
const router = express.Router();
const { requireAuth, attachUser, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const adminCtrl = require('../controllers/adminController');

const adminGuard = [requireAuth, attachUser, requireRole('admin')];

router.post('/promote', ...adminGuard, asyncHandler(adminCtrl.promoteUser));
router.get('/users', ...adminGuard, asyncHandler(adminCtrl.listUsers));

module.exports = router;
