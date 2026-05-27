import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { Line } from "rc-progress";
import Footer from "../../components/student/Footer";
import axios from "axios";
import toast from "react-hot-toast";
import humanizeDuration from "humanize-duration";
import { normalizeTier, tierUi } from "../../utils/tierStyles";
import { AlertCircle, Clock } from "lucide-react";

const MyEnrollments = () => {
  const {
    enrolledCourses,
    navigate,
    userData,
    fetchUserEnrolledCourses,
    backendUrl,
    getToken,
    calculateNoOfLectures,
  } = useContext(AppContext);

  const [progressArray, setProgressArray] = useState([]);

  const formatDurationFromSeconds = (seconds) => {
    const safeSeconds = Number(seconds) || 0;
    if (safeSeconds <= 0) return "0 seconds";
    return humanizeDuration(safeSeconds * 1000, {
      units: ["h", "m", "s"],
      largest: 2,
      round: true,
    });
  };

  const getCourseDurationText = (course) => {
    const totalSeconds = (course?.courseContent || []).reduce(
      (chapterTotal, chapter) => chapterTotal + (chapter?.chapterContent || []).reduce(
        (lectureTotal, lecture) => lectureTotal + (Number(lecture?.lectureDuration) || 0),
        0
      ),
      0
    );
    return formatDurationFromSeconds(totalSeconds);
  };

  const getProgressPercent = (index) => {
    const progress = progressArray[index];
    if (!progress?.totalLectures) return 0;
    return Math.min(100, Math.round((progress.lectureCompleted * 100) / progress.totalLectures));
  };

  const tierBadgeClass = (courseId) => {
    const t = normalizeTier(userData?.tierByCourse?.[courseId] || "GOLD");
    if (t === "PLATINUM") return "bg-slate-900 text-cyan-100 border border-cyan-400";
    if (t === "GOLD") return "bg-amber-500 text-white";
    return "bg-slate-600 text-white";
  };

  const tierLabel = (courseId) => tierUi(userData?.tierByCourse?.[courseId]).label;

  const formatExpirationDate = (expiresAt) => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const isExpiringsoon = (expiresAt) => {
    const daysLeft = getDaysRemaining(expiresAt);
    return daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
  };

  const getCourseProgress = async () => {
    try {
      const token = await getToken();
      const tempProgressArray = await Promise.all(
        enrolledCourses.map(async (course) => {
          const { data } = await axios.post(
            `${backendUrl}/api/user/get-course-progress`,
            { courseId: course._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const totalLectures = calculateNoOfLectures(course);
          const lectureCompleted = data.progressData
            ? data.progressData.lectureCompleted.length
            : 0;

          return { totalLectures, lectureCompleted };
        })
      );
      setProgressArray(tempProgressArray);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (userData) fetchUserEnrolledCourses();
  }, [userData]);

  useEffect(() => {
    if (enrolledCourses.length > 0) getCourseProgress();
  }, [enrolledCourses]);



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-cyan-50 via-white to-cyan-100">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        <h1 className="text-2xl font-semibold mb-8">
          My Enrollments
        </h1>

        {/* EMPTY STATE */}
        {enrolledCourses.length === 0 && (
          <div className="w-full py-20 flex flex-col items-center text-gray-700">
            <p className="text-xl font-semibold">No enrollments yet</p>
            <p className="mt-2 text-sm text-center max-w-sm">
              You haven’t enrolled in any courses yet.
            </p>
            <button
              onClick={() => navigate("/course-list")}
              className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-md"
            >
              Browse Courses
            </button>
          </div>
        )}

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-4">
          {enrolledCourses.map((course, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm p-4 space-y-3 relative overflow-hidden"
            >
              {/* Premium/Standard Badge */}
              <div
                className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-lg ${tierBadgeClass(course._id)}`}
              >
                {tierLabel(course._id)}
              </div>

              <div className="flex gap-4 pt-2">
                <img
                  src={course.courseThumbnail || course.thumbnail}
                  alt={course.courseTitle || course.title}
                  className="w-20 h-16 object-cover rounded"
                />

                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {course.courseTitle || course.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Line
                      strokeWidth={3}
                      trailWidth={3}
                      strokeColor="#2563eb"
                      trailColor="#dbeafe"
                      strokeLinecap="round"
                      percent={getProgressPercent(index)}
                      className="flex-1"
                    />
                    <span className="text-xs font-bold text-blue-700 min-w-[44px] text-right">
                      {getProgressPercent(index)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {getCourseDurationText(course)}
                  </p>
                  
                  {course.expiresAt && (
                    <div className={`flex items-center gap-2 text-xs mt-2 ${isExpiringsoon(course.expiresAt) ? 'text-orange-600' : 'text-gray-500'}`}>
                      <Clock size={14} />
                      <span>Expires: {formatExpirationDate(course.expiresAt)} ({getDaysRemaining(course.expiresAt)} days)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>
                  {progressArray[index] &&
                    `${progressArray[index].lectureCompleted}/${progressArray[index].totalLectures}`}{" "}
                  lectures
                </span>

                <button
                  onClick={() => navigate("/player/" + course._id)}
                  className="px-4 py-1.5 text-white rounded text-sm bg-gray-700 hover:bg-gray-800"
                >
                  {progressArray[index] &&
                  progressArray[index].lectureCompleted /
                    progressArray[index].totalLectures ===
                    1
                    ? "Completed"
                    : "Continue"}
                </button>
              </div>

              {isExpiringsoon(course.expiresAt) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 mt-2">
                  <AlertCircle size={14} />
                  <span>Access expires soon! Renew to continue learning.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        {enrolledCourses.length > 0 && (
          <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm">
            <table className="w-full table-auto">
              <thead className="border-b text-sm text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Progress</th>
                  <th className="px-4 py-3 text-left">Expires</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {enrolledCourses.map((course, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-4 flex gap-4">
                      <div className="relative">
                        <img
                          src={course.thumbnail}
                          alt={course.courseTitle || course.title}
                          className="w-24 rounded"
                        />
                      </div>
                      <div className="min-w-[280px]">
                        <p className="font-medium text-gray-900">
                          {course.courseTitle || course.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Line
                            strokeWidth={3}
                            trailWidth={3}
                            strokeColor="#2563eb"
                            trailColor="#dbeafe"
                            strokeLinecap="round"
                            percent={getProgressPercent(index)}
                            className="flex-1"
                          />
                          <span className="text-xs font-bold text-blue-700 min-w-[44px] text-right">
                            {getProgressPercent(index)}%
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${tierBadgeClass(course._id)}`}
                      >
                        {tierLabel(course._id)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {getCourseDurationText(course)}
                    </td>

                    <td className="px-4 py-4">
                      <span>
                        {progressArray[index]
                          ? `${progressArray[index].lectureCompleted}/${progressArray[index].totalLectures}`
                          : "0/0"} lectures
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {course.expiresAt ? (
                        <div className={`flex items-center gap-2 ${isExpiringsoon(course.expiresAt) ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                          <Clock size={14} />
                          <span className="text-sm">
                            {formatExpirationDate(course.expiresAt)}
                            <br />
                            <span className="text-xs">{getDaysRemaining(course.expiresAt)} days left</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No expiration</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => navigate("/player/" + course._id)}
                        className="px-5 py-2 text-white rounded-md text-sm bg-gray-700 hover:bg-gray-800"
                      >
                        {getProgressPercent(index) === 100 ? "Completed" : "Continue"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MyEnrollments;
