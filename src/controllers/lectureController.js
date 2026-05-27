const Lecture = require('../models/Lecture');
const Section = require('../models/Section');
const Note = require('../models/Note');
const { cleanupLectureAssets } = require('../utils/lectureCleanup');

/** POST /:courseId/sections/:sectionId/lectures — Create a new lecture. */
const createLecture = async (req, res) => {
  const { title, lectureType, description } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Lecture title is required' });
  }

  const order = await Lecture.getNextOrder(req.params.sectionId);

  const lecture = await Lecture.create({
    courseId: req.params.courseId,
    sectionId: req.params.sectionId,
    title: title.trim(),
    description: description?.trim(),
    lectureType: lectureType || 'VIDEO',
    order,
    status: 'DRAFT',
  });

  res.status(201).json({ success: true, message: 'Lecture created successfully', lecture });
};

/** GET /:courseId/sections/:sectionId/lectures — List lectures with notes. */
const getLectures = async (req, res) => {
  const lectures = await Lecture.find({ sectionId: req.params.sectionId })
    .populate('videoId')
    .sort({ order: 1 });

  const lectureIds = lectures.map((l) => l._id);
  const notes = await Note.find({ lectureId: { $in: lectureIds } })
    .sort({ createdAt: -1 })
    .lean();

  const notesByLectureId = notes.reduce((acc, note) => {
    const key = note.lectureId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  const lecturesWithNotes = lectures.map((lecture) => {
    const obj = lecture.toObject();
    obj.notes = notesByLectureId[lecture._id.toString()] || [];
    return obj;
  });

  res.json({ success: true, lectures: lecturesWithNotes });
};

/** GET /:courseId/curriculum — Full curriculum (sections + lectures + notes). */
const getCurriculum = async (req, res) => {
  const courseId = req.params.courseId;

  const [sections, lectures] = await Promise.all([
    Section.find({ courseId }).sort({ order: 1 }).lean(),
    Lecture.find({ courseId }).populate('videoId').sort({ order: 1 }).lean(),
  ]);

  const lectureIds = lectures.map((l) => l._id);
  const notes = await Note.find({ lectureId: { $in: lectureIds } })
    .sort({ createdAt: -1 })
    .lean();

  const notesByLectureId = notes.reduce((acc, note) => {
    const key = note.lectureId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  const lecturesWithNotes = lectures.map((l) => ({
    ...l,
    notes: notesByLectureId[l._id.toString()] || [],
  }));

  const curriculum = sections.map((section) => ({
    ...section,
    lectures: lecturesWithNotes.filter(
      (l) => l.sectionId.toString() === section._id.toString()
    ),
  }));

  res.json({ success: true, curriculum });
};

/** PATCH /:courseId/lectures/:lectureId — Update lecture fields. */
const updateLecture = async (req, res) => {
  const { _id: videoId, videoTitle, isFreePreview } = req.body;

  const lecture = await Lecture.findOne({
    _id: req.params.lectureId,
    courseId: req.params.courseId,
  });

  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

  if (isFreePreview !== undefined) lecture.isFreePreview = isFreePreview;
  if (videoTitle !== undefined) lecture.title = videoTitle;
  if (videoId !== undefined) lecture.videoId = videoId;

  await lecture.save();
  res.json({ success: true, message: 'Lecture updated successfully', lecture });
};

/** DELETE /:courseId/lectures/:lectureId — Delete a lecture. */
const deleteLecture = async (req, res) => {
  const lecture = await Lecture.findOne({
    _id: req.params.lectureId,
    courseId: req.params.courseId,
  });

  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

  await cleanupLectureAssets(lecture);
  await Lecture.deleteOne({ _id: lecture._id });
  res.json({ success: true, message: 'Lecture deleted successfully' });
};

/** PUT /:courseId/sections/:sectionId/lectures/reorder — Drag-and-drop. */
const reorderLectures = async (req, res) => {
  const { lectureOrders } = req.body;
  if (!Array.isArray(lectureOrders)) {
    return res.status(400).json({ error: 'lectureOrders must be an array' });
  }
  await Lecture.reorderLectures(req.params.sectionId, lectureOrders);
  res.json({ success: true, message: 'Lectures reordered successfully' });
};

/** PATCH /:courseId/curriculum/complete — Mark curriculum step as complete. */
const completeCurriculum = async (req, res) => {
  req.course.completedSteps.step2 = true;
  await req.course.save();
  res.json({ success: true, message: 'Curriculum step marked as complete', course: req.course });
};

module.exports = {
  createLecture,
  getLectures,
  getCurriculum,
  updateLecture,
  deleteLecture,
  reorderLectures,
  completeCurriculum,
};
