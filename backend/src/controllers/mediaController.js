const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const crypto = require('crypto');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Video = require('../models/Video');
const Enrollment = require('../models/Enrollment');
const logger = require('../utils/logger');
const { getVideo, mapBunnyStatus, generateSignedThumbnailUrl } = require('../services/bunny');
const { normalizeEnrollmentTier, canViewVideo } = require('../utils/tierAccess');

const TAG = 'MEDIA_CTRL';

/** Helper to check Bunny API directly if a video is not READY, since webhooks fail on localhost. */
const ensureVideoReadyFallback = async (video) => {
  if (video.status === 'READY') return true;
  try {
    const bunnyData = await getVideo(video.videoGuid);
    const apiStatus = mapBunnyStatus(bunnyData.status);
    if (apiStatus === 'READY') {
      video.status = 'READY';
      video.encodeProgress = 100;
      video.duration = bunnyData.length || video.duration;
      await video.save();
      return true;
    }
    return false;
  } catch (err) {
    logger.error(TAG, 'ensureVideoReadyFallback error:', err.message);
    return false;
  }
};

/** POST /cloudinary-signature — Get Cloudinary signature for direct upload. */
const getCloudinarySignature = async (req, res) => {
  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY) {
    return res.status(500).json({ error: 'Cloudinary config missing' });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder: 'lms', timestamp, eager: 'w_400,h_300,c_scale' },
    process.env.CLOUDINARY_API_SECRET.trim()
  );

  res.json({
    cloudName: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    signature,
    timestamp,
    eager: 'w_400,h_300,c_scale',
  });
};

/** POST /upload-thumbnail — Upload course thumbnail to Cloudinary. */
const uploadThumbnail = async (req, res) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'lms/thumbnails',
      resource_type: 'image',
    });

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    return res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    });
  } catch (error) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    logger.error(TAG, 'Thumbnail upload error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to upload thumbnail' });
  }
};

/** DELETE /delete-thumbnail/:publicId — Delete thumbnail from Cloudinary. */
const deleteThumbnail = async (req, res) => {
  try {
    const publicId = req.params.publicId.replace(/_/g, '/');
    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, message: 'Thumbnail deleted successfully' });
  } catch (error) {
    logger.error(TAG, 'Cloudinary delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /bunny/sign — Create video + signed TUS upload URL. */
const signBunnyUpload = async (req, res) => {
  const { title, lectureId, courseId } = req.body;

  if (!title) return res.status(400).json({ error: 'Missing title' });
  if (!lectureId || !courseId) return res.status(400).json({ error: 'Missing lectureId or courseId' });

  if (!process.env.BUNNY_STREAM_API_KEY || !process.env.BUNNY_STREAM_LIBRARY_ID) {
    return res.status(500).json({ error: 'Bunny CDN config missing' });
  }

  const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY.trim();
  const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID.trim();

  // Verify ownership
  const course = await Course.findOne({ _id: courseId, instructorId: req.user._id });
  if (!course) return res.status(403).json({ error: 'Unauthorized' });

  const lecture = await Lecture.findOne({ _id: lectureId, courseId });
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

  // Create video in Bunny CDN
  const response = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', AccessKey: BUNNY_API_KEY },
    body: JSON.stringify({ title: lecture.title }),
  });

  const videoData = await response.json();

  const video = await Video.create({
    courseId,
    instructorId: req.user._id,
    title: videoData.title,
    videoGuid: videoData.guid,
    videoLibraryId: videoData.videoLibraryId,
    thumbnailFileName: videoData.thumbnailFileName,
    collectionId: videoData.collectionId || '',
    duration: videoData.length || 0,
    status: 'QUEUED',
    bunnyStatus: videoData.status,
    uploadedAt: new Date(),
  });

  lecture.videoId = video._id;
  await lecture.save();
  await video.markAsUsed();

  const expirationTime = Math.floor(Date.now() / 1000) + 86400;
  const signature = crypto
    .createHash('sha256')
    .update(`${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${videoData.guid}`)
    .digest('hex');

  res.json({
    videoId: videoData.guid,
    videoDbId: video._id,
    libraryId: BUNNY_LIBRARY_ID,
    expirationTime,
    signature,
  });
};

/** POST /bunny-video — Create video in Bunny Stream with TUS upload URL. */
const createBunnyVideo = async (req, res) => {
  const { createVideo } = require('../services/bunny');
  const { lectureId, courseId } = req.body;

  if (!lectureId || !courseId) return res.status(400).json({ error: 'Missing lectureId or courseId' });

  const [lecture, course] = await Promise.all([
    Lecture.findOne({ _id: lectureId, courseId }),
    Course.findOne({ _id: courseId, instructorId: req.user._id }),
  ]);

  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
  if (!course) return res.status(403).json({ error: 'Unauthorized' });

  const videoData = await createVideo(lecture.title || 'Untitled Video');

  const video = await Video.create({
    courseId,
    instructorId: req.user._id,
    title: videoData.title,
    videoGuid: videoData.guid,
    videoLibraryId: videoData.videoLibraryId,
    thumbnailFileName: videoData.thumbnailFileName,
    collectionId: videoData.collectionId || '',
    hasMP4Fallback: videoData.hasMP4Fallback || false,
    duration: videoData.length || 0,
    status: 'QUEUED',
    bunnyStatus: videoData.status,
    views: videoData.views || 0,
    storageSize: videoData.storageSize || 0,
    encodeProgress: videoData.encodeProgress || 0,
    uploadedAt: new Date(),
  });

  lecture.videoId = video._id;
  await lecture.save();
  await video.markAsUsed();

  const uploadUrl = `https://video.bunnycdn.com/tusupload?libraryId=${videoData.videoLibraryId}&videoId=${videoData.guid}&expirationTime=${Math.floor(Date.now() / 1000) + 3600}`;

  res.json({
    success: true,
    message: 'Bunny video created successfully',
    video,
    videoGuid: videoData.guid,
    uploadUrl,
    videoLibraryId: videoData.videoLibraryId,
  });
};

