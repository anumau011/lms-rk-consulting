const crypto = require('crypto');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const { normalizeEnrollmentTier, canViewVideo, isEnrollmentExpired } = require('../utils/tierAccess');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Enrolled, owner, admin, or free preview — no tier check (e.g. thumbnails). */
async function assertEnrolledOrPreview(req, lecture) {
  const userId = req.user._id;

  const isOwner = await Course.exists({ _id: lecture.courseId, instructorId: String(userId) });
  if (isOwner) return;

  if (lecture.isFreePreview) return;
  if (req.user.role === 'admin') return;

  const enrollment = await Enrollment.findOne({
    userId,
    courseId: lecture.courseId,
    'purchase.status': 'CAPTURED',
  });

  if (!enrollment) {
    const err = new Error('You are not enrolled in this course');
    err.statusCode = 403;
    throw err;
  }

  // Check if enrollment is expired
  if (isEnrollmentExpired(enrollment)) {
    const err = new Error('Your enrollment has expired. Please renew to access this course.');
    err.statusCode = 403;
    throw err;
  }
}

/** Requires GOLD or PLATINUM (or legacy STANDARD/PREMIUM mapped) for full lecture video. */
async function assertVideoPlaybackAccess(req, lecture) {
  const userId = req.user._id;

  const isOwner = await Course.exists({ _id: lecture.courseId, instructorId: String(userId) });
  if (isOwner) return;

  if (lecture.isFreePreview) return;
  if (req.user.role === 'admin') return;

  const enrollment = await Enrollment.findOne({
    userId,
    courseId: lecture.courseId,
    'purchase.status': 'CAPTURED',
  });

  if (!enrollment) {
    const err = new Error('You are not enrolled in this course');
    err.statusCode = 403;
    throw err;
  }

  // Check if enrollment is expired
  if (isEnrollmentExpired(enrollment)) {
    const err = new Error('Your enrollment has expired. Please renew to access this course.');
    err.statusCode = 403;
    throw err;
  }

  const tier = normalizeEnrollmentTier(enrollment.tier);
  if (!canViewVideo(tier)) {
    const err = new Error(
      'Your Basic plan includes notes only. Upgrade to Gold or Platinum to watch videos.'
    );
    err.statusCode = 403;
    throw err;
  }
}

// ── Controllers ─────────────────────────────────────────────────────────────

/** GET /video/:lectureId/signed-thumbnail-url */
const getSignedThumbnailUrl = async (req, res) => {
  const lecture = await Lecture.findById(req.params.lectureId).populate('videoId');
  if (!lecture) return res.status(404).json({ success: false, error: 'Lecture not found' });
  if (!lecture.videoId?.videoGuid) return res.status(404).json({ success: false, error: 'Video not available' });

  await assertEnrolledOrPreview(req, lecture);

  const securityKey = process.env.BUNNY_STREAM_SECRET_KEY;
  const path = `/${lecture.videoId.videoGuid}/${lecture.videoId.thumbnailFileName || 'thumbnail.jpg'}`;
  const expires = Math.round(Date.now() / 1000) + 3600;
  const hashableBase = securityKey + path + expires;

  let token = crypto.createHash('md5').update(hashableBase).digest('base64');
  token = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const url = `https://${process.env.BUNNY_CDN_HOST}${path}?token=${token}&expires=${expires}`;
  res.json({ success: true, thumbnailUrl: url });
};

/** GET /video/:lectureId/signed-video-url */
const getSignedVideoUrl = async (req, res) => {
  const lecture = await Lecture.findById(req.params.lectureId).populate('videoId');
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
  if (!lecture.videoId?.videoGuid) return res.status(404).json({ error: 'Video not available' });

  await assertVideoPlaybackAccess(req, lecture);

  const securityKey = process.env.BUNNY_STREAM_SECRET_KEY;
  const videoId = lecture.videoId.videoGuid;
  const expiration = Math.floor(Date.now() / 1000) + 3600;
  const token = crypto.createHash('sha256').update(securityKey + videoId + expiration).digest('hex');

  const url = `https://player.mediadelivery.net/embed/${lecture.videoId.videoLibraryId}/${videoId}?token=${token}&expires=${expiration}`;
  res.json({ success: true, playbackUrl: url });
};

module.exports = {
  getSignedThumbnailUrl,
  getSignedVideoUrl,
};
