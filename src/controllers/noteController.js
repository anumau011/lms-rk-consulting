const fs = require('fs');
const axios = require('axios');
const Note = require('../models/Note');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const { getNoteTypeFromMime } = require('../utils/fileHelpers');
const { generateSignedStorageFileUrl } = require('../services/bunny');
const { canDownloadCourseNotes, isEnrollmentExpired } = require('../utils/tierAccess');
const logger = require('../utils/logger');

const TAG = 'NOTE_CTRL';

// ── Helpers ─────────────────────────────────────────────────────────────────

const findEnrollment = (userId, courseId) =>
  Enrollment.findOne({ userId, courseId, 'purchase.status': 'CAPTURED' });

// ── Student-Facing Endpoints ────────────────────────────────────────────────

/** GET /notes/lecture/:lectureId — Get notes for a specific lecture. */
const getNotesForLecture = async (req, res) => {
  const { lectureId } = req.params;
  const userId = req.user._id;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

  const enrollment = await findEnrollment(userId, lecture.courseId);
  if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

  // Check if enrollment is expired
  if (isEnrollmentExpired(enrollment)) {
    return res.status(403).json({ error: 'Your enrollment has expired. Please renew to access this course.' });
  }

  const notes = await Note.find({ lectureId }).sort({ timestamp: 1 });
  res.json({ success: true, notes });
};

/** GET /notes/course/:courseId — Get all notes for a course. */
const getNotesForCourse = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;

  const enrollment = await findEnrollment(userId, courseId);
  if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

  // Check if enrollment is expired
  if (isEnrollmentExpired(enrollment)) {
    return res.status(403).json({ error: 'Your enrollment has expired. Please renew to access this course.' });
  }

  const notes = await Note.find({ courseId })
    .populate('lectureId', 'title')
    .sort({ createdAt: -1 });
  res.json({ success: true, notes });
};

/** POST /notes — Create a note. */
const createNote = async (req, res) => {
  const { lectureId, content, timestamp } = req.body;
  const userId = req.user._id;

  if (!lectureId || !content) {
    return res.status(400).json({ error: 'Lecture ID and content are required' });
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

  const enrollment = await Enrollment.findOne({
    userId,
    courseId: lecture.courseId,
    'purchase.status': 'CAPTURED',
  });
  if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

  const note = await Note.create({
    userId,
    courseId: lecture.courseId,
    lectureId,
    content,
    timestamp: timestamp || 0,
  });

  res.status(201).json({ success: true, note });
};

/** PUT /notes/:noteId — Update a note. */
const updateNote = async (req, res) => {
  const { content, timestamp } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const note = await Note.findOne({ _id: req.params.noteId, userId: req.user._id });
  if (!note) return res.status(404).json({ error: 'Note not found' });

  note.content = content;
  if (timestamp !== undefined) note.timestamp = timestamp;
  await note.save();

  res.json({ success: true, note });
};

/** DELETE /notes/:noteId — Delete a note. */
const deleteNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.noteId, userId: req.user._id });
  if (!note) return res.status(404).json({ error: 'Note not found' });

  await note.deleteOne();
  res.json({ success: true, message: 'Note deleted successfully' });
};

/** GET /notes/:noteId/file-url — Get signed URL for a note file. */
const getNoteSignedUrl = async (req, res) => {
  const note = await Note.findById(req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const enrollment = await findEnrollment(req.user._id, note.courseId);
  if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

  // Check if enrollment is expired
  if (isEnrollmentExpired(enrollment)) {
    return res.status(403).json({ error: 'Your enrollment has expired. Please renew to access this course.' });
  }

  // download=1 is restricted to Premium/Platinum; view-only is allowed for enrolled tiers.
  const wantsDownload = req.query.download === '1';
  if (wantsDownload && !canDownloadCourseNotes(enrollment.tier)) {
    return res.status(403).json({
      error: 'Platinum plan required to download course materials. Gold and Basic include view-only access.',
      code: 'TIER_NOTE_DOWNLOAD_BLOCKED',
    });
  }

  const fileUrl = generateSignedStorageFileUrl(note.path, 3600);
  res.json({ success: true, fileUrl, viewOnly: !wantsDownload });
};

// ── Educator-Facing Endpoints ───────────────────────────────────────────────

/** POST (educator) — Add note metadata to a lecture. */
const addNoteToLecture = async (req, res) => {
  const { title, path, size, mimeType } = req.body;
  const { courseId, lectureId } = req.params;

  const lecture = await Lecture.findOne({ _id: lectureId, courseId });
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
  if (!title || !path) return res.status(400).json({ error: 'title and path are required' });

  const note = await Note.create({
    name: title,
    path,
    size: Number(size) || 0,
    mimeType: mimeType || '',
    type: getNoteTypeFromMime(mimeType),
    courseId,
    lectureId,
    userId: String(req.user._id),
  });

  res.json({ success: true, message: 'Note added successfully', note });
};

/** POST (educator) — Upload a note file to Bunny storage. */
const uploadNoteFile = async (req, res) => {
  const file = req.file;
  try {
    const { courseId, lectureId } = req.body;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!courseId || !lectureId) return res.status(400).json({ error: 'Missing courseId or lectureId' });

    const fileName = `${Date.now()}-${file.originalname}`;
    const url = `https://${process.env.BUNNY_STORAGE_ZONE}/${process.env.BUNNY_STORAGE_ZONE_NAME}/${courseId}/${lectureId}/${fileName}`;

    await axios.put(url, fs.createReadStream(file.path), {
      headers: { AccessKey: process.env.BUNNY_STORAGE_PASSWORD.trim(), 'Content-Type': file.mimetype },
      maxBodyLength: Infinity,
    });

    const notePath = `/${courseId}/${lectureId}/${fileName}`;
    const note = await Note.create({
      name: file.originalname,
      path: notePath,
      type: getNoteTypeFromMime(file.mimetype),
      courseId,
      lectureId,
      userId: String(req.user._id),
    });

    fs.unlinkSync(file.path);

    logger.info(TAG, 'Note uploaded', {
      noteId: note._id,
      courseId,
      lectureId,
      fileName: file.originalname,
    });

    res.json({ success: true, message: 'Uploaded and saved successfully', note });
  } catch (err) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    logger.error(TAG, 'Upload failed', err.message);
    res.status(500).json({ success: false, error: 'Upload failed', details: err.message });
  }
};