/** GET /playback-url/preview/:lectureId — Public preview playback URL. */
const getPreviewPlaybackUrl = async (req, res) => {
  const { generateSignedUrl, generateSignedIframeUrl, getThumbnailUrl } = require('../services/bunny');
  const lecture = await Lecture.findById(req.params.lectureId).populate('videoId');

  if (!lecture) return res.status(404).json({ success: false, error: 'Lecture not found' });
  if (!lecture.isFreePreview) return res.status(403).json({ success: false, error: 'This lecture is not available as a free preview' });
  if (!lecture.videoId) return res.status(400).json({ success: false, error: 'No video associated with this lecture' });
  
  const isVideoReady = await ensureVideoReadyFallback(lecture.videoId);
  if (!isVideoReady) return res.status(400).json({ success: false, error: 'Video is not ready for playback', status: lecture.videoId.status });

  const playbackUrl = generateSignedUrl(lecture.videoId.videoGuid, 1800);
  const embedUrl = generateSignedIframeUrl(lecture.videoId.videoLibraryId, lecture.videoId.videoGuid, 1800);

  res.json({
    success: true,
    playbackUrl,
    embedUrl,
    thumbnailUrl: getThumbnailUrl ? generateSignedThumbnailUrl(lecture.videoId.videoGuid) : null,
    videoGuid: lecture.videoId.videoGuid,
    duration: lecture.videoId.duration,
    expiresIn: 1800,
    isFreePreview: true,
  });
};

/** GET /playback-url/:lectureId — Authenticated playback URL. */
const getPlaybackUrl = async (req, res) => {
  const { generateSignedUrl, getThumbnailUrl } = require('../services/bunny');
  const lecture = await Lecture.findById(req.params.lectureId).populate('videoId');

  if (!lecture) return res.status(404).json({ success: false, error: 'Lecture not found' });

  // Check access: educator owns course OR student is enrolled
  const isOwner = await Course.exists({ _id: lecture.courseId, instructorId: req.user._id });

  if (!isOwner) {
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: lecture.courseId,
      'purchase.status': 'CAPTURED',
    });
    if (!enrollment) return res.status(403).json({ success: false, error: 'Access denied. You must be enrolled in this course.' });
    if (enrollment.expiresAt && new Date() > enrollment.expiresAt) {
      return res.status(403).json({ success: false, error: 'Your enrollment has expired' });
    }
    const tier = normalizeEnrollmentTier(enrollment.tier);
    if (!canViewVideo(tier)) {
      return res.status(403).json({
        success: false,
        error: 'Your Basic plan includes notes only. Upgrade to Gold or Platinum to watch videos.',
        code: 'TIER_VIDEO_BLOCKED',
      });
    }
  }

  if (!lecture.videoId) return res.status(400).json({ success: false, error: 'No video associated with this lecture' });
  
  const isVideoReady = await ensureVideoReadyFallback(lecture.videoId);
  if (!isVideoReady) return res.status(400).json({ success: false, error: 'Video is not ready for playback', status: lecture.videoId.status });

  const playbackUrl = generateSignedUrl(lecture.videoId.videoGuid, 7200);
  const embedUrl = generateSignedIframeUrl(lecture.videoId.videoLibraryId, lecture.videoId.videoGuid, 7200);
  const thumbnailUrl = getThumbnailUrl(lecture.videoId.videoGuid);

  res.json({
    success: true,
    playbackUrl,
    embedUrl,
    thumbnailUrl,
    videoGuid: lecture.videoId.videoGuid,
    duration: lecture.videoId.duration,
    expiresIn: 7200,
    isFreePreview: false,
  });
};

/** GET /video/:lectureId/preview — Educator preview iframe URL. */
const getEducatorVideoPreview = async (req, res) => {
  const { generateSignedIframeUrl, generateSignedThumbnailUrl } = require('../services/bunny');
  const lecture = await Lecture.findById(req.params.lectureId).populate('videoId');

  if (!lecture) return res.status(404).json({ success: false, error: 'Lecture not found' });
  if (!lecture.videoId) return res.status(404).json({ success: false, error: 'Video not available' });

  const video = lecture.videoId;
  const course = await Course.findById(lecture.courseId);
  if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
  if (course.instructorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized to preview this video' });
  }

  await ensureVideoReadyFallback(video);

  const iframeUrl = generateSignedIframeUrl(video.videoLibraryId, video.videoGuid, 7200);
  const thumbnailUrl = generateSignedThumbnailUrl(video.videoGuid, video.thumbnailFileName || 'thumbnail.jpg', 7200);

  res.json({ success: true, iframeUrl, thumbnailUrl, videoGuid: video.videoGuid, status: video.status });
};

module.exports = {
  getCloudinarySignature,
  uploadThumbnail,
  deleteThumbnail,
  signBunnyUpload,
  createBunnyVideo,
  getPreviewPlaybackUrl,
  getPlaybackUrl,
  getEducatorVideoPreview,
};
