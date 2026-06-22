import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { File, UserRound, Play } from "lucide-react";
import { AppContext } from "../../context/AppContext";

const TIER_STYLES = {
  basic: {
    selected: "border-blue-500 bg-blue-50",
    unselected: "border-blue-200 hover:border-blue-300",
  },
  gold: {
    selected: "border-amber-500 bg-amber-50",
    unselected: "border-amber-200 hover:border-amber-300",
  },
  standard: {
    selected: "border-amber-500 bg-amber-50",
    unselected: "border-amber-200 hover:border-amber-300",
  },
  platinum: {
    selected: "border-slate-500 bg-slate-50",
    unselected: "border-slate-200 hover:border-slate-300",
  },
  premium: {
    selected: "border-slate-500 bg-slate-50",
    unselected: "border-slate-200 hover:border-slate-300",
  },
};

const toTierLabel = (tierId = "") =>
  tierId ? tierId.charAt(0).toUpperCase() + tierId.slice(1).toLowerCase() : "Plan";

const getTierStyle = (tierId, isSelected) => {
  const style = TIER_STYLES[tierId] || TIER_STYLES.basic;
  return isSelected ? style.selected : style.unselected;
};

const StarIcon = ({ filled }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "#f59e0b" : "#d1d5db"}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CourseCard = ({ course }) => {
  const { calculateRating } = useContext(AppContext);

  const plans = useMemo(() => {
    if (Array.isArray(course.pricingTiers) && course.pricingTiers.length > 0) {
      return course.pricingTiers
        .filter((tier) => tier?.isActive !== false)
        .map((tier) => {
          const basePrice = Number(tier.price ?? course?.price?.[tier.tier] ?? 0);
          const discount = Number(tier.discount ?? 0);
          const finalPrice = Number(
            tier.finalPrice ?? (discount > 0 ? basePrice - (basePrice * discount) / 100 : basePrice)
          );

          return {
            id: tier.tier,
            label: toTierLabel(tier.tier),
            price: Math.max(0, Math.round(finalPrice)),
            original: Math.max(0, Math.round(basePrice)),
          };
        });
    }

    if (course?.price && typeof course.price === "object") {
      return Object.entries(course.price).map(([tier, value]) => ({
        id: tier,
        label: toTierLabel(tier),
        price: Number(value) || 0,
        original: Number(value) || 0,
      }));
    }

    return [];
  }, [course]);

  const [selected, setSelected] = useState("gold");

  useEffect(() => {
    if (!plans.length) return;
    const defaultTier = plans.find((plan) => plan.id === "gold")?.id || plans[0].id;
    setSelected(defaultTier);
  }, [plans]);

  const instructor =
    course.instructorId ||
    course.instructor || {
      firstName: "John",
      lastName: "Doe",
      avatar: "https://i.pravatar.cc/150?img=1",
    };

  const rating = calculateRating
    ? calculateRating(course)
    : 4.7;

  const ratingValue = Number(rating) || 0;
  const lessonsCount =
    Number(course.totalLessons || course.lessonCount || course.lectureCount) ||
    (Array.isArray(course.sections)
      ? course.sections.reduce((sum, section) => sum + (section?.lectures?.length || 0), 0)
      : 0);
  const studentsCount = Number(course.enrollmentCount) || 0;
  const reviewsCount = Number(course.totalReviews) || 0;

  return (
    <div
      className="
        bg-white
        rounded-xl
        border
        border-slate-200
        overflow-hidden
        flex
        flex-col
        h-full
        transition-all
        duration-300
        hover:shadow-lg
        hover:-translate-y-1
      "
    >
      {/* Thumbnail */}
      <img
        src={
          course.thumbnail ||
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
        }
        alt={course.title}
        className="w-full aspect-video object-cover"
      />

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-[15px] font-semibold leading-5 text-slate-900 line-clamp-2 min-h-[40px] text-left">
          {course.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center justify-between mt-3 pb-3 border-b border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <File size={13} />
            <span>{lessonsCount} Lessons</span>
          </div>

          <div className="flex items-center gap-1">
            <UserRound size={13} />
            <span>{studentsCount} Students</span>
          </div>

          <div className="flex items-center gap-1">
            <Play size={13} />
            <span>{reviewsCount} Reviews</span>
          </div>
        </div>

        {/* Instructor */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img
              src={
                instructor.imageUrl ||
                "https://i.pravatar.cc/150?img=1"
              }
              alt="Instructor"
              className="w-9 h-9 rounded-full object-cover"
            />

            <div className="flex flex-col items-start text-left">
              <p className="text-sm font-medium text-slate-800 leading-none">
                {instructor.firstName
                  ? `${instructor.firstName} ${instructor.lastName}`
                  : instructor.name}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Instructor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon
                  key={i}
                  filled={i <= Math.round(rating)}
                />
              ))}
            </div>

            <span className="text-xs font-semibold text-slate-700">
              {ratingValue.toFixed(1)}
            </span>
          </div>
        </div>
        {/* Pricing */}
        <div className={`grid gap-2 mb-4 ${plans.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {plans.map((plan) => {
            const isSelected = selected === plan.id;

            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`rounded-lg border p-2 text-center transition-all duration-200 ${getTierStyle(plan.id, isSelected)}`}
              >
                <p className="text-[10px] uppercase font-semibold text-slate-500">
                  {plan.label}
                </p>

                <p className="text-sm font-bold mt-1 text-slate-900">
                  ₹{plan.price}
                </p>

                <p className="text-[10px] text-slate-400 line-through">
                  {plan.original > plan.price ? `₹${plan.original}` : ""}
                </p>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Button */}
        <Link
          to={`/course/${course._id}`}
          onClick={() => window.scrollTo(0, 0)}
        >
          <button
            className="
              w-full
              rounded-lg
              bg-slate-900
              py-3
              text-sm
              font-medium
              text-white
              transition-all
              hover:bg-black
            "
          >
            Enroll Now
          </button>
        </Link>
      </div>
    </div>
  );
};

export default CourseCard;