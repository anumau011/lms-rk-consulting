import React, { useState, useContext, useEffect } from "react";
import { useSignUp, useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft,
  Loader2, Phone, Calendar, GraduationCap, Users,
} from "lucide-react";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import axios from "axios";

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
];

// ── Input component helper ────────────────────────────────────────────────
const InputField = ({ icon: Icon, label, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
      )}
      {children}
    </div>
  </div>
);

// ── Steps indicator ───────────────────────────────────────────────────────
const StepIndicator = ({ step }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {[1, 2, 3].map((s) => (
      <div key={s} className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= s
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {step > s ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            s
          )}
        </div>
        {s < 3 && (
          <div className={`w-12 h-0.5 rounded ${step > s ? "bg-blue-600" : "bg-gray-200"}`} />
        )}
      </div>
    ))}
  </div>
);

const SignUpPage = () => {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { user, isLoaded: userLoaded } = useUser();
  const { backendUrl, getToken } = useContext(AppContext);
  const navigate = useNavigate();

  // Redirect to home only if the user is already logged in BEFORE starting signup.
  // Do NOT redirect during the signup flow (steps 2/3) — the session becomes
  // active after OTP, but we still need to show the profile step.
  useEffect(() => {
    if (userLoaded && user && step === 1) {
      navigate("/");
    }
  }, [userLoaded, user, navigate]);

  // Step: 1 = credentials, 2 = OTP verification, 3 = profile info
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 — OTP
  const [otp, setOtp] = useState("");

  // Step 3 — Profile
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [profession, setProfession] = useState("");

  // ── Helper: wait for a valid Clerk token (retries up to 5x) ──────────────
  const waitForToken = async () => {
    let token = null;
    let attempts = 0;
    while (!token && attempts < 5) {
      token = await getToken();
      if (!token) {
        await new Promise((res) => setTimeout(res, 800));
        attempts++;
      }
    }
    return token;
  };

  // ── Step 1: Create Clerk account ──────────────────────────────────────────
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep(2);
    } catch (err) {
      setError(
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Failed to create account"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp });

      if (result.status === "complete") {
        // FIX: Set session active first, then wait for Clerk to fully propagate
        await setActive({ session: result.createdSessionId });
        await new Promise((res) => setTimeout(res, 1000)); // wait 1s for session to settle
        setStep(3);
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err) {
      setError(
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Save profile ──────────────────────────────────────────────────
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // FIX: Retry getting token until Clerk session is fully ready
      const token = await waitForToken();

      if (!token) {
        setError("Session not ready. Please wait a moment and try again.");
        setLoading(false);
        return;
      }

      await axios.post(
        `${backendUrl}/api/user/complete-profile`,
        { phone, dateOfBirth: dob || null, education, gender, country, profession },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipProfile = () => navigate("/");

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/">
            <img src={assets.logo} alt="Logo" className="w-36 mb-12 brightness-0 invert" />
          </Link>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Start your learning journey
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed max-w-md">
            Join thousands of students mastering new skills. Create your free account and get instant access to top-rated courses.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6">
            {[
              { number: "100+", label: "Premium Courses" },
              { number: "50k+", label: "Happy Students" },
              { number: "4.8", label: "Avg Rating" },
              { number: "24/7", label: "Support" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.number}</p>
                <p className="text-blue-200 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/">
              <img src={assets.logo} alt="Logo" className="w-28 mx-auto" />
            </Link>
          </div>

          <StepIndicator step={step} />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* ══════════ STEP 1: Credentials ══════════ */}
          {step === 1 && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create account</h1>
                <p className="text-gray-500">
                  Already have an account?{" "}
                  <Link to="/sign-in" className="text-blue-600 font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField icon={User} label="First name">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                    />
                  </InputField>
                  <InputField label="Last name">
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                    />
                  </InputField>
                </div>

                <InputField icon={Mail} label="Email address">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                </InputField>

                <InputField icon={Lock} label="Password">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </InputField>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ══════════ STEP 2: OTP Verification ══════════ */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify your email</h1>
                <p className="text-gray-500">
                  We've sent a 6-digit code to{" "}
                  <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Verification code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Verify
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ══════════ STEP 3: Profile Info ══════════ */}
          {step === 3 && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Complete your profile
                </h1>
                <p className="text-gray-500">
                  Tell us a bit about yourself to personalize your experience.
                </p>
              </div>

              <form onSubmit={handleCompleteProfile} className="space-y-4">
                {/* Phone */}
                <InputField icon={Phone} label="Phone number">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                </InputField>

                {/* DOB */}
                <InputField icon={Calendar} label="Date of birth">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                </InputField>

                {/* Education */}
                <InputField icon={GraduationCap} label="Education">
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                  >
                    {EDUCATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                {/* Country */}
                <InputField label="Country">
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                </InputField>

                {/* Profession */}
                <InputField label="Profession">
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                </InputField>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                  <div className="flex gap-2">
                    {GENDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGender(opt.value)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                          gender === opt.value
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSkipProfile}
                    className="px-6 py-3.5 border border-gray-200 rounded-xl text-gray-500 font-semibold text-sm hover:bg-gray-50 transition"
                  >
                    Skip for now
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;