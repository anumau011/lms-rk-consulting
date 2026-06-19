const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const {
  sendContactFormEmail,
  sendContactAcknowledgementEmail,
} = require('../services/emailService');

const TAG = 'CONTACT_ROUTE';

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and message are required.',
      });
    }

    await Promise.all([
      sendContactFormEmail({ name, email, message }),
      sendContactAcknowledgementEmail({ name, email, message }),
    ]);

    logger.info(TAG, `Contact form submitted by ${email}`);

    res.json({ success: true });
  })
);

module.exports = router;
