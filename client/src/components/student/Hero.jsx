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

function mapCoursesToSlides(courses) {
  return courses.map((course) => {
    const tiers = course.pricingTiers || [];
    const displayTier =
      tiers.find((t) => t.tier === "basic") ||
      tiers.find((t) => t.tier === "gold" || t.tier === "standard");
    const price = displayTier?.price || 0;
    const discount = displayTier?.discount || 0;
    const finalPrice = discount > 0 ? price - (price * discount) / 100 : price;
    const description = course.description || course.subtitle || "";
    return {
      id: course._id,
      title: course.title,
      descDesktop:
        stripHtml(description).slice(0, 180) +
        (description.length > 180 ? "..." : ""),
      descMobile:
        stripHtml(description).slice(0, 90) +
        (description.length > 90 ? "..." : ""),
      image: course.thumbnail,
      price: finalPrice,
      originalPrice: price,
      discount,
      enrolledCount: course.enrollmentCount || 0,
      rating: course.rating || course.averageRating || 0,
      level: course.level || "All Levels",
    };
  });
}

// ---------- static fallback slides (shown when API has no data) ----------
const FALLBACK_SLIDES = [
  {
    id: "slide-1",
    badge: "Welcome to Online Education",
    title: "Start learning from the world's",
    titleAccent: "best sites",
    desc: "Learn with premium courses, practical projects, and top instructors. Search your next skill and start building your career today.",
    searchPlaceholder: "Search courses… e.g. React",
    stats: [
      { icon: "book", value: "9.5K+", label: "Active students taking gifted courses" },
      { icon: "user", value: "15.5K+", label: "Total enrolled across all courses" },
    ],
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    floatTop: { icon: "user-circle", value: "150K", label: "Assisted Students", color: "#06b6d4" },
    floatBottom: "instructors",
  },
  {
    id: "slide-2",
    badge: "Design & Development Tracks",
    title: "Master design & code with",
    titleAccent: "expert guidance",
    desc: "From UI/UX fundamentals to advanced React — our curated tracks guide you from beginner to job-ready in weeks, not years.",
    searchPlaceholder: "Try 'UI Design' or 'JavaScript'",
    stats: [
      { icon: "grid", value: "340+", label: "Premium curated courses available" },
      { icon: "layers", value: "48+", label: "Learning paths across disciplines" },
    ],
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80",
    floatTop: { icon: "grid", value: "340+", label: "Courses Available", color: "#8b5cf6" },
    floatBottom: "rating",
  },
  {
    id: "slide-3",
    badge: "Career Outcomes",
    title: "Build real projects, land your",
    titleAccent: "dream job",
    desc: "Every course includes hands-on projects reviewed by industry mentors. Graduate with a portfolio that stands out to top employers.",
    searchPlaceholder: "Try 'Python' or 'Data Science'",
    stats: [
      { icon: "trending-up", value: "92%", label: "Job placement rate within 6 months" },
      { icon: "users", value: "200+", label: "Expert mentors and instructors" },
    ],
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    floatTop: { icon: "trending-up", value: "92%", label: "Job Placement Rate", color: "#10b981" },
    floatBottom: "projects",
  },
];

