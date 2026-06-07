import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

// ---------- helpers ----------
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "");
}

const statsData = [
[
  {
    icon: "users",
    value: "200+",
    label: "Expert Educators",
  },
  {
    icon: "graduationCap",
    value: "Industry-Level",
    label: "Practical Training",
  }
],
[

  {
    icon: "briefcase",
    value: "100%",
    label: "Job-Oriented Curriculum",
  },
  {
    icon: "headphones",
    value: "< 5 Min",
    label: "Average Support Response",
  },
],
[
  {
    icon: "users",
    value: "200+",
    label: "Certified Trainers",
  },
  {
    icon: "graduationCap",
    value: "Industry-Ready",
    label: "Hands-On Learning",
  },
],

];

function mapCoursesToSlides(courses) {
  return courses.map((course,index) => {
    const description = course.description || course.subtitle || "";
    const plainDescription = stripHtml(description);
    const enrolledCount = course.enrollmentCount || 0;
    const rating = course.rating || course.averageRating || 0;
    const titleParts = (course.title || "Featured Course").split(" ");
    const titleAccent = "Course";
    return {
      id: course._id,
      badge: course.category || "Featured Course",
      title: titleParts.slice(0, Math.max(1, titleParts.length - 1)).join(" ") || course.title || "Featured Course",
      titleAccent,
      desc: plainDescription.slice(0, 165) + (plainDescription.length > 165 ? "..." : ""),
      image: course.thumbnail,
      enrolledCount,
      rating,
      level: course.level || "All Levels",
      searchPlaceholder: `Search courses… e.g. ${course.title?.split(" ")[0] || "React"}`,
      stats: statsData[index],
      courseId: course._id,
    };
  });
}

// ---------- static fallback slides (shown when API has no data) ----------
const FALLBACK_SLIDES = [
  {
    id: "slide-1",
    badge: "Featured Course",
    title: "Advance Java",
    titleAccent: "Course",
    desc: "Learn Java fundamentals, object-oriented programming, collections, Spring basics, and real-world project workflows with practical guidance.",
    searchPlaceholder: "Search courses… e.g. Java",
    stats: [
      { icon: "star", value: "4.9", label: "Average learner rating" },
      { icon: "user", value: "340+", label: "Students enrolled" },
    ],
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    // floatTop: { icon: "grid", value: "340+", label: "Course enrollments", color: "#06b6d4" },
    // floatBottom: "rating",
    // price: 0,
    // originalPrice: 0,
    // discount: 0,
    enrolledCount: 340,
    rating: 4.9,
    level: "All Levels",
  },
  {
    id: "slide-2",
    badge: "Featured Course",
    title: "React Development",
    titleAccent: "Track",
    desc: "From UI building blocks to advanced state management, this track guides you from beginner to job-ready in weeks, not years.",
    searchPlaceholder: "Try 'React' or 'State Management'",
    stats: [
      { icon: "star", value: "4.8", label: "Average learner rating" },
      { icon: "user", value: "280+", label: "Students enrolled" },
    ],
    image: "https://images.unsplash.com/photo-1516321318423-5b0d2c1f2b7c?auto=format&fit=crop&w=900&q=80",
    floatTop: { icon: "grid", value: "280+", label: "Course enrollments", color: "#8b5cf6" },
    floatBottom: "rating",
    price: 0,
    originalPrice: 0,
    discount: 0,
    enrolledCount: 280,
    rating: 4.8,
    level: "Intermediate",
  },
  {
    id: "slide-3",
    badge: "Featured Course",
    title: "Digital Marketing",
    titleAccent: "Masterclass",
    desc: "Every lesson includes practical campaign planning, content strategy, and performance tracking to help you grow brands online.",
    searchPlaceholder: "Try 'SEO' or 'Content Strategy'",
    stats: [
      { icon: "star", value: "4.9", label: "Average learner rating" },
      { icon: "user", value: "190+", label: "Students enrolled" },
    ],
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    floatTop: { icon: "grid", value: "190+", label: "Course enrollments", color: "#10b981" },
    floatBottom: "projects",
    price: 0,
    originalPrice: 0,
    discount: 0,
    enrolledCount: 190,
    rating: 4.9,
    level: "Beginner",
  },
];

// ---------- SVG icon helper ----------
const Icon = ({ name, size = 20, color = "currentColor", strokeWidth = 1.8 }) => {
  const icons = {
    briefcase: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M2 12h20" />
  </svg>
),

headphones: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <path d="M4 12a8 8 0 0 1 16 0" />
    <rect x="2" y="12" width="4" height="8" rx="2" />
    <rect x="18" y="12" width="4" height="8" rx="2" />
  </svg>
),

