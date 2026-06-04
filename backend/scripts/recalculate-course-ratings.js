/**
 * One-time: recompute Course.averageRating / totalReviews from enrollments
 * (courseRating or feedback.rating). Run from repo root: node scripts/recalculate-course-ratings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../src/models/Course');
const { recalculateCourseRating } = require('../src/controllers/feedbackController');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const courses = await Course.find({}).select('_id title').lean();
  for (const c of courses) {
    await recalculateCourseRating(c._id);
  }
  console.log(`Updated ratings for ${courses.length} courses.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