// ---------- SVG icon helper ----------
const Icon = ({ name, size = 20, color = "currentColor", strokeWidth = 1.8 }) => {
  const icons = {
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

// ---------- Main Component ----------
const HeroSection = () => {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const [searchInput, setSearchInput] = useState("");
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCourseMode, setIsCourseMode] = useState(false); // true when API data loaded

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 5500, stopOnInteraction: true })]
  );

  // Fetch courses from API
  useEffect(() => {
    if (!backendUrl) return;
    fetch(`${backendUrl}/api/course/all`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.courses?.length > 0) {
          setSlides(mapCoursesToSlides(data.courses.slice(0, 3)));
          setIsCourseMode(true);
        }
      })
      .catch((err) => console.error("Hero fetch error:", err));
  }, [backendUrl]);

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

  // ---------- COURSE MODE: dynamic slides from API ----------
  if (isCourseMode) {
    return (
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-cyan-50 via-sky-50 to-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute top-16 left-8 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 right-8 h-96 w-96 rounded-full bg-sky-200/25 blur-3xl" />

        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {slides.map((slide, index) => (
              <div key={slide.id} className="flex-[0_0_100%]">
                <div className="mx-auto grid min-h-[580px] w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 sm:px-8 md:pt-24 md:pb-20 lg:grid-cols-2 lg:gap-8 lg:px-12">
                  {/* LEFT */}
                  <div
                    className={`space-y-5 transition-all duration-700 ${
                      isVisible(index) ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
                    } items-start text-left`}
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                      </span>
                      <span className="text-sm font-semibold text-cyan-700 tracking-wide">
                        Featured Course
                      </span>
                    </div>

                    <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                      {slide.title.split(" ").slice(0, 3).join(" ")}{" "}
                      <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">
                        {slide.title.split(" ").slice(3).join(" ")}
                      </span>
                    </h1>

                    <p className="hidden max-w-xl text-base leading-7 text-slate-500 sm:text-lg md:block">
                      {slide.descDesktop}
                    </p>
                    <p className="max-w-sm text-sm leading-relaxed text-slate-500 md:hidden">
                      {slide.descMobile}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Icon
                            key={i}
                            name="star"
                            size={14}
                            color={i < Math.round(slide.rating) ? "#f59e0b" : "#d1d5db"}
                          />
                        ))}
                        <span className="ml-1 font-semibold text-slate-700">
                          {Number(slide.rating).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <span>
                        {slide.enrolledCount > 0 ? slide.enrolledCount : "New"} students
                      </span>
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold capitalize text-cyan-700">
                        {slide.level}
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <button
                        onClick={() => navigate(`/course/${slide.id}`)}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                      >
                        Enroll Now
                        <Icon name="play" size={16} color="white" />
                      </button>
                      <button
                        onClick={() => navigate(`/course/${slide.id}`)}
                        className="flex items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-cyan-600"
                      >
                        Learn More
                        <Icon name="chevronRight" size={16} color="currentColor" />
                      </button>
                    </div>

                    {/* Price */}
                    {slide.price > 0 && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-3xl font-bold text-slate-900">
                          ₹{slide.price.toLocaleString("en-IN")}
                        </span>
                        {slide.discount > 0 && (
                          <>
                            <span className="text-lg text-slate-400 line-through">
                              ₹{slide.originalPrice.toLocaleString("en-IN")}
                            </span>
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                              {slide.discount}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT */}
                  <div
                    className={`flex justify-center transition-all delay-150 duration-700 lg:justify-end ${
                      isVisible(index) ? "translate-x-0 scale-100 opacity-100" : "translate-x-8 scale-95 opacity-0"
                    }`}
                  >
                    <div className="group relative w-full max-w-md lg:max-w-lg">
                      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-cyan-300/30 to-sky-300/30 blur-2xl transition-all group-hover:blur-3xl" />
                      <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/50">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-transform hover:scale-110">
                            <Icon name="play" size={22} color="#06b6d4" />
                          </div>
                        </div>
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
        <SlideDots total={slides.length} current={selectedIndex} onDotClick={(i) => emblaApi?.scrollTo(i)} />
      </section>
    );
  }

  // ---------- STATIC FALLBACK MODE ----------
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#edf8fb] via-[#f0fafb] to-[#e8f6f9] pt-16 pb-14 md:pt-20 md:pb-20">
      {/* Decorative rings */}
      <div className="pointer-events-none absolute -left-24 top-0 h-[380px] w-[380px] rounded-full border-[3px] border-cyan-200/60" />
      <div className="pointer-events-none absolute -left-16 top-8 h-[300px] w-[300px] rounded-full border-[3px] border-cyan-200/60" />
      <div className="pointer-events-none absolute -left-8 top-16 h-[220px] w-[220px] rounded-full border-[3px] border-cyan-200/60" />

      {/* Embla slider */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {FALLBACK_SLIDES.map((slide, index) => (
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
                    {/* Main image */}
                    <div className="overflow-hidden rounded-bl-[80px] rounded-tl-[80px] rounded-tr-[16px] rounded-br-[16px] bg-white/60 p-1.5 shadow-xl ring-1 ring-cyan-100">
                      <img
                        src={slide.image}
                        alt="Learning"
                        className="h-[420px] w-full rounded-bl-[72px] rounded-tl-[72px] rounded-tr-[12px] rounded-br-[12px] object-cover sm:h-[500px]"
                      />
                    </div>

                    {/* Top float card */}
                    <FloatCardTop data={slide.floatTop} />

                    {/* Bottom float card */}
                    <FloatCardBottom type={slide.floatBottom} />
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