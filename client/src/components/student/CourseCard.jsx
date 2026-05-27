import React, { useContext } from "react";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import { Link } from "react-router-dom";
import { getTierFinalAmount } from "../../utils/tierStyles";

const PLAN_ROWS = [
  {
    key: "basic",
    label: "Basic",
    labelClass: "text-slate-600",
    rowClass: "",
    priceClass: "text-slate-800",
  },
  {
    key: "gold",
    label: "Gold",
    labelClass: "text-amber-700",
    rowClass: "",
    priceClass: "text-amber-600",
  },
  {
    key: "platinum",
    label: "Platinum",
    labelClass: "text-cyan-800",
    rowClass: "bg-slate-900/5 rounded-md -mx-1 px-1 py-0.5 border border-cyan-200/60",
    priceClass: "text-cyan-700",
  },
];

function tierAmount(course, planKey) {
  return getTierFinalAmount(course, planKey);
}

const CourseCard = ({ course }) => {
  const { calculateRating } = useContext(AppContext);

  const tiers = course.pricingTiers || [];
  const platinumTier = tiers.find((t) => t.tier === "platinum" || t.tier === "premium");

  return (
    <Link
      to={"/course/" + course._id}
      onClick={() => scrollTo(0, 0)}
      className="border border-gray-100 pb-5 overflow-hidden rounded-xl bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative">
        <img
          className="w-full aspect-video object-cover"
          src={course.thumbnail || "https://via.placeholder.com/400x300?text=Course+Image"}
          alt={course.title}
          width={400}
          height={225}
        />
        {platinumTier && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-slate-800 to-cyan-900 text-cyan-100 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm border border-cyan-400/50">
            Platinum
          </div>
        )}
      </div>

      <div className="p-4 text-left flex flex-col flex-1">
        <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-gray-500 text-sm mb-2 font-medium">
          {course.instructorId?.firstName || course.instructor?.name || "Expert Educator"}
        </p>

        <div className="flex items-center space-x-2 mb-auto pb-4">
          <p className="font-bold text-yellow-500">{Number(calculateRating(course)).toFixed(1)}</p>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <img
                key={i}
                src={i < Math.floor(calculateRating(course)) ? assets.star : assets.star_blank}
                alt="star"
                className="w-3.5 h-3.5"
              />
            ))}
          </div>
          <p className="text-gray-400 text-sm">({course.totalReviews || 0})</p>
          <span className="text-gray-300 mx-1">•</span>
          <p className="text-gray-500 text-sm">{course.enrollmentCount || 0} students</p>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Plans</p>
          {PLAN_ROWS.map(({ key, label, labelClass, rowClass, priceClass }) => {
            const amount = tierAmount(course, key);
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-2 ${rowClass}`}
              >
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${labelClass}`}>
                  {label}
                </span>
                <span className={`text-xs font-bold tabular-nums ${priceClass}`}>
                  {amount != null && !Number.isNaN(amount)
                    ? `₹${Number(amount).toLocaleString("en-IN")}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
