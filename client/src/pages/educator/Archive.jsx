import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Archive as ArchiveIcon, BookOpen, Search, Undo2, Clock3 } from "lucide-react";

const Archive = () => {
  const { backendUrl, getToken, isEducator } = useContext(AppContext);
  const [archivedCourses, setArchivedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchArchivedCourses = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/v1/courses/instructor?status=archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setArchivedCourses(data.courses || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load archived courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEducator) {
      fetchArchivedCourses();
    }
  }, [isEducator]);

  const filteredCourses = archivedCourses.filter((course) =>
    course.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ArchiveIcon className="text-indigo-600" />
              Archive
            </h1>
            <p className="text-gray-500 mt-1">
              Archived courses stay here until you decide what to do with them.
            </p>
          </div>
          <Link
            to="/educator/add-course"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <BookOpen size={18} />
            Create New Course
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search archived courses by title..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArchiveIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? "No archived courses found" : "No archived courses yet"}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms"
                : "When you archive a published course, it will appear here for later review."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <ArchiveIcon className="w-7 h-7 text-indigo-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{course.title}</h2>
                      <span className="inline-flex w-fit items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        <Clock3 size={12} />
                        Archived
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated {formatDate(course.updatedAt || course.createdAt)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {course.subtitle || course.description || "No description available."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      to={`/educator/edit-course/${course._id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Undo2 size={16} />
                      Open Course
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archive;