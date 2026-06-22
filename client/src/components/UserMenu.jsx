import React, { useState, useRef, useEffect, useContext } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { LogOut, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { AppContext } from "../context/AppContext";

const UserMenu = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const { setIsEducator, setUserData } = useContext(AppContext);

  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    // Optional validation
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5 MB");
      return;
    }

    try {
      const uploadPromise = user.setProfileImage({ file });

      toast.promise(uploadPromise, {
        loading: "Uploading profile picture...",
        success: "Profile picture updated successfully!",
        error: "Failed to upload profile picture",
      });

      await uploadPromise;
      await user.reload();

      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }

    // Reset input so same image can be selected again
    e.target.value = "";
  };

  if (!user) return null;

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-full focus:outline-none hover:ring-2 hover:ring-indigo-100 transition-all"
      >
        <img
          src={user.imageUrl}
          alt="Profile"
          className="w-9 h-9 rounded-full object-cover border border-gray-200"
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 max-w-[calc(100vw-1rem)] bg-white border border-gray-100 rounded-xl shadow-lg py-1">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user.fullName || "User"}
            </p>

            <p className="text-xs text-gray-500 truncate mt-0.5">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileUpload}
            className="hidden"
          />

          {/* Actions */}
          <div className="p-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <Camera size={16} />
              Upload Profile Picture
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsEducator(false);
                setUserData(null);

                signOut(() => navigate("/"));
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;