/** POST (educator) — Upload note to course lecture via course route. */
const uploadNoteToCourse = async (req, res) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const { courseId, lectureId } = req.params;
    const lecture = await Lecture.findOne({ _id: lectureId, courseId });

    if (!lecture) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `/${courseId}/${lectureId}/${fileName}`;
    const uploadUrl = `https://${process.env.BUNNY_STORAGE_ZONE}/${process.env.BUNNY_STORAGE_ZONE_NAME}${filePath}`;

    await axios.put(uploadUrl, fs.createReadStream(file.path), {
      headers: { AccessKey: process.env.BUNNY_STORAGE_PASSWORD.trim(), 'Content-Type': file.mimetype },
      maxBodyLength: Infinity,
    });

    const note = await Note.create({
      name: file.originalname,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
      type: getNoteTypeFromMime(file.mimetype),
      courseId,
      lectureId,
      userId: String(req.user._id),
    });

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    res.status(201).json({ success: true, message: 'Note uploaded successfully', note });
  } catch (error) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    logger.error(TAG, 'Course note upload failed', error.message);
    res.status(500).json({ error: error.message || 'Failed to upload note' });
  }
};

/** GET (educator) — List notes for a lecture in course context. */
const getNotesForLectureCourse = async (req, res) => {
  const notes = await Note.find({
    courseId: req.params.courseId,
    lectureId: req.params.lectureId,
  }).sort({ createdAt: -1 });
  res.json({ success: true, notes });
};

/** GET (educator) — Stream a note file for preview/download. */
const getNoteFile = async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.noteId,
    courseId: req.params.courseId,
    lectureId: req.params.lectureId,
  });

  if (!note) return res.status(404).json({ error: 'Note not found' });

  const fileUrl = `https://${process.env.BUNNY_STORAGE_ZONE}/${process.env.BUNNY_STORAGE_ZONE_NAME}${note.path}`;
  const response = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    headers: { AccessKey: process.env.BUNNY_STORAGE_PASSWORD.trim() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const contentType = note.mimeType || response.headers['content-type'] || 'application/octet-stream';
  const dispositionType = req.query.download === '1' ? 'attachment' : 'inline';
  const safeName = String(note.name || 'note-file').replace(/"/g, '');

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeName}"`);
  return res.send(response.data);
};

/** DELETE (educator) — Delete a note from DB and storage. */
const deleteNoteFromLecture = async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.noteId,
    courseId: req.params.courseId,
    lectureId: req.params.lectureId,
  });

  if (!note) return res.status(404).json({ error: 'Note not found' });

  try {
    const deleteUrl = `https://${process.env.BUNNY_STORAGE_ZONE}/${process.env.BUNNY_STORAGE_ZONE_NAME}${note.path}`;
    await axios.delete(deleteUrl, {
      headers: { AccessKey: process.env.BUNNY_STORAGE_PASSWORD.trim() },
    });
  } catch (deleteError) {
    logger.warn(TAG, 'Storage delete warning:', deleteError.message);
  }

  await Note.deleteOne({ _id: note._id });
  res.json({ success: true, message: 'Note deleted successfully' });
};

module.exports = {
  // Student
  getNotesForLecture,
  getNotesForCourse,
  createNote,
  updateNote,
  deleteNote,
  getNoteSignedUrl,
  // Educator
  addNoteToLecture,
  uploadNoteFile,
  uploadNoteToCourse,
  getNotesForLectureCourse,
  getNoteFile,
  deleteNoteFromLecture,
};
