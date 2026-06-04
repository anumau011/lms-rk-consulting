const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    addedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

testimonialSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
