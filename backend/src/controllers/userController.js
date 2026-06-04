const User = require('../models/User');
const logger = require('../utils/logger');

const TAG = 'USER_CTRL';

const VALID_EDUCATION = [
  'higher_secondary',
  'diploma',
  'undergraduate',
  'postgraduate',
  'phd',
  'other',
];

const VALID_GENDER = ['male', 'female', 'other', 'prefer_not_to_say'];

/** POST /user/complete-profile — Save extra registration fields after Clerk sign-up. */
const completeProfile = async (req, res) => {
  const { phone, dateOfBirth, education, gender, country, profession } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Validate education
  if (education && !VALID_EDUCATION.includes(education)) {
    return res.status(400).json({ success: false, message: 'Invalid education value' });
  }

  // Validate gender
  if (gender && !VALID_GENDER.includes(gender)) {
    return res.status(400).json({ success: false, message: 'Invalid gender value' });
  }

  // Validate DOB
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date of birth' });
    }
    user.dateOfBirth = dob;
  }

  if (phone !== undefined) user.phone = phone.trim();
  if (education) user.education = education;
  if (gender) user.gender = gender;
  if (country !== undefined) user.country = country.trim();
  if (profession !== undefined) user.profession = profession.trim();
  user.profileCompleted = true;

  await user.save();
  logger.info(TAG, `Profile completed for user ${user._id}`);

  res.json({ success: true, message: 'Profile completed successfully', user });
};

module.exports = { completeProfile };
