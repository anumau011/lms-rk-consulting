const express = require('express');
const router = express.Router();
const webhookCtrl = require('../controllers/webhookController');

router.post('/clerk', webhookCtrl.handleClerkWebhook);
router.post('/bunny', webhookCtrl.handleBunnyWebhook);
router.post('/razorpay', webhookCtrl.handleRazorpayWebhook);

module.exports = router;
