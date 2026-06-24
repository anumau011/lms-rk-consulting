const Educator = require('../models/Educator');
const logger = require('../utils/logger');

const TAG = 'EDUCATOR_CTRL';

const SOCIAL_KEYS = ['website', 'linkedin', 'twitter', 'instagram', 'facebook', 'youtube'];

const sanitizeSocialLinks = (socialLinks = {}) =>
  SOCIAL_KEYS.reduce((acc, key) => {
    acc[key] = (socialLinks[key] || '').trim();
    return acc;
  }, {});

/** GET /public — List active educators for the student-facing site. */
const getPublicEducators = async (req, res) => {
  const educators = await Educator.find({ isActive: true })
    .select('name designation imageUrl about socialLinks')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ success: true, educators });
};

/** GET / — List all educators (educator/admin view). */
const getAllEducators = async (req, res) => {
  const educators = await Educator.find({ addedBy: req.user._id })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ success: true, educators });
};

/** POST / — Create a new educator profile. */
const createEducator = async (req, res) => {
  const { name, designation, imageUrl, about, socialLinks } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  const count = await Educator.countDocuments({ addedBy: req.user._id });

  const educator = await Educator.create({
    name: name.trim(),
    designation: designation?.trim() || '',
    imageUrl: imageUrl?.trim() || '',
    about: about?.trim() || '',
    socialLinks: sanitizeSocialLinks(socialLinks),
    isActive: true,
    order: count,
    addedBy: req.user._id,
  });

  logger.info(TAG, `Educator created: ${educator._id}`);
  res.status(201).json({ success: true, message: 'Educator created successfully', educator });
};

/** PUT /:id — Update an educator profile. */
const updateEducator = async (req, res) => {
  const { name, designation, imageUrl, about, socialLinks, isActive } = req.body;

  const educator = await Educator.findOne({ _id: req.params.id, addedBy: req.user._id });
  if (!educator) return res.status(404).json({ success: false, message: 'Educator not found' });

  if (name !== undefined) educator.name = name.trim();
  if (designation !== undefined) educator.designation = designation.trim();
  if (imageUrl !== undefined) educator.imageUrl = imageUrl.trim();
  if (about !== undefined) educator.about = about.trim();
  if (socialLinks !== undefined) educator.socialLinks = sanitizeSocialLinks(socialLinks);
  if (isActive !== undefined) educator.isActive = Boolean(isActive);

  await educator.save();
  logger.info(TAG, `Educator updated: ${educator._id}`);
  res.json({ success: true, message: 'Educator updated successfully', educator });
};

/** DELETE /:id — Delete an educator profile. */
const deleteEducator = async (req, res) => {
  const educator = await Educator.findOneAndDelete({ _id: req.params.id, addedBy: req.user._id });
  if (!educator) return res.status(404).json({ success: false, message: 'Educator not found' });

  logger.info(TAG, `Educator deleted: ${educator._id}`);
  res.json({ success: true, message: 'Educator deleted successfully' });
};

/** PUT /reorder — Reorder educators. */
const reorderEducators = async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, message: 'orderedIds must be an array' });
  }

  const ops = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, addedBy: req.user._id },
      update: { $set: { order: index } },
    },
  }));

  await Educator.bulkWrite(ops);
  res.json({ success: true, message: 'Educators reordered successfully' });
};

module.exports = {
  getPublicEducators,
  getAllEducators,
  createEducator,
  updateEducator,
  deleteEducator,
  reorderEducators,
};
