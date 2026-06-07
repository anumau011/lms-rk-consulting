import React from "react";
import Hero from "../../components/student/Hero";
import Companies from "../../components/student/Companies";
import CoursesSection from "../../components/student/CoursesSection";
import CoursesCategories from "../../components/student/CoursesCategories";
import InstructorsSection from "../../components/student/InstructorsSection";
import TestimonialsSection from "../../components/student/TestimonialsSection";
import CallToAction from "../../components/student/CallToAction";
import Footer from "../../components/student/Footer";
import FAQ from "../../components/student/FAQ";

const Home = () => {
  return (
    <div className="flex flex-col items-start space-y-7 text-left w-full">
      <Hero />
      <CoursesCategories />
      <CoursesSection />
      <CallToAction />
      <InstructorsSection />
      <TestimonialsSection />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Home;
