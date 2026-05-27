import React from "react";
import Hero from "../../components/student/Hero";
import Companies from "../../components/student/Companies";
import CoursesSection from "../../components/student/CoursesSection";
import CoursesCategories from "../../components/student/CoursesCategories";
import InstructorsSection from "../../components/student/InstructorsSection";
import TestimonialsSection from "../../components/student/TestimonialsSection";
import CallToAction from "../../components/student/CallToAction";
import Footer from "../../components/student/Footer";

const Home = () => {
  return (
    <div className="flex flex-col items-center space-y-7 text-center">
      <Hero />
      <CoursesCategories />
      <CoursesSection />

      <CallToAction />
      <InstructorsSection />
      <Footer />
      <TestimonialsSection />
    </div>
  );
};

export default Home;
