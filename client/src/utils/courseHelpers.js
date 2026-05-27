import humanizeDuration from 'humanize-duration';

/**
 * Calculate the average rating of a course.
 * Handles multiple data formats (averageRating, stats, courseRatings array).
 *
 * @param {Object} course
 * @returns {number} Average rating (0–5)
 */
export const calculateRating = (course) => {
  if (!course) return 0;

  // Prefer API fields (catalog uses `rating`, detail uses `averageRating`)
  const direct =
    course.averageRating ??
    course.rating ??
    course.stats?.averageRating;

  if (direct != null && direct !== '') {
    const n = Number(direct);
    if (!Number.isNaN(n)) return n;
  }

  if (course?.courseRatings?.length) {
    const total = course.courseRatings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    return total / course.courseRatings.length;
  }

  return 0;
};

/**
 * Calculate total duration of a chapter (section).
 * @param {Object} chapter — { chapterContent: [{ lectureDuration }] }
 * @returns {string} Human-readable duration
 */
export const calculateChapterTime = (chapter) => {
  if (!chapter?.chapterContent?.length) return '0 minutes';

  const totalMinutes = chapter.chapterContent.reduce(
    (sum, lecture) => sum + (lecture.lectureDuration || 0),
    0
  );

  return humanizeDuration(totalMinutes * 60 * 1000, { units: ['h', 'm'] });
};

/**
 * Calculate total duration of an entire course.
 * @param {Object} course — { courseContent: [{ chapterContent: [{ lectureDuration }] }] }
 * @returns {string} Human-readable duration
 */
export const calculateCourseDuration = (course) => {
  if (!course?.courseContent?.length) return '0 minutes';

  let totalMinutes = 0;
  course.courseContent.forEach((chapter) => {
    chapter.chapterContent?.forEach((lecture) => {
      totalMinutes += lecture.lectureDuration || 0;
    });
  });

  return humanizeDuration(totalMinutes * 60 * 1000, { units: ['h', 'm'] });
};

/**
 * Count total lectures across all chapters.
 * @param {Object} course
 * @returns {number}
 */
export const calculateNoOfLectures = (course) => {
  if (!course?.courseContent?.length) return 0;

  return course.courseContent.reduce((total, chapter) => {
    return total + (Array.isArray(chapter.chapterContent) ? chapter.chapterContent.length : 0);
  }, 0);
};
