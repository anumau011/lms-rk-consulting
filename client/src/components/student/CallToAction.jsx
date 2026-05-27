import React from "react";
import { assets } from "../../assets/assets";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const CallToAction = () => {
  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && !!user;
  return (
    <section className="w-full bg-gradient-to-r from-cyan-50/60 via-white to-white py-20">
      <div className="max-w-7xl mx-auto px-8 md:px-12 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-left">
          <span className="inline-block bg-cyan-50 text-cyan-700 border border-cyan-100 px-3 py-1 rounded-full text-sm font-medium mb-4">
            Upto 50% Off
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 mt-3">
            Exclusive Student Offer – 50% OFF
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl">
            Your college journey deserves the best opportunities.<br/> Start learning smarter with our exclusive student deal.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {isLoggedIn ? (
              <button
                disabled
                aria-disabled="true"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-cyan-600 text-white font-semibold opacity-60 cursor-not-allowed"
              >
                Already Signed In
                <img src={assets.arrow_icon} alt="arrow" className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition"
              >
                Become A Student
                <img src={assets.arrow_icon} alt="arrow" className="w-4 h-4" />
              </Link>
            )}

            {isLoggedIn ? (
              <button
                disabled
                aria-disabled="true"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold opacity-60 cursor-not-allowed"
              >
                Already Signed In
                <img src={assets.arrow_icon} alt="arrow" className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/sign-up?role=educator"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Become A Teacher
                <img src={assets.arrow_icon} alt="arrow" className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 flex justify-center md:justify-end">
          <Link to="/course-list" onClick={() => scrollTo(0, 0)} className="block rounded-lg overflow-hidden shadow-lg ring-1 ring-gray-100 hover:scale-105 transition-transform">
            <img src={assets.poster} alt="students learning" className="w-full h-56 object-cover md:h-72" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
