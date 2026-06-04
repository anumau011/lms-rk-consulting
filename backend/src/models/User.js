const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Clerk User ID
  email: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String, trim: true, default: '' },
  dateOfBirth: { type: Date, default: null },
  education: {
    type: String,
    enum: [
      '',
      'higher_secondary',
      'diploma',
      'undergraduate',
      'postgraduate',
      'phd',
      'other',
    ],
    default: '',
  },
  gender: {
    type: String,
    enum: ['', 'male', 'female', 'other', 'prefer_not_to_say'],
    default: '',
  },
  country: { type: String, trim: true, default: '' },
  profession: { type: String, trim: true, default: '' },
  profileCompleted: { type: Boolean, default: false },
  role: { 
    type: String, 
    enum: ['student', 'educator', 'admin'], 
    default: 'student',
    required: true
  },
  stripeCustomerId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  _id: false,
  timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
