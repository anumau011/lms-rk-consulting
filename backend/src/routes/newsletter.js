const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const newsletterCtrl = require('../controllers/newsletterController');

router.post('/', asyncHandler(newsletterCtrl.subscribe));

module.exports = router;
