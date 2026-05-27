import React from "react";
import { Link } from "react-router-dom";

const categories = [
  { title: "UI/UX Design Service" },
  { title: "Software Development" },
  { title: "Digital Marketing" },
  { title: "Self Management" },
  { title: "Application Development" },
  { title: "UI/UX Graphic Design" },
];

const IconCircle = () => (
  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-50 to-slate-50 ring-1 ring-cyan-100 flex items-center justify-center">
    <svg
      className="w-8 h-8 text-cyan-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 1.343-3 3 0 1.306.835 2.418 2 2.83V18l3-1 3 1v-4.17c1.165-.412 2-1.524 2-2.83 0-1.657-1.343-3-3-3H12z"
      />
    </svg>
  </div>
);

const CoursesCategories = () => {
  return (
    <section className="w-full py-14 px-8 md:px-40">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between mb-10">
        <div className="text-left">
          <div className="inline-block bg-cyan-50 text-cyan-700 border border-cyan-100 px-3 py-1 rounded-full text-sm font-medium mb-2">
            Our Course Categories
          </div>
          <h2 className="text-3xl font-medium text-gray-800">Featured Courses</h2>
        </div>
        <Link
          to="/course-list"
          onClick={() => scrollTo(0, 0)}
          className="self-start md:self-auto text-cyan-700 border border-cyan-200 px-6 py-3 rounded-full font-medium hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-colors"
        >
          Browse All Courses →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {categories.map((c, idx) => (
          <div
            key={idx}
            className="bg-cyan-50/40 border border-cyan-100 rounded-xl p-6 flex flex-col items-center text-center space-y-6 shadow-sm hover:bg-cyan-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <IconCircle />
            <h3 className="text-lg font-semibold text-gray-800 leading-snug min-h-[56px]">{c.title}</h3>
            <div className="mt-auto">
              <Link
                to="/course-list"
                onClick={() => scrollTo(0, 0)}
                className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-cyan-500 hover:text-cyan-600 transition-colors"
                aria-label={`Browse ${c.title} courses`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CoursesCategories;
