const mongoose = require('mongoose');

const educatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    designation: {
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
    about: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    socialLinks: {
      website: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
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

educatorSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Educator', educatorSchema);
