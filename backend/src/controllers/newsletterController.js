const Newsletter = require('../models/Newsletter');
const logger = require('../utils/logger');

const TAG = 'NEWSLETTER_CTRL';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/** POST / — Subscribe an email to the newsletter. */
const subscribe = async (req, res) => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await Newsletter.findOne({ email: normalizedEmail });
  if (existing) {
    return res.json({ success: true, message: 'You are already subscribed' });
  }

  await Newsletter.create({ email: normalizedEmail });
  logger.info(TAG, `New subscriber: ${normalizedEmail}`);

  res.status(201).json({ success: true, message: 'Subscribed successfully' });
};

module.exports = { subscribe };
