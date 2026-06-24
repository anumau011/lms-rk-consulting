import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams, Link } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import Footer from "../../components/student/Footer";
import FeedbackModal from "../../components/student/FeedbackModal";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "../../components/student/Loading";
import {
  Play, CheckCircle, ChevronDown, ChevronUp, FileText, BookOpen,
  MessageCircle, X, ChevronLeft,
  Download, Crown, PanelRightClose, PanelRightOpen,
  Eye,
} from "lucide-react";
import { normalizeTier, tierUi } from "../../utils/tierStyles";
import PdfViewer from "./PdfViewer"
const Player = () => {
  const {
    enrolledCourses,
    calculateChapterTime,
    backendUrl,
    getToken,
    userData,
    fetchUserEnrolledCourses,
  } = useContext(AppContext);
  const { courseId } = useParams();

  const [courseData, setCourseData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState(null);

  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Feedback Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackInitial, setFeedbackInitial] = useState({ rating: 0, comment: "" });

  // Video Playback States
  const [videoUrl, setVideoUrl] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const latestVideoRequestIdRef = useRef(0);
  const notesRef = useRef(null);

  // PDF View States
  const [pdfState, setPdfState] = useState({
    loading: false,
    url: null,
    title: "",
  });

  // Notes States
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const getCourseData = () => {
    const matchedCourse = enrolledCourses.find((course) => course._id === courseId);
    if (!matchedCourse) return;
    setCourseData(matchedCourse);
  };
  useEffect(() => {
    if (enrolledCourses.length > 0) getCourseData();
  }, [enrolledCourses]);

  const tierUpper = userData?.tierByCourse?.[courseId]
    ? normalizeTier(userData.tierByCourse[courseId])
    : "GOLD";
  const canWatchVideo = tierUpper === "GOLD" || tierUpper === "PLATINUM";
  const isPlatinum = tierUpper === "PLATINUM";

  const getCourseProgress = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/get-course-progress",
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setProgressData(data.progressData);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    getCourseProgress();
  }, []);

  const toggleSection = (index) => {
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const markLectureAsCompleted = async (lectureId) => {
    if (!lectureId) {
      toast.error("No lecture selected");
      return;
    }
    if (!canWatchVideo) {
      toast.error("Mark complete is available on Gold and Platinum plans");
      return;
    }

    if (completedLectureIds.has(String(lectureId))) {
      toast.info("Lecture already marked as completed");
      return;
    }

    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/v1/progress/${lectureId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || "Lecture marked as completed");
        getCourseProgress();
      } else {
        toast.error(data.message || data.error || "Failed to update progress");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to update progress");
    }
  };

  const withAutoplayDisabled = (rawUrl) => {
    if (!rawUrl) return rawUrl;

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      parsed.searchParams.set("autoplay", "0");
      parsed.searchParams.set("muted", "0");
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  };

  const selectLecture = (lecture, chapterIndex, lectureIndex) => {
    // Force current iframe to unmount so previous audio cannot continue in background.
    setVideoUrl(null);
    setPlayerData({
      ...lecture,
      chapter: chapterIndex + 1,
      lecture: lectureIndex + 1,
    });
  };


  const fetchVideoUrl = async (lectureId) => {
    const requestId = Date.now();
    latestVideoRequestIdRef.current = requestId;

    if (!canWatchVideo) {
      setVideoUrl(null);
      setLoadingVideo(false);
      return;
    }

    try {
      setLoadingVideo(true);
      const token = await getToken();
      const { data } = await axios.get(
        `${backendUrl}/api/video/${lectureId}/signed-video-url`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (latestVideoRequestIdRef.current !== requestId) return;

      if (data.success) setVideoUrl(withAutoplayDisabled(data.playbackUrl));
      else toast.error(data.error || "Failed to load video");
    } catch (error) {
      if (latestVideoRequestIdRef.current !== requestId) return;
      toast.error(error.response?.data?.error || "Failed to load video");
    } finally {
      if (latestVideoRequestIdRef.current === requestId) {
        setLoadingVideo(false);
      }
    }
  };

  const fetchNotes = async (lectureId) => {
    try {
      setLoadingNotes(true);
      const token = await getToken();
      const { data } = await axios.get(
        `${backendUrl}/api/notes/lecture/${lectureId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        const lectureNotes = Array.isArray(data.notes) ? data.notes : [];
        setNotes(lectureNotes);
        return lectureNotes;
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoadingNotes(false);
    }

    setNotes([]);
    return [];
  };

  const handleViewNote = async (note, silent = false) => {
    if (!note?._id) {
      if (!silent) toast.error("Invalid note selected");
      return;
    }

    try {
      setPdfState({ loading: true, url: null, title: note.name || "Course Note" });
      const token = await getToken();
      const response = await axios.get(`${backendUrl}/api/notes/${note._id}/file-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fileUrl = response?.data?.fileUrl;
      if (!fileUrl) throw new Error("No file URL returned");

      setPdfState({ loading: false, url: fileUrl, title: note.name || "Course Note" });
      setActiveTab("notes");
    } catch (error) {
      setPdfState({ loading: false, url: null, title: "" });
      if (!silent) {
        toast.error(error.response?.data?.error || "Failed to open note");
      }
    }
  };

  const handleDownloadNote = async (note) => {
    if (!note?._id) {
      toast.error("Invalid note selected");
      return;
    }
    if (!isPlatinum) {
      toast.error("Platinum plan required to download course materials");
      return;
    }

    try {
      const token = await getToken();
      const response = await axios.get(`${backendUrl}/api/notes/${note._id}/file-url?download=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fileUrl = response.data.fileUrl;
      if (!fileUrl) throw new Error("No file URL returned");

      // Just open the URL directly — browser handles the download natively
      window.open(fileUrl, "_blank");

      toast.success("Download started");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to download note");
    }
  };
  useEffect(() => {
    const loadLectureContent = async () => {
      if (!playerData?.lectureId) return;

      setVideoUrl(null);
      setPdfState({ loading: false, url: null, title: "" });

      if (canWatchVideo) {
        fetchVideoUrl(playerData.lectureId);
      }

      const lectureNotes = await fetchNotes(playerData.lectureId);

      // Basic plan: open first available note directly in player area.
      if (!canWatchVideo && lectureNotes.length > 0) {
        await handleViewNote(lectureNotes[0], true);
      }
    };

    loadLectureContent();
  }, [playerData?.lectureId, canWatchVideo, courseId, userData?.tierByCourse?.[courseId]]);

  useEffect(() => {
    return () => {
      setVideoUrl(null);
      latestVideoRequestIdRef.current = 0;
    };
  }, []);

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/user/add-feedback`,
        { courseId, rating: feedbackData.rating, comment: feedbackData.comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Feedback submitted successfully!");
        setShowFeedbackModal(false);
        // refresh enrolled courses and feedback list
        try { await fetchUserEnrolledCourses(); } catch (e) {}
        try { await getCourseProgress(); } catch (e) {}
        try { const { data: fdata } = await axios.get(`${backendUrl}/api/course/${courseId}/feedback`); if (fdata.success) setCourseFeedback(fdata.feedback || []); } catch (e) {}
      } else {
        toast.error(data.message || "Failed to submit feedback");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    if (courseData && courseData.courseContent.length > 0 && !playerData) {
      const firstLecture = courseData.courseContent[0].chapterContent[0];
      setPlayerData({ ...firstLecture, chapter: 1, lecture: 1 });
      setOpenSections({ 0: true });
    }
  }, [courseData]);



  // Calculate overall progress with normalized IDs to avoid ObjectId/string mismatches.
  const completedLectureIds = new Set(
    (progressData?.lectureCompleted || []).map((id) => String(id))
  );
  const totalLectures =
    courseData?.courseContent?.reduce((acc, ch) => acc + ch.chapterContent.length, 0) || 0;
  const completedLectures = completedLectureIds.size;
  const progressPercent = totalLectures > 0
    ? Math.round((completedLectures / totalLectures) * 100)
    : 0;

  if (!courseData) return <Loading />;

  return (
    /*
      ROOT: full screen, flex-col, overflow-hidden.
      Navbar is fixed height. Body row takes the rest.
    */
    <div className="flex flex-col h-screen bg-[#1c1d1f] font-sans text-gray-100">

      {/* ── NAVBAR (fixed, never scrolls) ── */}
      <header className="h-14 bg-[#1c1d1f] border-b border-[#3e4143] flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/my-enrollments" className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors flex-shrink-0">
            <ChevronLeft size={20} />
          </Link>
          <div className="h-5 w-px bg-[#3e4143]" />
          <span className="text-sm font-medium text-gray-100 truncate max-w-xs md:max-w-lg">
            {courseData.title}
          </span>
          <span
            className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 border ${tierUi(tierUpper).pill}`}
          >
            <Crown size={11} /> {tierUi(tierUpper).label}
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-3 text-sm flex-shrink-0">
          <div className="flex-shrink-0 border-gray-200">
            <button
              onClick={() => {
                const userFeedback = courseData?.feedback || null;
                setFeedbackInitial({ rating: userFeedback?.rating || 0, comment: userFeedback?.comment || "" });
                setShowFeedbackModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2d2f31] hover:bg-[#3e4143] transition-colors text-xs text-gray-300 hover:text-white"
            >
              <MessageCircle size={16} />
              {courseData?.feedback ? "Edit Feedback" : "Give Feedback"}
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="min-w-0 leading-tight">
              <div className="text-[11px] text-gray-400 mb-0.5 uppercase tracking-wide">Course Progress</div>
              <div className="text-xs text-gray-300 truncate">{completedLectures}/{totalLectures} lectures completed</div>
            </div>
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="transform -rotate-90 w-12 h-12" viewBox="0 0 56 56">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="#3e4143"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="#a435f0"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-[#a435f0]">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2d2f31] hover:bg-[#3e4143] transition-colors text-xs text-gray-300 hover:text-white"
          >
            {isSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>

      {/*── BODY ROW ──*/}
      <div className="flex flex-1 overflow-hidden">

        {/*── LEFT COLUMN ──*/}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">

          {/* VIDEO / PDF */}
{/* VIDEO / PDF */}
<div
  className="bg-black w-full transition-[height] duration-300"
  style={{
    height: isSidebarOpen
      ? `calc((100vw - 384px) * 9 / 16)`
      : "calc(100vh - 56px)",
    overflow: "hidden",
    position: "relative",  // ← add this so the overlay button positions correctly
  }}
>
  {/* Switch to video button — shown only when PDF is open AND video is available */}
  {pdfState.url && videoUrl && (
    <button
      onClick={() => setPdfState({ loading: false, url: null, title: "" })}
      style={{
        position: "absolute",
        top: "12px",
        right: "12px",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "8px",
        backgroundColor: "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#fff",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(164,53,240,0.8)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.7)")}
    >
      <Play size={13} />
      Switch to video
    </button>
  )}

  {pdfState.loading ? (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-400">Loading PDF...</p>
    </div>
  ) : pdfState.url ? (
    <PdfViewer url={pdfState.url} />
  ) : !canWatchVideo ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 px-6 text-center">
      <BookOpen size={40} className="text-slate-400 mb-3" />
      <p className="text-white font-semibold mb-1">Basic plan — notes only</p>
      <p className="text-slate-400 text-sm mb-4 max-w-md">
        Open a note from the Notes tab to read it here. Upgrade to Gold or Platinum to watch videos.
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link
          to={`/course/${courseId}`}
          className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
        >
          View upgrade options
        </Link>
        <button
          onClick={() => {
            setActiveTab("notes");
            setTimeout(() => {
              notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          }}
          className="px-4 py-2 rounded-lg bg-[#a435f0] text-white text-sm font-bold hover:bg-[#8710d8] transition-colors flex items-center gap-2"
        >
          <FileText size={15} />
          View Notes
        </button>
      </div>
    </div>
  ) : loadingVideo ? (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-400">Loading video...</p>
    </div>
  ) : videoUrl ? (
    <iframe
      key={videoUrl}
      src={videoUrl}
      className="w-full h-full block"
      style={{ border: "none" }}
      allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <Play size={48} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No video available</p>
      </div>
    </div>
  )}
</div>

          {/* TABS + CONTENT (flows naturally below video) */}
          <div className="bg-white text-gray-900">
            {/* Sticky tab bar — sticks to top of the left column scroll container */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 md:px-8 shadow-sm">
              <div className="flex gap-6 text-sm font-medium overflow-x-auto no-scrollbar">
                {["overview", "notes"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 capitalize whitespace-nowrap border-b-2 transition-colors ${activeTab === tab
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 md:p-8 max-w-4xl" ref={notesRef}>
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <h1 className="text-xl font-bold text-gray-900">
                    {playerData?.chapter}.{playerData?.lecture} {playerData?.lectureTitle}
                  </h1>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => markLectureAsCompleted(playerData?.lectureId)}
                      disabled={completedLectureIds.has(String(playerData?.lectureId))}
                      className="px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={16} />
                      {completedLectureIds.has(String(playerData?.lectureId)) ? "Completed" : "Mark as complete"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-5">
                  {loadingNotes ? (
                    <div className="text-center py-8">
                      <div className="w-7 h-7 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <FileText size={40} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium text-sm">No notes yet</p>
                      <p className="text-gray-400 text-xs mt-1">Start writing above to capture key moments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">

                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-1.5 text-[#a435f0] hover:text-[#8710d8] text-xs font-semibold transition-colors">
                              <FileText />{note.name || "Untitled"}
                            </div>
                            <div className="flex items-center gap-10">
                              <button
                                type="button"
                                onClick={() => handleViewNote(note)}
                                className="text-gray-400 hover:text-[#a435f0] transition-colors"
                                title="View note"
                              >
                                <Eye size={20} />
                              </button>
                              {isPlatinum && (
                                <button
                                  type="button"
                                onClick={() => handleDownloadNote(note)}
                                className="text-gray-400 hover:text-[#a435f0] transition-colors"
                                title="Download note"
                              >
                                <Download size={20} />
                              </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Footer />
          </div>

        </div>

        {/*── RIGHT SIDEBAR ──*/}
        <div className={`flex-shrink-0 flex flex-col bg-white border-l border-[#3e4143] transition-all duration-300 overflow-hidden ${isSidebarOpen ? "w-96" : "w-0"}`}>


          <div className="flex items-center justify-between px-4 py-3 bg-[#2d2f31] border-b border-[#3e4143] flex-shrink-0">
            <h2 className="font-bold text-sm text-gray-100 uppercase tracking-wide">Course Content</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {courseData.courseContent.map((chapter, index) => (
              <div key={index} className="border-b border-gray-100">
                <button
                  className="w-full bg-gray-50 hover:bg-gray-100 py-3.5 px-4 flex justify-between items-start text-left transition-colors"
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex-1 pr-3 min-w-0">
                    <p className="font-semibold text-gray-800 text-xs leading-snug mb-0.5">
                      Section {index + 1}: {chapter.chapterTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {chapter.chapterContent.length} lectures • {calculateChapterTime(chapter)}
                    </p>
                  </div>
                  <div className="mt-0.5 text-gray-500 flex-shrink-0">
                    {openSections[index] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? "max-h-[2000px]" : "max-h-0"}`}>
                  {chapter.chapterContent.map((lecture, i) => {
                    const isCompleted = completedLectureIds.has(String(lecture.lectureId));
                    const isActive = playerData?.lectureId === lecture.lectureId;

                    return (
                      <div
                        key={i}
                        className={`w-full flex items-start gap-3 py-3 px-4 border-b border-gray-50 transition-colors ${isActive ? "bg-[#f0e6ff] border-l-[3px] border-l-[#a435f0]" : "border-l-[3px] border-l-transparent"
                          }`}
                      >
                        {/* Checkbox button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markLectureAsCompleted(lecture.lectureId);
                          }}
                          disabled={isCompleted}
                          className="flex items-center justify-center w-5 h-5"
                        >
                          <div
                            className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all
      ${isCompleted
                                ? "bg-purple-600 border-purple-600"
                                : "border-gray-400 hover:border-purple-600"
                              }`}
                          >
                            {isCompleted && (
                              <span className="text-white text-[10px] leading-none">✓</span>
                            )}
                          </div>
                        </button>

                        {/* Lecture Info - Clickable */}
                        <button
                          className="flex-1 min-w-0 text-left hover:opacity-75 transition-opacity"
                          onClick={() => selectLecture(lecture, index, i)}
                        >
                          <p className={`text-xs leading-snug mb-1 ${isActive ? "font-semibold text-gray-900" : "text-gray-700"
                            }`}>
                            {i + 1}. {lecture.lectureTitle}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                              {humanizeDuration(lecture.lectureDuration * 60 * 1000, { units: ["m", "s"] })}
                            </span>
                          </div>
                        </button>

                        {/* Play Button - Right-aligned, stops propagation */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectLecture(lecture, index, i);
                          }}
                          className="flex-shrink-0 p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Play lecture"
                        >
                          <Play size={16} className="text-[#a435f0]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* end sidebar */}

      </div>
      {/* end body row */}

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        isLoading={isSubmittingFeedback}
        initialRating={feedbackInitial.rating}
        initialComment={feedbackInitial.comment}
        isEdit={Boolean(courseData?.feedback)}
      />

    </div>
  );
};

export default Player;