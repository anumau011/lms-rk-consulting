import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Play, ChevronLeft, ChevronRight, Star, Users, Clock } from "lucide-react";
import { AppContext } from "../../context/AppContext";

// -------- helpers ----------
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "");
}

function mapCoursesToSlides(courses) {
  return courses.map(course => {
    // Get pricing from pricingTiers
    const tiers = course.pricingTiers || [];
    const displayTier =
      tiers.find((t) => t.tier === "basic") ||
      tiers.find((t) => t.tier === "gold" || t.tier === "standard");
    const price = displayTier?.price || 0;
    const discount = displayTier?.discount || 0;
    
    // Calculate final price with discount
    const finalPrice = discount > 0 ? price - (price * discount / 100) : price;
    
    const description = course.description || course.subtitle || "";
    
    return {
      id: course._id,
      title: course.title,
      descDesktop: stripHtml(description).slice(0, 180) + (description.length > 180 ? "..." : ""),
      descMobile: stripHtml(description).slice(0, 90) + (description.length > 90 ? "..." : ""),
      image: course.thumbnail,
      price: finalPrice,
      originalPrice: price,
      discount: discount,
      enrolledCount: course.enrollmentCount || 0,
      rating: course.rating || course.averageRating || 0,
      level: course.level || 'All Levels'
    };
  });
}

export default function HeroSlider() {
  const [slides, setSlides] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
 const { backendUrl } = useContext(AppContext);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 6000, stopOnInteraction: true })]
  );

  // fetch courses
  useEffect(() => {
    fetch(backendUrl+"/api/course/all")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.courses && data.courses.length > 0) {
          setSlides(mapCoursesToSlides(data.courses.slice(0, 4)));
        }
      })
      .catch(err => console.error("Hero slider error:", err));
  }, [backendUrl]);

  // slider state
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

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  if (!slides.length) {
    return (
      <div className="w-full bg-gradient-to-b from-cyan-100/70 to-white min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading featured courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-b from-cyan-100/70 via-cyan-50/50 to-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/20 to-cyan-100/20 rounded-full blur-3xl"></div>
      
      {/* Floating shapes */}
      <div className="absolute top-32 right-1/4 w-4 h-4 bg-blue-400/40 rounded-full animate-bounce delay-300"></div>
      <div className="absolute top-48 left-1/4 w-3 h-3 bg-cyan-400/40 rounded-full animate-bounce delay-500"></div>
      <div className="absolute bottom-32 left-1/3 w-5 h-5 bg-blue-300/40 rounded-full animate-bounce delay-700"></div>

      {/* SLIDER */}
      <div ref={emblaRef} className="overflow-hidden relative z-10">
        <div className="flex">
          {slides.map((slide, index) => (
            <div key={slide.id} className="flex-[0_0_100%]">
              <div className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-20 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center min-h-[600px]">

                {/* LEFT CONTENT */}
                <div className={`space-y-6 text-center md:text-left transition-all duration-700 ${
                  selectedIndex === index && !isAnimating
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 -translate-x-8'
                }`}>
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-blue-100 rounded-full px-4 py-2 shadow-sm">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-sm font-semibold text-blue-600 tracking-wide">
                      Featured Course
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    {slide.title.split(" ").slice(0, 3).join(" ")}{" "}
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {slide.title.split(" ").slice(3).join(" ")}
                    </span>
                  </h1>

                  {/* Description */}
                  <p className="hidden md:block text-gray-600 text-lg max-w-xl leading-relaxed">
                    {slide.descDesktop}
                  </p>
                  <p className="md:hidden text-gray-600 max-w-sm mx-auto leading-relaxed">
                    {slide.descMobile}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-center md:justify-start gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < Math.round(slide.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"} />
                        ))}
                      </div>
                      <span className="font-medium text-gray-700">{Number(slide.rating).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={16} className="text-blue-500" />
                      <span>{slide.enrolledCount > 0 ? slide.enrolledCount : 'New'} students</span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-2">
                    <Link 
                      to={`/course/${slide.id}`}
                      className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-full font-semibold shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 overflow-hidden"
                    >
                      <span className="relative z-10">Enroll Now</span>
                      <Play size={18} className="relative z-10 fill-white" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </Link>
                    <Link 
                      to={`/course/${slide.id}`}
                      className="group flex items-center gap-2 text-gray-700 font-semibold hover:text-blue-600 transition-colors"
                    >
                      <span>Learn More</span>
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {/* Price Tag */}
                  {slide.price > 0 && (
                    <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        ₹{slide.price.toLocaleString('en-IN')}
                      </span>
                      {slide.discount > 0 && (
                        <>
                          <span className="text-lg text-gray-400 line-through">
                            ₹{slide.originalPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                            {slide.discount}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT IMAGE */}
                <div className={`flex justify-center md:justify-end transition-all duration-700 delay-150 ${
                  selectedIndex === index && !isAnimating
                    ? 'opacity-100 translate-x-0 scale-100' 
                    : 'opacity-0 translate-x-8 scale-95'
                }`}>
                  <div className="relative group">
                    {/* Glow effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-2xl blur-2xl group-hover:blur-3xl transition-all opacity-70 group-hover:opacity-100"></div>
                    
                    {/* Main image */}
                    <div className="relative">
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full max-w-xs md:max-w-md lg:max-w-lg rounded-2xl shadow-2xl object-cover aspect-video ring-1 ring-white/50 group-hover:scale-[1.02] transition-transform duration-500"
                      />
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                          <Play size={24} className="text-blue-600 fill-blue-600 ml-1" />
                        </div>
                      </div>

                      {/* Floating card */}
                      <div className="absolute -bottom-4 -left-4 md:-left-8 bg-white rounded-xl shadow-lg p-4 flex items-center gap-3 animate-float">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Star size={20} className="text-white fill-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Level</p>
                          <p className="font-bold text-gray-900 capitalize">{slide.level}</p>
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

      {/* Navigation Arrows */}
      <button 
        onClick={scrollPrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-white hover:text-blue-600 hover:scale-110 transition-all"
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-white hover:text-blue-600 hover:scale-110 transition-all"
      >
        <ChevronRight size={24} />
      </button>

      {/* DOTS / Progress Indicators */}
      <div className="flex justify-center gap-3 pb-12 relative z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi && emblaApi.scrollTo(index)}
            className={`relative h-2 rounded-full transition-all duration-500 ${
              index === selectedIndex
                ? "w-8 bg-gradient-to-r from-blue-600 to-cyan-500"
                : "w-2 bg-gray-300 hover:bg-gray-400"
            }`}
          >
            {index === selectedIndex && (
              <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></span>
            )}
          </button>
        ))}
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
