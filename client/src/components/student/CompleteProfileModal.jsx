import React, { useState, useContext } from "react";
import {
  Phone, Calendar, GraduationCap, ArrowRight,
  Loader2, X, UserCheck,
} from "lucide-react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";

const EDUCATION_OPTIONS = [
  { value: "", label: "Select your education" },
  { value: "higher_secondary", label: "Higher Secondary (10+2)" },
  { value: "diploma", label: "Diploma" },
  { value: "undergraduate", label: "Undergraduate (B.Tech / B.Sc / BA)" },
  { value: "postgraduate", label: "Postgraduate (M.Tech / M.Sc / MA)" },
  { value: "phd", label: "PhD / Doctorate" },
  { value: "other", label: "Other" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const InputField = ({ icon: Icon, label, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      )}
      {children}
    </div>
  </div>
);

const CompleteProfileModal = ({ onClose }) => {
  const { backendUrl, getToken, setUserData } = useContext(AppContext);

  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [profession, setProfession] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let token = null;
      let attempts = 0;
      while (!token && attempts < 5) {
        token = await getToken();
        if (!token) {
          await new Promise((r) => setTimeout(r, 600));
          attempts++;
        }
      }

      if (!token) {
        setError("Session not ready. Please try again.");
        setLoading(false);
        return;
      }

      const { data } = await axios.post(
        `${backendUrl}/api/user/complete-profile`,
        { phone, dateOfBirth: dob || null, education, gender, country, profession },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        // Merge profileCompleted into context so the modal doesn't reappear
        setUserData((prev) => ({ ...prev, ...data.user, profileCompleted: true }));
        onClose();
      } else {
        setError(data.message || "Failed to save profile.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Modal card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Complete Your Profile</h2>
              <p className="text-indigo-200 text-xs mt-0.5">Help us personalise your learning experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors mt-0.5"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar hint */}
        <div className="h-1 bg-indigo-100">
          <div className="h-1 bg-indigo-500 w-2/3 rounded-r-full" />
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone + DOB row */}
            <div className="grid grid-cols-2 gap-4">
              <InputField icon={Phone} label="Phone number">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>

              <InputField icon={Calendar} label="Date of birth">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>
            </div>

            {/* Education */}
            <InputField icon={GraduationCap} label="Education">
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition appearance-none cursor-pointer"
              >
                {EDUCATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </InputField>

            {/* Country + Profession row */}
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Country">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>

              <InputField label="Profession">
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="e.g. Engineer"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
              <div className="grid grid-cols-4 gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                      gender === opt.value
                        ? "bg-indigo-600 text-white border-indigo-600 shadow"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-500 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
