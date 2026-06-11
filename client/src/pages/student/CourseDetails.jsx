import React, { useContext, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import humanizeDuration from "humanize-duration";
import Footer from "../../components/student/Footer";
import axios from "axios";
import toast from "react-hot-toast";
import {
  CheckCircle, Zap, Crown, BookOpen, Award,
  Play, Lock, Clock, BarChart2, Globe, Infinity, Users,
  ChevronDown, ChevronUp, Star, FileText, Tv, Download,
  Trophy, RefreshCw, Smartphone, ShieldCheck, MessageCircle, X,
} from "lucide-react";
import {
  TIER_UI,
  normalizeTier,
  tierRank,
  findPricingTierRow,
  planKeyFromTier,
  getTierFinalAmount,
} from "../../utils/tierStyles";

const formatDurationFromSeconds = (seconds, largest = 2) => {
  const safeSeconds = Number(seconds) || 0;
  if (safeSeconds <= 0) return "";
  return humanizeDuration(safeSeconds * 1000, {
    units: ["h", "m", "s"],
    largest,
    round: true,
  });
};

/* ══════════════════════════════════════════════════════
   SINGLE VIDEO PLAYER MODAL — rendered once in parent
══════════════════════════════════════════════════════ */
const VideoPlayerModal = ({ loadingPreview, playingVideo, onClose }) => {
  if (!loadingPreview && !playingVideo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-black rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loadingPreview ? (
          <div className="w-full aspect-[16/9] flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-4 border-gray-600 border-t-[#a435f0] rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading preview…</p>
          </div>
        ) : (
          <>
            <div className="relative w-full aspect-[16/9]">
              {playingVideo.useIframe ? (
                <iframe
                  src={playingVideo.embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={playingVideo.title}
                />
              ) : (
                <video
                  autoPlay
                  controls
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                  poster={playingVideo.thumbnail}
                  src={playingVideo.hlsUrl}
                />
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-[#a435f0] border border-[#a435f0] px-1.5 py-0.5 rounded flex-shrink-0">
                  Preview
                </span>
                <p className="text-xs font-medium text-gray-200 truncate">
                  {playingVideo.title}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   SIDE CARD  (reused inline + sticky)
   No video player here — just thumbnail trigger
══════════════════════════════════════════════════════ */
const SideCard = ({
  courseData,
  handleThumbnailPlay,
  isAlreadyEnrolled,
  hasPlatinumAccess,
  currentTierUpper,
  selectedPlan,
  setSelectedPlan,
  hasMultipleTiers,
  isPlatinumFeaturesMode,
  platinumFeatures,
  currency,
  getPrice,
  getOriginalPrice,
  getDiscount,
  enrollCourse,
  totalLectures,
  totalSections,
  availablePlanKeys,
}) => {
  const selectedPlanLabel = selectedPlan === "platinum"
    ? "Video (Watch Only) + Notes (Download)"
    : selectedPlan === "gold"
      ? "Video (Watch Only) + Notes (Read Only)"
      : "Notes (Read Only Online)";

  const allPlanKeys = ["basic", "gold", "platinum"];
  const currentTier = normalizeTier(currentTierUpper || "BASIC");
  const selectedTier = normalizeTier(selectedPlan || "BASIC");
  const hasSelectedTier = isAlreadyEnrolled && tierRank(currentTier) >= tierRank(selectedTier);
  const isUpgradeTier = isAlreadyEnrolled && tierRank(selectedTier) > tierRank(currentTier);
  const showPriceForSelectedTier = !isAlreadyEnrolled || isUpgradeTier;

  // When upgrading, show only the delta (additional amount) instead of full target price
  const currentPlanKey = planKeyFromTier(currentTierUpper || currentTier);
  const currentFinalAmount = getTierFinalAmount(courseData, currentPlanKey) ?? 0;
  const targetFinalAmount = getTierFinalAmount(courseData, selectedPlan) ?? 0;
  const upgradeDelta = Math.max(0, Math.round(targetFinalAmount - currentFinalAmount));
  const displayIsUpgrade = isUpgradeTier;
  const displayPriceValue = displayIsUpgrade ? upgradeDelta : (getTierFinalAmount(courseData, selectedPlan) ?? 0);

  const getPrimaryLabel = () => {
    if (hasSelectedTier) return "Go to Course";
    if (selectedPlan === "platinum") return isAlreadyEnrolled ? "Upgrade to Platinum" : "Get Platinum";
    if (selectedPlan === "gold") return isAlreadyEnrolled ? "Upgrade to Gold" : "Get Gold";
    return isAlreadyEnrolled ? "Upgrade to Basic" : "Get Basic";
  };

  const handlePrimaryAction = () => {
    enrollCourse(selectedPlan);
  };

  return (
    <>
      {/* Thumbnail — always shown, click opens modal */}
      <div
        className="relative w-full aspect-[16/9] cursor-pointer group"
        onClick={handleThumbnailPlay}
      >
        <img
          src={courseData.thumbnail || "https://via.placeholder.com/800x450?text=Course+Preview"}
          alt="thumbnail"
          className="w-full h-full object-cover rounded-t-lg"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <Play size={22} className="ml-1 text-gray-900 fill-gray-900" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-2">
          <p className="text-white text-xs font-semibold tracking-wide">Preview this course</p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Price */}
        {showPriceForSelectedTier && (
          <div className="mb-4">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-black text-gray-900">
                {currency}{displayPriceValue.toLocaleString("en-IN")}
              </span>
              {/* When showing upgrade delta, don't show full original/struck price or discount */}
              {!displayIsUpgrade && getDiscount() > 0 && (
                <span className="text-base text-gray-400 line-through">
                  {currency}{getOriginalPrice()}
                </span>
              )}
              {!displayIsUpgrade && getDiscount() > 0 && (
                <span className="text-sm font-bold text-red-600">{getDiscount()}% off</span>
              )}
            </div>
            {!displayIsUpgrade && getDiscount() > 0 && (
              <p className="text-xs font-semibold text-red-600">
                🔥 <span className="text-gray-700 font-bold">{getDiscount()} hours</span> left at this price!
              </p>
            )}
            {displayIsUpgrade && (
              <p className="text-xs text-gray-500 font-semibold">
                Pay additional amount to upgrade
              </p>
            )}
          </div>
        )}

        {/* Enrolled badge */}
        {isAlreadyEnrolled && (
          <div
            className={`mb-4 p-3 rounded-md flex items-center gap-3 border ${
              TIER_UI[normalizeTier(currentTierUpper)]?.card || "bg-slate-50 border-slate-200"
            }`}
          >
            <Crown size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p
                className={`text-sm font-bold ${
                  TIER_UI[normalizeTier(currentTierUpper)]?.text || "text-gray-900"
                }`}
              >
                {TIER_UI[normalizeTier(currentTierUpper)]?.label || "Gold"} access
              </p>
              <p className="text-xs text-gray-500">You're enrolled</p>
            </div>
          </div>
        )}

        {/* Plan toggle */}
        {hasMultipleTiers && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Choose Plan
            </p>
            <div
              className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden text-[11px] sm:text-xs font-bold border border-gray-200"
            >
              {allPlanKeys.map((key) => {
                const ui = TIER_UI[normalizeTier(key)];
                const active = selectedPlan === key;
                const isAvailable = availablePlanKeys?.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => isAvailable && setSelectedPlan(key)}
                    disabled={!isAvailable}
                    className={`py-2.5 px-1 transition-colors text-center leading-tight ${
                      !isAvailable
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : active
                          ? ui.selectActive
                          : ui.selectInactive
                    }`}
                  >
                    {ui.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handlePrimaryAction}
          className="w-full py-3.5 rounded font-bold text-white text-sm shadow transition-all hover:opacity-90 active:scale-[.98] mb-3 flex items-center justify-center gap-2 bg-[#a435f0]"
        >
          {hasSelectedTier ? (
            <><BookOpen size={16} /> {getPrimaryLabel()}</>
          ) : selectedPlan === "platinum" ? (
            <><Crown size={16} /> {getPrimaryLabel()}</>
          ) : selectedPlan === "gold" ? (
            <><Zap size={16} /> {getPrimaryLabel()}</>
          ) : (
            <><BookOpen size={16} /> {getPrimaryLabel()}</>
          )}
        </button>

        {/* Course includes */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-3">This course includes:</p>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle size={15} className="text-gray-500 flex-shrink-0" />
              {totalSections} sections
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <FileText size={15} className="text-gray-500 flex-shrink-0" />
              {totalLectures} lectures
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <BookOpen size={15} className="text-gray-500 flex-shrink-0" />
              {selectedPlanLabel}
            </li>
          </ul>
        </div>

        {/* Premium extras */}
        {isPlatinumFeaturesMode && platinumFeatures.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-1.5">
              <Crown size={14} /> Platinum benefits
            </p>
            <ul className="space-y-2">
              {platinumFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={13} className="text-cyan-600 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState(null);
  const [openSections, setOpenSections] = useState({ 0: true });
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [hasPlatinumAccess, setHasPlatinumAccess] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [showAllSections, setShowAllSections] = useState(false);
  const [courseFeedback, setCourseFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const {
    calculateRating, currency, backendUrl, userData,
    getToken, fetchUserData, fetchUserEnrolledCourses,
  } = useContext(AppContext);

  const fetchCourseData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/course/" + id);
      if (data.success) setCourseData(data.course);
      else toast.error(data.message);
    } catch (e) { toast.error(e.message); }
  };

  const fetchCourseFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const { data } = await axios.get(`${backendUrl}/api/course/${id}/feedback`);
      if (data.success) setCourseFeedback(data.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
    fetchCourseFeedback();
  }, []);

  useEffect(() => {
    if (!courseData?.pricingTiers) return;
    const keys = ["basic", "gold", "platinum"].filter((pk) => findPricingTierRow(courseData, pk));
    if (keys.length && !keys.includes(selectedPlan)) setSelectedPlan(keys[0]);
  }, [courseData?._id]);

  useEffect(() => {
    if (userData && courseData) {
      const enrolled = userData.enrolledCourses?.includes(courseData._id);
      const platinum = userData.premiumCourses?.includes(courseData._id);
      setIsAlreadyEnrolled(enrolled);
      setHasPlatinumAccess(platinum);
      if (enrolled && userData.tierByCourse?.[courseData._id]) {
        setSelectedPlan(planKeyFromTier(userData.tierByCourse[courseData._id]));
      }
    }
  }, [userData, courseData]);

  // Close modal on unmount
  useEffect(() => {
    return () => setPlayingVideo(null);
  }, []);

  const openRazorpay = (data, paymentType = "purchase") => {
    const options = {
      key: data.razorpayKey,
      amount: data.amount * 100,
      currency: data.currency,
      order_id: data.order_id,
      name: "Your LMS",
      description: `${selectedPlan} access – ${courseData.title}`,
      handler: async (response) => {
        try {
          const token = await getToken();
          const v = await axios.post(
            backendUrl + "/api/user/verify-payment",
            {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              type: paymentType,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (v.data.success) {
            toast.success("Enrollment successful!");
            await Promise.all([fetchCourseData(), fetchUserData(), fetchUserEnrolledCourses()]);
          } else {
            toast.error("Payment verification failed.");
          }
        } catch { toast.error("Payment verification failed."); }
      },
      prefill: { name: userData?.firstName || "Student", email: userData?.email || "" },
      theme: { color: "#a435f0" },
    };
    new (window).Razorpay(options).open();
  };

  const enrollCourse = async (planOverride) => {
    const plan = planOverride || selectedPlan;
    const targetUpper = normalizeTier(
      plan === "basic" ? "BASIC" : plan === "gold" ? "GOLD" : "PLATINUM"
    );
    try {
      if (!userData) return toast.warn("Login to Enroll");
      if (isAlreadyEnrolled) {
        const current = normalizeTier(userData.tierByCourse?.[courseData._id] || "GOLD");
        if (tierRank(targetUpper) <= tierRank(current)) {
          return navigate("/my-enrollments");
        }
        const token = await getToken();
        const { data } = await axios.post(
          backendUrl + "/api/user/upgrade",
          { courseId: courseData._id, targetTier: targetUpper },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!data.success) {
          alert(data.message);
          return;
        }
        openRazorpay(data, "upgrade");
        return;
      }
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/purchase",
        { courseId: courseData._id, planType: targetUpper },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data.success) {
        alert(data.message);
        return;
      }
      openRazorpay(data, "purchase");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const isFreeCheck = (l) => !!(l.isFreePreview || l.isFree || l.isPreview || l.freePreview);

  const handlePreviewClick = async (lecture) => {
    if (!isFreeCheck(lecture)) return;
    setLoadingPreview(true);
    setPlayingVideo(null); // open modal immediately in loading state
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/media/playback-url/preview/${lecture.lectureId}`
      );
      if (data.success) {
        setPlayingVideo({
          embedUrl: data.embedUrl || null,
          hlsUrl: data.playbackUrl || null,
          title: lecture.lectureTitle,
          thumbnail: data.thumbnailUrl,
          useIframe: Boolean(data.embedUrl),
        });
      } else {
        toast.error(data.error || "Failed to load preview");
      }
    } catch { toast.error("Failed to load video preview"); }
    finally { setLoadingPreview(false); }
  };

  const handleThumbnailPlay = () => {
    for (const ch of courseData.courseContent || [])
      for (const l of ch.chapterContent || [])
        if (isFreeCheck(l)) { handlePreviewClick(l); return; }
    toast.info("No free preview lectures available");
  };

  const closeModal = () => {
    setPlayingVideo(null);
    setLoadingPreview(false);
  };

  const toggleSection = (i) => setOpenSections((p) => ({ ...p, [i]: !p[i] }));
  const getPrice = () => getTierFinalAmount(courseData, selectedPlan) ?? 0;
  const getOriginalPrice = () => findPricingTierRow(courseData, selectedPlan)?.price ?? 0;
  const getDiscount = () => findPricingTierRow(courseData, selectedPlan)?.discount ?? 0;
  const availablePlanKeys = ["basic", "gold", "platinum"].filter((pk) =>
    findPricingTierRow(courseData, pk)
  );
  const hasMultipleTiers = availablePlanKeys.length > 0;
  const getTotalLectures = () => courseData.courseContent?.reduce((a, c) => a + (c.chapterContent?.length || 0), 0) || 0;
  const getTotalDuration = () => {
    let t = 0;
    courseData.courseContent?.forEach((c) => c.chapterContent?.forEach((l) => { t += l.lectureDuration || 0; }));
    return t;
  };

  if (!courseData) return <Loading />;

  const rating = calculateRating(courseData);
  const platinumRow = findPricingTierRow(courseData, "platinum");
  const isPlatinumFeaturesMode =
    Boolean(platinumRow?.features?.length) &&
    (isAlreadyEnrolled ? hasPlatinumAccess : selectedPlan === "platinum");
  const platinumFeatures = platinumRow?.features || [];
  const currentTierUpper = userData?.tierByCourse?.[courseData._id] || "GOLD";

  const totalLectures = getTotalLectures();
  const totalDurationSecs = getTotalDuration();
  const totalSections = courseData.courseContent?.length || 0;
  const visibleSections = showAllSections
    ? courseData.courseContent
    : courseData.courseContent?.slice(0, 5);

  // Props shared by both SideCard instances
  const cardProps = {
    courseData,
    handleThumbnailPlay,
    isAlreadyEnrolled,
    hasPlatinumAccess,
    currentTierUpper,
    selectedPlan,
    setSelectedPlan,
    hasMultipleTiers,
    availablePlanKeys,
    isPlatinumFeaturesMode,
    platinumFeatures,
    currency,
    getPrice,
    getOriginalPrice,
    getDiscount,
    enrollCourse,
    totalLectures,
    totalSections,
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── SINGLE VIDEO PLAYER MODAL (rendered once for the whole page) ── */}
      <VideoPlayerModal
        loadingPreview={loadingPreview}
        playingVideo={playingVideo}
        onClose={closeModal}
      />

      {/* ── DARK HERO ── */}
      <div className="bg-[#1c1d1f] text-white">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 min-[900px]:pr-[380px] py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">{courseData.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-3">
            {rating > 0 && (
              <>
                <span className="font-bold text-[#f69c08]">{Number(rating).toFixed(1)}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={13}
                      className={
                        i <= Math.round(rating)
                          ? "fill-[#f69c08] text-[#f69c08]"
                          : "fill-gray-500 text-gray-500"
                      }
                    />
                  ))}
                </div>
                <span className="text-purple-300 text-xs">({courseData.totalReviews || 0} ratings)</span>
              </>
            )}
            <span className="flex items-center gap-1 text-purple-300 text-xs">
              <Users size={13} />{courseData.enrollmentCount || 0} students
            </span>
          </div>
          <p className="text-xs text-purple-300 mb-4">
            Created by{" "}
            <span className="text-purple-200 underline cursor-pointer hover:text-white">
              {courseData.instructorId?.firstName} {courseData.instructorId?.lastName || ""}
            </span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-purple-300">
            <span className="flex items-center gap-1.5">
              <BarChart2 size={12} /><span className="capitalize">{courseData.level || "All levels"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {totalDurationSecs > 0
                ? `${formatDurationFromSeconds(totalDurationSecs)} total`
                : `${totalLectures} lectures`}
            </span>
            <span className="flex items-center gap-1.5"><Globe size={12} />English</span>
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} />
              Last updated{" "}
              {new Date(courseData.createdAt).toLocaleDateString("en-US", {
                month: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex flex-col min-[900px]:flex-row gap-8 lg:gap-12">

          {/* ── LEFT CONTENT ── */}
          <div className="flex-1 min-w-0">

            {/* Inline card — mobile only (below 900px) */}
            <div className="min-[900px]:hidden mb-8 shadow-xl border border-gray-200 rounded-lg overflow-hidden max-w-md mx-auto">
              <SideCard {...cardProps} />
            </div>

            {/* Course content */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Course content</h2>
              <p className="text-sm text-gray-500 mb-4">
                {totalSections} sections • {totalLectures} lectures
                {totalDurationSecs > 0 &&
                  ` • ${formatDurationFromSeconds(totalDurationSecs)} total length`}
              </p>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {visibleSections?.map((chapter, index) => {
                  const chDur = chapter.chapterContent?.reduce(
                    (a, l) => a + (l.lectureDuration || 0), 0
                  );
                  const isOpen = openSections[index];
                  return (
                    <div key={index} className="border-b border-gray-200 last:border-b-0">
                      <button
                        onClick={() => toggleSection(index)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-[#f7f9fa] hover:bg-[#eef0f2] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isOpen
                            ? <ChevronUp size={16} className="text-gray-600 flex-shrink-0" />
                            : <ChevronDown size={16} className="text-gray-600 flex-shrink-0" />}
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {chapter.chapterTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 ml-4 text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                          <span>{chapter.chapterContent?.length} lectures</span>
                          {chDur > 0 && (
                            <span>
                              {formatDurationFromSeconds(chDur)}
                            </span>
                          )}
                        </div>
                      </button>
                      {isOpen && (
                        <ul className="divide-y divide-gray-100">
                          {chapter.chapterContent?.map((lecture, i) => {
                            const isFree = isFreeCheck(lecture);
                            return (
                              <li
                                key={i}
                                onClick={() => isFree && handlePreviewClick(lecture)}
                                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                                  isFree ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
                                }`}
                              >
                                {isFree
                                  ? <Play size={14} className="text-[#5624d0] flex-shrink-0" />
                                  : <Lock size={14} className="text-gray-400 flex-shrink-0" />}
                                <div className="flex items-center justify-between w-full gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`truncate text-sm ${
                                        isFree
                                          ? "text-[#5624d0] hover:underline"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {lecture.lectureTitle}
                                    </span>
                                    {isFree && (
                                      <span className="flex-shrink-0 text-[10px] font-bold text-[#5624d0] border border-[#5624d0] px-1.5 py-0.5 rounded">
                                        Preview
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {lecture.lectureDuration
                                      ? formatDurationFromSeconds(lecture.lectureDuration)
                                      : "—"}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              {courseData.courseContent?.length > 5 && (
                <button
                  onClick={() => setShowAllSections((v) => !v)}
                  className="mt-4 w-full py-3 border-2 border-gray-800 text-gray-800 font-bold text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  {showAllSections
                    ? "Show less"
                    : `Show all ${courseData.courseContent.length} sections`}
                </button>
              )}
            </section>

            {/* Description */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
              <div
                className="text-sm text-gray-700 leading-relaxed rich-text prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: courseData.description || "No description available." }}
              />
            </section>

            {/* Instructor */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Instructor</h2>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#5624d0] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 select-none">
                  {(courseData.instructorId?.firstName || "I")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[#5624d0] hover:underline cursor-pointer text-base">
                    {courseData.instructorId?.firstName} {courseData.instructorId?.lastName || ""}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">Course Instructor</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                    {rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-[#f69c08] text-[#f69c08]" />
                        {Number(rating).toFixed(1)} Instructor Rating
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={12} />{courseData.enrollmentCount || 0} Students
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />1 Course
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Student Feedback */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Student Feedback</h2>
              {loadingFeedback ? (
                <div className="text-center py-8">
                  <div className="w-7 h-7 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading feedback...</p>
                </div>
              ) : courseFeedback.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <MessageCircle size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium text-sm">No feedback yet</p>
                  <p className="text-gray-400 text-xs mt-1">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courseFeedback.map((feedback, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{feedback.studentName}</p>
                          <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={
                                  star <= feedback.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(feedback.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <p className="text-gray-900 text-sm leading-relaxed">{feedback.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* ── STICKY SIDEBAR — desktop (900px+) ── */}
          <div className="hidden min-[900px]:block w-[340px] flex-shrink-0">
            <div className="sticky top-20 shadow-2xl border border-gray-200 rounded-lg overflow-hidden bg-white -mt-48 z-10 transition-all">
              <SideCard {...cardProps} />
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CourseDetails;