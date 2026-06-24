import React, { useContext, useEffect, useRef, useState } from "react";
import { Route, Routes, useMatch, Navigate, useNavigate, useLocation } from "react-router-dom";
import Home from "./pages/student/Home";
import CoursesList from "./pages/student/CoursesList";
import CourseDetails from "./pages/student/CourseDetails";
import MyEnrollments from "./pages/student/MyEnrollments";
import Player from "./pages/student/Player";
import Loading from "./components/student/Loading";
import Educator from "./pages/educator/Educator";
import Dashboard from "./pages/educator/Dashboard";
import AddCourse from "./pages/educator/AddCourse";
import MyCourses from "./pages/educator/MyCourses";
import StudentsEnrolled from "./pages/educator/StudentsEnrolled";
import ManageTestimonials from "./pages/educator/ManageTestimonials";
import ManageEducators from "./pages/educator/ManageEducators";
import Drafts from "./pages/educator/Drafts";
import Archive from "./pages/educator/Archive";
import Navbar from "./components/student/Navbar";
import NotFound from "./pages/NotFound";
import "quill/dist/quill.snow.css";
import { Toaster } from "react-hot-toast";
import About from "./pages/student/About";
import Contact from "./pages/student/Contact";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import { AppContext } from "./context/AppContext";
import CompleteProfileModal from "./components/student/CompleteProfileModal";

const App = () => {
  const { isEducator, isEducatorLoading, userData } = useContext(AppContext);
  const location = useLocation();

  // Show profile-completion modal when a logged-in user hasn't finished their profile.
  // useRef ensures it only ever opens ONCE per session — closing/skipping it
  // sets the ref permanently so page navigation never re-triggers it.
  const [showProfileModal, setShowProfileModal] = useState(false);
  const hasShownProfileModal = useRef(false);

  useEffect(() => {
    const isAuthPage = ["/sign-in", "/sign-up", "/reset-password"].includes(location.pathname);
    if (
      userData &&
      userData.profileCompleted === false &&
      !isAuthPage &&
      !hasShownProfileModal.current
    ) {
      hasShownProfileModal.current = true; // lock — won't re-open this session
      setShowProfileModal(true);
    }
  }, [userData, location.pathname]);

  // Check if the current route is a Player route OR an Educator route
  const isPlayerRoute = location.pathname.startsWith('/player');
  const isEducatorRoute = location.pathname.startsWith('/educator');

  // Show loading while checking educator status for educator routes
  if (isEducatorRoute && isEducatorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-default min-h-screen bg-white">
      {showProfileModal && (
        <CompleteProfileModal onClose={() => setShowProfileModal(false)} />
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
            padding: "12px 14px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
          },
          success: {
            iconTheme: {
              primary: "#16a34a",
              secondary: "#f0fdf4",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fef2f2",
            },
          },
        }}
      />
      {!isPlayerRoute && !isEducatorRoute && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/course-list" element={<CoursesList />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/course-list/:input" element={<CoursesList />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/my-enrollments" element={<MyEnrollments />} />
        <Route path="/player/:courseId" element={<Player />} />
        <Route path="/loading/:path" element={<Loading />} />
        <Route
          path="/educator"
          element={isEducator ? <Educator /> : <Navigate to="/" replace />}
        >
          <Route path="/educator" element={<Dashboard />} />
          <Route path="add-course" element={<AddCourse />} />
          <Route path="edit-course/:courseId" element={<AddCourse />} />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="archive" element={<Archive />} />
          <Route path="student-enrolled" element={<StudentsEnrolled />} />
          <Route path="testimonials" element={<ManageTestimonials />} />
          <Route path="educators" element={<ManageEducators />} />
        </Route>
        
        {/* 404 Catch-all Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
