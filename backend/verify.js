// Quick verification that all new modules load without errors
try {
  require('./src/utils/asyncHandler');
  require('./src/utils/logger');
  require('./src/utils/constants');
  require('./src/utils/fileHelpers');
  require('./src/middleware/errorHandler');
  console.log('[OK] All utilities loaded successfully');
} catch (e) {
  console.error('[FAIL] Utility load error:', e.message);
  process.exit(1);
}

try {
  require('./src/controllers/courseController');
  require('./src/controllers/sectionController');
  require('./src/controllers/lectureController');
  require('./src/controllers/mediaController');
  require('./src/controllers/noteController');
  require('./src/controllers/feedbackController');
  require('./src/controllers/adminController');
  require('./src/controllers/studentController');
  require('./src/controllers/webhookController');
  console.log('[OK] All controllers loaded successfully');
} catch (e) {
  console.error('[FAIL] Controller load error:', e.message);
  process.exit(1);
}

try {
  require('./src/routes/courses');
  require('./src/routes/media');
  require('./src/routes/student');
  require('./src/routes/progress');
  require('./src/routes/admin');
  require('./src/routes/webhooks');
  console.log('[OK] All routes loaded successfully');
} catch (e) {
  console.error('[FAIL] Route load error:', e.message);
  process.exit(1);
}

console.log('\n=== All backend modules verified ===');
process.exit(0);
