const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const { cleanupLectureAssets } = require('../utils/lectureCleanup');

/** POST /:courseId/sections — Create a new section. */
const createSection = async (req, res) => {
  const { title, description } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Section title is required' });
  }

  const order = await Section.getNextOrder(req.params.courseId);

  const section = await Section.create({
    courseId: req.params.courseId,
    title: title.trim(),
    description: description?.trim(),
    order,
  });

  res.status(201).json({ success: true, message: 'Section created successfully', section });
};

/** GET /:courseId/sections — List all sections for a course. */
const getSections = async (req, res) => {
  const sections = await Section.find({ courseId: req.params.courseId }).sort({ order: 1 });
  res.json({ success: true, sections });
};

/** PATCH /:courseId/sections/:sectionId — Update a section. */
const updateSection = async (req, res) => {
  const { title, description } = req.body;

  const section = await Section.findOne({
    _id: req.params.sectionId,
    courseId: req.params.courseId,
  });

  if (!section) return res.status(404).json({ error: 'Section not found' });

  if (title) section.title = title.trim();
  if (description !== undefined) section.description = description?.trim();
  await section.save();

  res.json({ success: true, message: 'Section updated successfully', section });
};

/** DELETE /:courseId/sections/:sectionId — Delete section and its lectures. */
const deleteSection = async (req, res) => {
  const lectures = await Lecture.find({
    sectionId: req.params.sectionId,
    courseId: req.params.courseId,
  }).select('_id courseId videoId');

  for (const lecture of lectures) {
    await cleanupLectureAssets(lecture);
  }

  await Lecture.deleteMany({ sectionId: req.params.sectionId });
  await Section.findByIdAndDelete(req.params.sectionId);
  res.json({ success: true, message: 'Section deleted successfully' });
};

/** PUT /:courseId/sections/reorder — Drag-and-drop reorder. */
const reorderSections = async (req, res) => {
  const { sectionOrders } = req.body;
  if (!Array.isArray(sectionOrders)) {
    return res.status(400).json({ error: 'sectionOrders must be an array' });
  }
  await Section.reorderSections(req.params.courseId, sectionOrders);
  res.json({ success: true, message: 'Sections reordered successfully' });
};

module.exports = {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  reorderSections,
};
