import React, { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { assets } from "../../assets/assets";

const SignInPage = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user, isLoaded: userLoaded } = useUser();
  const navigate = useNavigate();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (userLoaded && user) {
      navigate("/");
    }
  }, [userLoaded, user, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      } else if (result.status === "needs_second_factor") {
        setRequires2FA(true);
        await signIn.prepareSecondFactor({
          strategy: "email_code",
        });
      } else if (result.status === "needs_new_password") {
        setError("You need to reset your password.");
      } else {
        setError(`Unexpected status: ${result.status}`);
      }
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid email or password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: otp,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      } else {
        setError("Invalid OTP. Try again.");
      }
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "OTP verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/">
            <img src={assets.logo} alt="Logo" className="w-36 mb-12 brightness-0 invert" />
          </Link>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Welcome back!
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed max-w-md">
            Continue your learning journey. Access your courses, track your progress, and achieve your goals.
          </p>
          <div className="mt-12 space-y-4">
            {["Access 100+ premium courses", "Track your learning progress", "Get certified"].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium">{text}</span>
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

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {requires2FA ? "Verify OTP" : "Sign in"}
            </h1>
            {!requires2FA && (
              <p className="text-gray-500">
                Don't have an account?{" "}
                <Link to="/sign-up" className="text-blue-600 font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {!requires2FA ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link to="/reset-password" className="text-sm text-blue-600 font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <p className="text-sm text-gray-500">
                Enter the OTP sent to your email.
              </p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setOtp("");
                  setError("");
                }}
                className="w-full py-3 text-sm text-gray-600 hover:text-gray-800"
              >
                Back to sign in
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
