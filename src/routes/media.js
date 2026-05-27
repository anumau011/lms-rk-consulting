const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, attachUser, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const mediaCtrl = require('../controllers/mediaController');
const noteCtrl = require('../controllers/noteController');

const thumbnailUpload = multer({ dest: 'uploads/' });
const noteUpload = multer({ dest: 'uploads/' });

// Shorthand
const educator = [requireAuth, attachUser, requireRole('educator', 'admin')];

// ── Cloudinary ──────────────────────────────────────────────────────────────

router.post('/cloudinary-signature', ...educator, asyncHandler(mediaCtrl.getCloudinarySignature));
router.post('/upload-thumbnail', ...educator, thumbnailUpload.single('thumbnail'), asyncHandler(mediaCtrl.uploadThumbnail));
router.delete('/delete-thumbnail/:publicId', ...educator, asyncHandler(mediaCtrl.deleteThumbnail));

// ── Bunny Video ─────────────────────────────────────────────────────────────

router.post('/bunny/sign', ...educator, asyncHandler(mediaCtrl.signBunnyUpload));
router.post('/bunny-video', ...educator, asyncHandler(mediaCtrl.createBunnyVideo));

// ── Playback URLs ───────────────────────────────────────────────────────────

router.get('/playback-url/preview/:lectureId', asyncHandler(mediaCtrl.getPreviewPlaybackUrl));
router.get('/playback-url/:lectureId', requireAuth, attachUser, asyncHandler(mediaCtrl.getPlaybackUrl));
router.get('/video/:lectureId/preview', ...educator, asyncHandler(mediaCtrl.getEducatorVideoPreview));

// ── Notes Upload (Media) ────────────────────────────────────────────────────

router.post('/notes/upload', ...educator, noteUpload.single('file'), asyncHandler(noteCtrl.uploadNoteFile));

module.exports = router;
