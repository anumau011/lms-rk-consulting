const Course = require('../models/Course');
const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const logger = require('../utils/logger');
const { normalizeEnrollmentTier, enrollmentsByTierKey } = require('../utils/tierAccess');

const TAG = 'COURSE_CTRL';

/** POST / — Create a new course with just a title (draft). */
const createCourse = async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  const course = await Course.create({
    instructorId: req.user._id,
    title: title.trim(),
    status: 'draft',
    completedSteps: { step1: true, step2: false, step3: false, step4: false },
  });

  logger.info(TAG, `Course created: ${course._id} by ${req.user._id}`);

  return res.status(201).json({
    success: true,
    message: 'Course created successfully',
    course,
  });
};

/** GET /instructor — List all courses for the authenticated instructor. */
const getInstructorCourses = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { instructorId: req.user._id };
  if (status) query.status = status;

  const [courses, count] = await Promise.all([
    Course.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * Number(limit))
      .lean(),
    Course.countDocuments(query),
  ]);

  const courseIds = courses.map((c) => c._id);

  const enrollmentStats = await Enrollment.aggregate([
    { $match: { courseId: { $in: courseIds }, 'purchase.status': 'CAPTURED' } },
    { $group: { _id: { courseId: '$courseId', tier: '$tier' }, count: { $sum: 1 } } },
  ]);

  const enrollmentMap = {};
  enrollmentStats.forEach((stat) => {
    const id = stat._id.courseId.toString();
    const tierKey = enrollmentsByTierKey(stat._id.tier || 'GOLD');
    if (!enrollmentMap[id]) {
      enrollmentMap[id] = { basic: 0, gold: 0, platinum: 0, standard: 0, premium: 0, total: 0 };
    }
    if (enrollmentMap[id][tierKey] === undefined) enrollmentMap[id][tierKey] = 0;
    enrollmentMap[id][tierKey] += stat.count;
    enrollmentMap[id].total += stat.count;
  });

  const coursesWithStats = courses.map((course) => ({
    ...course,
    enrollmentsByTier:
      enrollmentMap[course._id.toString()] || {
        basic: 0,
        gold: 0,
        platinum: 0,
        standard: 0,
        premium: 0,
        total: 0,
      },
  }));

  const actualEnrollments = await Enrollment.find({
    courseId: { $in: courseIds },
    'purchase.status': 'CAPTURED',
  })
    .populate('userId', 'firstName lastName imageUrl email createdAt updatedAt')
    .populate('courseId', 'title thumbnail')
    .sort({ 'purchase.capturedAt': -1, createdAt: -1 })
    .lean();

  const formattedEnrollments = actualEnrollments.map((e) => ({
    _id: e._id,
    courseTitle: e.courseId?.title,
    courseThumbnail: e.courseId?.thumbnail,
    plan: (() => {
      const t = normalizeEnrollmentTier(e.tier);
      if (t === 'PLATINUM') return 'Platinum';
      if (t === 'GOLD') return 'Gold';
      return 'Basic';
    })(),
    purchaseDate: e.purchase?.capturedAt || e.createdAt,
    student: {
      _id: e.userId?._id,
      name: `${e.userId?.firstName || ''} ${e.userId?.lastName || ''}`.trim() || 'Unknown Student',
      email: e.userId?.email || 'No Email',
      imageUrl: e.userId?.imageUrl || `https://ui-avatars.com/api/?name=${e.userId?.firstName || 'Student'}&background=random&color=fff`,
      createdAt: e.userId?.createdAt,
      updatedAt: e.userId?.updatedAt,
    },
  }));

  res.json({
    success: true,
    courses: coursesWithStats,
    enrolledStudentsData: formattedEnrollments,
    totalPages: Math.ceil(count / Number(limit)),
    currentPage: page,
    total: count,
  });
};

/** GET /:courseId — Single course (educator view, requires ownership). */
const getCourseById = async (req, res) => {
  res.json({ success: true, course: req.course });
};

/** PATCH /:courseId/basic-info — Update basic info (Step 1). */
const updateBasicInfo = async (req, res) => {
  const { title } = req.body;
  if (title) req.course.title = title.trim();
  req.course.completedSteps.step1 = true;
  await req.course.save();
  res.json({ success: true, message: 'Basic info updated successfully', course: req.course });
};

