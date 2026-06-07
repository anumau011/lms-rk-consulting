import React from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Code2,
  GraduationCap,
  Layers3,
  Megaphone,
  PenTool,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const categories = [
  {
    title: "UI/UX Design Service",
    icon: PenTool,
    description: "Shape polished interfaces, user flows, and design systems that make digital products feel intuitive.",
  },
  {
    title: "Software Development",
    icon: Code2,
    description: "Build modern apps with clean code, practical architecture, and hands-on engineering exercises.",
  },
  {
    title: "Digital Marketing",
    icon: Megaphone,
    description: "Learn to plan campaigns, grow audiences, and measure impact across channels and platforms.",
  },
  {
    title: "Self Management",
    icon: Brain,
    description: "Develop focus, discipline, and productivity habits that help you stay consistent and improve faster.",
  },
  {
    title: "Application Development",
    icon: Layers3,
    description: "Explore full-stack app building, from product structure and APIs to shipping production-ready features.",
  },
  {
    title: "UI/UX Graphic Design",
    icon: GraduationCap,
    description: "Blend visual storytelling with layout, typography, and branding to create standout digital assets.",
  },
];

const CoursesCategories = () => {
  return (
    <section className="w-full px-4 py-10 sm:px-8 md:px-40 md:py-14">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-6">
        {categories.map((c, idx) => (
          <div
            key={idx}
            className="group"
            style={{ perspective: "1000px" }}
          >
            <div className="relative min-h-[240px] transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
              <div className="absolute inset-0 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 text-center shadow-sm sm:p-6 [backface-visibility:hidden]">
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-cyan-600 shadow-sm ring-1 ring-cyan-100 sm:h-16 sm:w-16">
                    <c.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="min-h-[56px] text-base font-semibold leading-snug text-gray-800 sm:text-lg">
                    {c.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Hover to see what this track covers.
                  </p>
                </div>
              </div>

              <div className="absolute inset-0 rounded-2xl border border-cyan-600 bg-cyan-600 p-4 text-white shadow-lg sm:p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <Sparkles className="h-5 w-5 text-cyan-100" />
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-50">
                      Details
                    </span>
                  </div>

                  <div className="mt-5 flex-1">
                    <h3 className="text-lg font-semibold leading-snug sm:text-xl">{c.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-cyan-50/90">
                      {c.description}
                    </p>
                  </div>

                  <Link
                    to="/course-list"
                    onClick={() => scrollTo(0, 0)}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                    aria-label={`Browse ${c.title} courses`}
                  >
                    Explore
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CoursesCategories;
