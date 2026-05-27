import React, { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { assets } from "../../assets/assets";

const ResetPasswordPage = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user, isLoaded: userLoaded } = useUser();
  const navigate = useNavigate();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (userLoaded && user) {
      navigate("/");
    }
  }, [userLoaded, user, navigate]);

  const [step, setStep] = useState(1); // 1: Email, 2: Code + New Password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // FIX: toggle visibility

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step 1: Send reset code to email ─────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep(2);
    } catch (err) {
      setError(
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Failed to send verification code. Check if the email is correct."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify code and set new password ──────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");

      } else if (result.status === "needs_second_factor") {
        // FIX: handle 2FA if enabled in Clerk dashboard
        setError("Two-factor authentication required.");

      } else {
        // FIX: log actual status for easier debugging
        console.error("Unexpected reset status:", result.status, result);
        setError(`Unexpected status: ${result.status}. Please try again.`);
      }
    } catch (err) {
      setError(
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Failed to reset password. Please check your code and new password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src={assets.logo} alt="Logo" className="w-32 mx-auto mb-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Reset Password
          </h1>
          <p className="text-gray-500 text-sm">
            {step === 1
              ? "Enter your email to receive a password reset code."
              : "Enter the code sent to your email and your new password."}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* ══════════ STEP 1: Email ══════════ */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Code"}
            </button>
          </form>
        )}

        {/* ══════════ STEP 2: Code + New Password ══════════ */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">

            {/* OTP Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                required
                maxLength={6}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm bg-gray-50 focus:bg-white text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

            {/* New Password — FIX: added show/hide toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm bg-gray-50 focus:bg-white"
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

            <button
              type="submit"
              disabled={loading || code.length < 6 || newPassword.length < 8}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
            </button>

            {/* Resend option */}
            <p className="text-center text-sm text-gray-500">
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setNewPassword("");
                  setError("");
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Try again
              </button>
            </p>
          </form>
        )}

        {/* Back to sign in */}
        <div className="mt-8 text-center">
          <Link
            to="/sign-in"
            className="text-gray-500 text-sm hover:text-gray-700 font-medium"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;