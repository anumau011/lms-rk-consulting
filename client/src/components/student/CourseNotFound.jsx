import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BookOpen } from "lucide-react";

const CourseNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="relative mb-8">
          <div className="w-28 h-28 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-14 h-14 text-indigo-600" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Course Not Found
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          This course doesn't exist, may have been removed, or the link you
          followed is invalid.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm w-full sm:w-auto justify-center"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <Link
            to="/course-list"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 w-full sm:w-auto justify-center"
          >
            <Search size={20} />
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseNotFound;
