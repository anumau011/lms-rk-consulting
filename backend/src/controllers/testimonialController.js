const Testimonial = require('../models/Testimonial');
const logger = require('../utils/logger');

const TAG = 'TESTIMONIAL_CTRL';

/** GET /public — List active testimonials for the student-facing site. */
const getPublicTestimonials = async (req, res) => {
  const testimonials = await Testimonial.find({ isActive: true })
    .select('name role imageUrl rating feedback')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ success: true, testimonials });
};

/** GET / — List all testimonials (educator/admin view). */
const getAllTestimonials = async (req, res) => {
  const testimonials = await Testimonial.find({ addedBy: req.user._id })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ success: true, testimonials });
};

/** POST / — Create a new testimonial. */
const createTestimonial = async (req, res) => {
  const { name, role, imageUrl, rating, feedback } = req.body;

  if (!name || !feedback || !rating) {
    return res.status(400).json({ success: false, message: 'Name, feedback, and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  const count = await Testimonial.countDocuments({ addedBy: req.user._id });

  const testimonial = await Testimonial.create({
    name: name.trim(),
    role: role?.trim() || '',
    imageUrl: imageUrl?.trim() || '',
    rating: Number(rating),
    feedback: feedback.trim(),
    isActive: true,
    order: count,
    addedBy: req.user._id,
  });

  logger.info(TAG, `Testimonial created: ${testimonial._id}`);
  res.status(201).json({ success: true, message: 'Testimonial created successfully', testimonial });
};

/** PUT /:id — Update a testimonial. */
const updateTestimonial = async (req, res) => {
  const { name, role, imageUrl, rating, feedback, isActive } = req.body;

  const testimonial = await Testimonial.findOne({ _id: req.params.id, addedBy: req.user._id });
  if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });

  if (name !== undefined) testimonial.name = name.trim();
  if (role !== undefined) testimonial.role = role.trim();
  if (imageUrl !== undefined) testimonial.imageUrl = imageUrl.trim();
  if (rating !== undefined) {
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    testimonial.rating = Number(rating);
  }
  if (feedback !== undefined) testimonial.feedback = feedback.trim();
  if (isActive !== undefined) testimonial.isActive = Boolean(isActive);

  await testimonial.save();
  logger.info(TAG, `Testimonial updated: ${testimonial._id}`);
  res.json({ success: true, message: 'Testimonial updated successfully', testimonial });
};

/** DELETE /:id — Delete a testimonial. */
const deleteTestimonial = async (req, res) => {
  const testimonial = await Testimonial.findOneAndDelete({ _id: req.params.id, addedBy: req.user._id });
  if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });

  logger.info(TAG, `Testimonial deleted: ${testimonial._id}`);
  res.json({ success: true, message: 'Testimonial deleted successfully' });
};

/** PUT /reorder — Reorder testimonials. */
const reorderTestimonials = async (req, res) => {
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

  await Testimonial.bulkWrite(ops);
  res.json({ success: true, message: 'Testimonials reordered successfully' });
};

module.exports = {
  getPublicTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reorderTestimonials,
};