/** PATCH /:courseId/details — Update course details (Step 3). */
const updateDetails = async (req, res) => {
  const { title, subtitle, description, category, level, language, thumbnail, tags, requirements, whatYoullLearn, enrollmentExpirationMonths } = req.body;

  if (title) req.course.title = title.trim();
  if (subtitle !== undefined) req.course.subtitle = subtitle?.trim();
  if (description !== undefined) req.course.description = description?.trim();
  if (category) req.course.category = category;
  if (level) req.course.level = level;
  if (language) req.course.language = language;
  if (thumbnail !== undefined) req.course.thumbnail = thumbnail.url;
  if (tags) req.course.tags = tags;
  if (requirements) req.course.requirements = requirements;
  if (whatYoullLearn) req.course.whatYoullLearn = whatYoullLearn;
  
  // Handle enrollment expiration months
  if (enrollmentExpirationMonths !== undefined) {
    const months = parseInt(enrollmentExpirationMonths, 10);
    if (isNaN(months) || months < 1 || months > 120) {
      return res.status(400).json({ error: 'Enrollment expiration must be between 1 and 120 months' });
    }
    req.course.enrollmentExpirationMonths = months;
  }

  req.course.completedSteps.step3 = true;
  await req.course.save();
  res.json({ success: true, message: 'Course details updated successfully', course: req.course });
};

/** PATCH /:courseId/pricing — Update pricing tiers (Step 4). */
const updatePricing = async (req, res) => {
  const { pricingTiers, currency } = req.body;

  if (!pricingTiers || !Array.isArray(pricingTiers)) {
    return res.status(400).json({ error: 'Pricing tiers must be an array' });
  }

  const validTiers = ['basic', 'gold', 'platinum'];
  for (const tier of pricingTiers) {
    if (!validTiers.includes(tier.tier)) {
      return res.status(400).json({
        error: `Invalid tier: ${tier.tier}. Must be basic, gold, or platinum`,
      });
    }
    if (typeof tier.price !== 'number' || tier.price < 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
  }

  req.course.pricingTiers = pricingTiers;
  if (currency) req.course.currency = currency;
  req.course.completedSteps.step4 = true;
  await req.course.save();

  res.json({ success: true, message: 'Pricing updated successfully', course: req.course });
};

/** POST /:courseId/publish — Publish the course. */
const publishCourse = async (req, res) => {
  const courseId = req.params.courseId;
  const [sectionCount, lectureCount] = await Promise.all([
    Section.countDocuments({ courseId }),
    Lecture.countDocuments({ courseId }),
  ]);

  // Auto-detect completed steps
  const nextSteps = {
    ...req.course.completedSteps,
    step1: req.course.completedSteps.step1 || Boolean(req.course.title?.trim()),
    step2: req.course.completedSteps.step2 || (sectionCount > 0 && lectureCount > 0),
    step3: req.course.completedSteps.step3 || Boolean(req.course.description || req.course.subtitle || req.course.thumbnail),
    step4: req.course.completedSteps.step4 || Boolean(Array.isArray(req.course.pricingTiers) && req.course.pricingTiers.length > 0),
  };

  const stepsChanged =
    req.course.completedSteps.step1 !== nextSteps.step1 ||
    req.course.completedSteps.step2 !== nextSteps.step2 ||
    req.course.completedSteps.step3 !== nextSteps.step3 ||
    req.course.completedSteps.step4 !== nextSteps.step4;

  if (stepsChanged) {
    req.course.completedSteps = nextSteps;
    await req.course.save();
  }

  if (!req.course.canPublish()) {
    const missing = [];
    if (!req.course.completedSteps.step1) missing.push('Basic Info');
    if (!req.course.completedSteps.step2) missing.push('Curriculum');
    if (!req.course.completedSteps.step3) missing.push('Course Details');
    if (!req.course.completedSteps.step4) missing.push('Pricing');

    return res.status(400).json({
      success: false,
      error: 'Cannot publish course. Please complete all required steps.',
      missingSteps: missing,
      completedSteps: req.course.completedSteps,
    });
  }

  if (sectionCount === 0 || lectureCount === 0) {
    return res.status(400).json({
      success: false,
      error: 'Course must have at least one section with one lecture to publish',
      details: { sections: sectionCount, lectures: lectureCount },
    });
  }

  // Generate slug if missing
  if (!req.course.slug) {
    const baseSlug = req.course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await Course.findOne({ slug, _id: { $ne: req.course._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    req.course.slug = slug;
  }

  req.course.status = 'published';
  await req.course.save();
  res.json({ success: true, message: 'Course published successfully', course: req.course });
};

/** POST /:courseId/unpublish — Revert to draft. */
const unpublishCourse = async (req, res) => {
  req.course.status = 'draft';
  await req.course.save();
  res.json({ success: true, message: 'Course unpublished successfully', course: req.course });
};

/** DELETE /:courseId — Soft-delete (archive). */
const archiveCourse = async (req, res) => {
  req.course.status = 'archived';
  await req.course.save();
  res.json({ success: true, message: 'Course archived successfully' });
};

module.exports = {
  createCourse,
  getInstructorCourses,
  getCourseById,
  updateBasicInfo,
  updateDetails,
  updatePricing,
  publishCourse,
  unpublishCourse,
  archiveCourse,
};
