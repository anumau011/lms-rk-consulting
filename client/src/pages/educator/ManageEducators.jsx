import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  X,
  UserPen,
  Upload,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";

const emptySocialLinks = {
  website: "",
  linkedin: "",
  twitter: "",
  instagram: "",
  facebook: "",
  youtube: "",
};

const emptyForm = {
  name: "",
  designation: "",
  about: "",
  imageUrl: "",
  socialLinks: emptySocialLinks,
};

const SOCIAL_FIELDS = [
  { key: "website", label: "Website", Icon: Globe, placeholder: "https://yourwebsite.com" },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, placeholder: "https://linkedin.com/in/username" },
  { key: "twitter", label: "Twitter / X", Icon: Twitter, placeholder: "https://x.com/username" },
  { key: "instagram", label: "Instagram", Icon: Instagram, placeholder: "https://instagram.com/username" },
  { key: "facebook", label: "Facebook", Icon: Facebook, placeholder: "https://facebook.com/username" },
  { key: "youtube", label: "YouTube", Icon: Youtube, placeholder: "https://youtube.com/@username" },
];

const ManageEducators = () => {
  const { backendUrl, getToken, isEducator } = useContext(AppContext);
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchEducators = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/v1/educators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setEducators(data.educators);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load educators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEducator) fetchEducators();
    else setLoading(false);
  }, [isEducator]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview("");
    setShowModal(true);
  };

  const openEditModal = (educator) => {
    setEditingId(educator._id);
    setForm({
      name: educator.name,
      designation: educator.designation || "",
      about: educator.about || "",
      imageUrl: educator.imageUrl || "",
      socialLinks: { ...emptySocialLinks, ...(educator.socialLinks || {}) },
    });
    setPhotoFile(null);
    setPhotoPreview(educator.imageUrl || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const uploadPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("thumbnail", photoFile);

      const response = await fetch(`${backendUrl}/api/v1/media/upload-thumbnail`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        return result.data.url;
      }
      throw new Error(result.error);
    } catch (err) {
      toast.error("Failed to upload photo");
      throw err;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSocialChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setSubmitting(true);
      let imageUrl = form.imageUrl;
      if (photoFile) {
        imageUrl = await uploadPhoto();
      }

      const payload = { ...form, imageUrl };
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      if (editingId) {
        const { data } = await axios.put(
          `${backendUrl}/api/v1/educators/${editingId}`,
          payload,
          { headers }
        );
        if (data.success) {
          toast.success("Educator updated");
          setEducators((prev) =>
            prev.map((e) => (e._id === editingId ? data.educator : e))
          );
        }
      } else {
        const { data } = await axios.post(
          `${backendUrl}/api/v1/educators`,
          payload,
          { headers }
        );
        if (data.success) {
          toast.success("Educator added");
          setEducators((prev) => [...prev, data.educator]);
        }
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save educator");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      const token = await getToken();
      const { data } = await axios.put(
        `${backendUrl}/api/v1/educators/${id}`,
        { isActive: !currentActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setEducators((prev) =>
          prev.map((e) => (e._id === id ? data.educator : e))
        );
        toast.success(
          currentActive ? "Educator hidden from site" : "Educator visible on site"
        );
      }
    } catch (err) {
      toast.error("Failed to update visibility");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this educator profile permanently?")) return;
    try {
      const token = await getToken();
      const { data } = await axios.delete(`${backendUrl}/api/v1/educators/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setEducators((prev) => prev.filter((e) => e._id !== id));
        toast.success("Educator deleted");
      }
    } catch (err) {
      toast.error("Failed to delete educator");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading educators...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserPen className="w-7 h-7 text-indigo-600" />
              Manage Educators
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Add and manage instructor profiles shown on your landing page
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Educator
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl font-bold text-gray-900">{educators.length}</p>
            <p className="text-sm text-gray-500">Total Educators</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl font-bold text-green-600">
              {educators.filter((e) => e.isActive).length}
            </p>
            <p className="text-sm text-gray-500">Visible on Site</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl font-bold text-gray-400">
              {educators.filter((e) => !e.isActive).length}
            </p>
            <p className="text-sm text-gray-500">Hidden</p>
          </div>
        </div>

        {/* Educators List */}
        {educators.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <UserPen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No educators yet
            </h3>
            <p className="text-gray-400 mb-6">
              Add your first instructor profile to showcase on your landing page
            </p>
            <button
              onClick={openCreateModal}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              Add First Educator
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {educators.map((educator) => (
              <div
                key={educator._id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  educator.isActive
                    ? "border-gray-100"
                    : "border-dashed border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {educator.imageUrl ? (
                      <img
                        src={educator.imageUrl}
                        alt={educator.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-bold text-lg">
                          {educator.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {educator.name}
                      </h3>
                      {!educator.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    {educator.designation && (
                      <p className="text-sm text-indigo-600 font-medium mb-2">
                        {educator.designation}
                      </p>
                    )}
                    {educator.about && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {educator.about}
                      </p>
                    )}
                    {educator.socialLinks &&
                      Object.values(educator.socialLinks).some(Boolean) && (
                        <div className="flex items-center gap-2 mt-2">
                          {SOCIAL_FIELDS.filter(
                            ({ key }) => educator.socialLinks[key]
                          ).map(({ key, Icon }) => (
                            <a
                              key={key}
                              href={educator.socialLinks[key]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-indigo-600 transition"
                            >
                              <Icon className="w-4 h-4" />
                            </a>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(educator._id, educator.isActive)}
                      className={`p-2 rounded-lg transition ${
                        educator.isActive
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={educator.isActive ? "Hide from site" : "Show on site"}
                    >
                      {educator.isActive ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(educator)}
                      className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(educator._id)}
                      className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Educator" : "Add Educator"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5 max-h-[75vh] overflow-y-auto"
            >
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Profile Photo
                </label>
                {photoPreview ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="educator-photo-change"
                      />
                      <label
                        htmlFor="educator-photo-change"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 cursor-pointer transition-colors text-xs"
                      >
                        <Upload className="w-3.5 h-3.5" /> Change
                      </label>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="educator-photo-upload"
                    />
                    <label htmlFor="educator-photo-upload" className="cursor-pointer">
                      <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">
                        Click to upload photo
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. William Samuel"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                  required
                  maxLength={100}
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Designation
                </label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                  placeholder="e.g. Senior Mathematics Instructor"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                  maxLength={150}
                />
              </div>

              {/* About */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  About
                </label>
                <textarea
                  value={form.about}
                  onChange={(e) => setForm({ ...form, about: e.target.value })}
                  placeholder="A short bio about the instructor..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {form.about.length}/1000
                </p>
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Social Links
                </label>
                <div className="space-y-2">
                  {SOCIAL_FIELDS.map(({ key, Icon, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={form.socialLinks[key]}
                        onChange={(e) => handleSocialChange(key, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingPhoto
                    ? "Uploading photo..."
                    : submitting
                    ? "Saving..."
                    : editingId
                    ? "Update"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEducators;
