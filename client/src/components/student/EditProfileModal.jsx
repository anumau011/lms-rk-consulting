import React, { useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import {
  X, User, Phone, Calendar, Globe, Briefcase, Loader2, Save, Camera,
} from "lucide-react";
import { AppContext } from "../../context/AppContext";
import api from "../../services/api";

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

// Display dates as DD-MM-YYYY (Indian format) regardless of browser/OS locale.
const toDisplayDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
};

// Auto-insert dashes as the user types digits: "27052026" -> "27-05-2026".
const maskDobInput = (raw) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("-");
};

const parseDisplayDate = (display) => {
  const match = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const d = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;

  return isRealDate ? `${yyyy}-${mm}-${dd}` : null;
};

const EditProfileModal = ({ onClose }) => {
  const { user } = useUser();
  const { userData, setUserData } = useContext(AppContext);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [dob, setDob] = useState(toDisplayDate(userData?.dateOfBirth));
  const [gender, setGender] = useState(userData?.gender || "");
  const [country, setCountry] = useState(userData?.country || "");
  const [profession, setProfession] = useState(userData?.profession || "");
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5 MB");
      e.target.value = "";
      return;
    }

    setUploadingPhoto(true);

    try {
      const uploadPromise = user.setProfileImage({ file });

      toast.promise(uploadPromise, {
        loading: "Uploading profile picture...",
        success: "Profile picture updated successfully!",
        error: "Failed to upload profile picture",
      });

      await uploadPromise;
      await user.reload();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let isoDob = null;
    if (dob) {
      isoDob = parseDisplayDate(dob);
      if (!isoDob) {
        toast.error("Please enter a valid date in DD-MM-YYYY format.");
        return;
      }
      if (new Date(isoDob) > new Date()) {
        toast.error("Date of birth cannot be in the future.");
        return;
      }
    }

    setLoading(true);

    try {
      if (firstName !== (user.firstName || "") || lastName !== (user.lastName || "")) {
        await user.update({ firstName, lastName });
        await user.reload();
      }

      const { data } = await api.post("/api/user/complete-profile", {
        phone,
        dateOfBirth: isoDob,
        gender,
        country,
        profession,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to update profile.");
        return;
      }

      setUserData((prev) => ({ ...prev, ...data.user }));
      toast.success("Profile updated successfully!");
      onClose();
    } catch (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edit Profile</h2>
              <p className="text-indigo-200 text-xs mt-0.5">Update your personal information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Picture */}
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={user?.imageUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-4">
              <InputField icon={User} label="First name">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>

              <InputField label="Last name">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>
            </div>

            {/* Email (read-only) */}
            <InputField label="Email">
              <input
                type="email"
                value={user?.primaryEmailAddress?.emailAddress || ""}
                disabled
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </InputField>

            {/* Phone + DOB */}
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
                  type="text"
                  inputMode="numeric"
                  value={dob}
                  onChange={(e) => setDob(maskDobInput(e.target.value))}
                  placeholder="DD-MM-YYYY"
                  maxLength={10}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>
            </div>

            {/* Country + Profession */}
            <div className="grid grid-cols-2 gap-4">
              <InputField icon={Globe} label="Country">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </InputField>

              <InputField icon={Briefcase} label="Profession">
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="e.g. Engineer"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
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
                Cancel
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
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditProfileModal;