graduationCap: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <path d="M22 10L12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
  </svg>
),
    book: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M4 7.5h16M7 4h10l2 3.5v11A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11L7 4Z" />
        <path d="M9 12h6M9 15h4" />
      </svg>
    ),
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    ),
    "user-circle": (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.86 0-7 2.24-7 5v1h14v-1c0-2.76-3.14-5-7-5Z" />
      </svg>
    ),
    grid: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    layers: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    "trending-up": (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    star: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    chevronLeft: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    ),
    chevronRight: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <polyline points="9 6 15 12 9 18" />
      </svg>
    ),
    play: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// ---------- FloatCard: top left ----------
const FloatCardTop = ({ data }) => (
  <div className="absolute left-[-20px] top-[60px] flex items-center gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200/70 z-10">
    <div
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
      style={{ backgroundColor: data.color }}
    >
      <Icon name={data.icon} size={18} color="white" />
    </div>
    <div>
      <p className="text-2xl font-bold leading-none text-slate-800">{data.value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{data.label}</p>
    </div>
  </div>
);

// ---------- FloatCard: bottom left ----------
const FloatCardBottom = ({ type }) => {
  if (type === "instructors") {
    return (
      <div className="absolute bottom-6 left-[-20px] rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200/70 min-w-[220px] z-10">
        <p className="text-base font-semibold text-slate-800 mb-2">Instructor</p>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[
              { initials: "JD", bg: "linear-gradient(135deg,#06b6d4,#0284c7)" },
              { initials: "AM", bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
              { initials: "SK", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
              { initials: "RL", bg: "linear-gradient(135deg,#10b981,#059669)" },
            ].map((a, i) => (
              <span
                key={i}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                style={{ background: a.bg }}
              >
                {a.initials}
              </span>
            ))}
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-cyan-500 text-sm font-bold text-white">
              +
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-cyan-500">200+</p>
            <p className="text-xs font-medium text-slate-500">Instructors</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === "rating") {
    return (
      <div className="absolute bottom-6 left-[-20px] rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200/70 min-w-[200px] z-10">
        <p className="text-base font-semibold text-slate-800 mb-2">Top Rated</p>
        <div className="flex items-center gap-1 mb-1">
          {[...Array(5)].map((_, i) => (
            <Icon key={i} name="star" size={14} color="#f59e0b" />
          ))}
          <span className="ml-1 text-sm font-bold text-slate-800">4.9/5</span>
        </div>
        <p className="text-xs text-slate-400">From 12,400+ student reviews</p>
      </div>
    );
  }

  if (type === "projects") {
    return (
      <div className="absolute bottom-6 left-[-20px] rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200/70 min-w-[180px] z-10">
        <p className="text-base font-semibold text-slate-800 mb-1">Projects Built</p>
        <p className="text-3xl font-bold text-cyan-500 leading-none">50K+</p>
        <p className="text-xs text-slate-400 mt-1">By our graduating students</p>
      </div>
    );
  }

  return null;
};

// ---------- FloatCard: price (right) ----------
const FloatPriceCard = ({ price = 0, originalPrice = 0, discount = 0 }) => {
  const hasDiscount = discount > 0 && originalPrice > price;
  return (
    <div className="absolute right-[-20px] top-[60px] flex items-center gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200/70 z-10">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white bg-indigo-500">
        <Icon name="book" size={18} color="white" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-slate-900">₹{price?.toLocaleString?.("en-IN") || price}</p>
        <div className="flex items-center gap-2">
          {hasDiscount && (
            <span className="text-sm text-slate-400 line-through">₹{originalPrice?.toLocaleString?.("en-IN") || originalPrice}</span>
          )}
          {hasDiscount && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{discount}% OFF</span>
          )}
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500">All pricing</p>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
const HeroSection = () => {
  const navigate = useNavigate();
  const { allCourses } = useContext(AppContext);

  const [searchInput, setSearchInput] = useState("");
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 5500, stopOnInteraction: true })]
  );

  useEffect(() => {
    if (allCourses?.length > 0) {
      setSlides(mapCoursesToSlides(allCourses.slice(0, 3)));

    }
  }, [allCourses]);

  // Track selected slide
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setIsAnimating(true);
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setTimeout(() => setIsAnimating(false), 100);
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSearchHandler = (e) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (query) navigate(`/course-list/${query}`);
  };

  const isVisible = (index) => selectedIndex === index && !isAnimating;
  
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#edf8fb] via-[#f0fafb] to-[#e8f6f9] pt-16 pb-14 md:pt-20 md:pb-20">
      {/* Decorative rings */}
      <div className="pointer-events-none absolute -left-24 top-0 h-[380px] w-[380px] rounded-full border-[3px] border-cyan-200/60" />
      <div className="pointer-events-none absolute -left-16 top-8 h-[300px] w-[300px] rounded-full border-[3px] border-cyan-200/60" />
      <div className="pointer-events-none absolute -left-8 top-16 h-[220px] w-[220px] rounded-full border-[3px] border-cyan-200/60" />

      {/* Embla slider */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, index) => (
            <div key={slide.id} className="flex-[0_0_100%]">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-6 lg:px-12">
                {/* LEFT */}
                <div
                  className={`relative z-10 transition-all duration-700 ${
                    isVisible(index) ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
                  } `}
                >
                  {/* Badge */}
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-4 py-2 shadow-sm">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">{slide.badge}</p>
                  </div>

                  <h1 className="max-w-xl text-4xl font-bold leading-[1.12] text-slate-900 sm:text-5xl lg:text-6xl">
                    {slide.title}{" "}
                    <span className="text-cyan-500">{slide.titleAccent}</span>
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                    {slide.desc}
                  </p>

                  {/* Search */}
                  <form
                    onSubmit={onSearchHandler}
                    className="mt-8 flex h-14 w-full max-w-lg items-center rounded-full bg-white p-1.5 shadow-lg shadow-cyan-900/5 ring-1 ring-cyan-100"
                  >
                    <span className="ml-3 opacity-50">
                      <Icon name="search" size={18} color="#64748b" />
                    </span>
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      type="text"
                      placeholder={slide.searchPlaceholder}
                      className="h-full w-full bg-transparent px-3 text-sm text-slate-600 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-cyan-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 sm:px-9"
                    >
                      Search Now
                    </button>
                  </form>

                  {/* Stat cards */}
                  <div className="mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                    {slide.stats.map((stat, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 rounded-2xl bg-white/75 p-4 ring-1 ring-cyan-100"
                      >
                        <div className="mt-0.5 inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                          <Icon name={stat.icon} size={24} color="#06b6d4" />
                        </div>
                        <div>
                          <p className="text-4xl font-bold tracking-tight text-slate-900">
                            {stat.value}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT */}
                <div
                  className={`relative z-10 flex justify-center transition-all delay-150 duration-700 lg:justify-end ${
                    isVisible(index) ? "translate-x-0 scale-100 opacity-100" : "translate-x-8 scale-95 opacity-0"
                  }`}
                >
                  <div className="relative w-full max-w-[560px]">
                    <div className="bg-slate-900 shadow-lg flex items-center justify-center">
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-auto max-h-[280px] object-contain sm:max-h-[360px]"
                      />
                    </div>

                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-500">
                          {slide.badge}
                        </p>
                        <h3 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                          {slide.title}
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
                          {slide.descMobile}
                        </p>
                      </div>

                      {slide.price > 0 && (
                        <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-600">
                            Price
                          </p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            ₹{slide.price.toLocaleString("en-IN")}
                          </p>
                          {slide.discount > 0 && (
                            <p className="mt-1 text-xs font-semibold text-red-500">
                              {slide.discount}% OFF
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-cyan-100 pt-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Icon
                              key={i}
                              name="star"
                              size={14}
                              color={i < Math.round(slide.rating) ? "#f59e0b" : "#d1d5db"}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {Number(slide.rating).toFixed(1)}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-sm text-slate-500">
                          {slide.enrolledCount > 0 ? `${slide.enrolledCount}+ students` : "New course"}
                        </span>
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold capitalize text-cyan-700">
                          {slide.level}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/course/${slide.id}`)}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                      >
                        Enroll Now
                        <Icon name="play" size={16} color="white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows */}
      <NavArrow direction="left" onClick={scrollPrev} />
      <NavArrow direction="right" onClick={scrollNext} />

      {/* Dots */}
      <SlideDots
        total={FALLBACK_SLIDES.length}
        current={selectedIndex}
        onDotClick={(i) => emblaApi?.scrollTo(i)}
      />
    </section>
  );
};

// ---------- Shared sub-components ----------
const NavArrow = ({ direction, onClick }) => (
  <button
    onClick={onClick}
    aria-label={direction === "left" ? "Previous slide" : "Next slide"}
    className={`absolute top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 shadow-lg backdrop-blur-sm ring-1 ring-cyan-100 text-slate-700 transition hover:bg-white hover:text-cyan-600 hover:scale-110 ${
      direction === "left" ? "left-4 md:left-6" : "right-4 md:right-6"
    }`}
  >
    <Icon name={direction === "left" ? "chevronLeft" : "chevronRight"} size={22} color="currentColor" />
  </button>
);

const SlideDots = ({ total, current, onDotClick }) => (
  <div className="flex justify-center gap-3 pt-6 pb-10 relative z-10">
    {[...Array(total)].map((_, i) => (
      <button
        key={i}
        onClick={() => onDotClick(i)}
        aria-label={`Go to slide ${i + 1}`}
        className={`relative h-2 rounded-full transition-all duration-500 ${
          i === current
            ? "w-8 bg-gradient-to-r from-cyan-500 to-sky-400"
            : "w-2 bg-slate-300 hover:bg-slate-400"
        }`}
      >
        {i === current && (
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-30" />
        )}
      </button>
    ))}
  </div>
);

export default HeroSection;