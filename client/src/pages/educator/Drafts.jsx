import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  FileText, Edit3, Trash2, Clock, BookOpen,
  PlayCircle, DollarSign, AlertCircle, Search,
  Send, MoreVertical, Copy
} from "lucide-react";

const Drafts = () => {
  const { backendUrl, getToken, currency, isEducator } = useContext(AppContext);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch DRAFT courses
  const fetchDrafts = async () => {
    try {
      const token = await getToken();
      // Use status=draft
      const { data } = await axios.get(`${backendUrl}/api/v1/courses/instructor?status=draft`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setDrafts(data.courses || []);
      }
    } catch (error) {
      console.error("Error fetching drafts:", error);
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEducator) {
      fetchDrafts();
    }
  }, [isEducator]);

  const handleDelete = async (draftId) => {
    setDeleting(true);
    try {
      const token = await getToken();
      // DELETE will archive the course
      const { data } = await axios.delete(`${backendUrl}/api/v1/courses/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        toast.success("Draft archived successfully");
        setDrafts(drafts.filter(d => d._id !== draftId));
        setShowDeleteModal(false);
        setSelectedDraft(null);
      }
    } catch (error) {
      // Handle specific error
      toast.error(error.response?.data?.message || "Failed to delete draft");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async (draftId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/v1/courses/${draftId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Course published successfully! Moved to My Courses.");
        fetchDrafts();
      }
    } catch (error) {
      const errorData = error.response?.data;
      
      if (errorData?.missingSteps && errorData.missingSteps.length > 0) {
        toast.error(`Please complete these steps: ${errorData.missingSteps.join(', ')}`, {
          autoClose: 5000
        });
      } else if (errorData?.details) {
        toast.error(`Course needs at least 1 section with 1 lecture. Current: ${errorData.details.sections} section(s), ${errorData.details.lectures} lecture(s)`, {
          autoClose: 5000
        });
      } else {
        toast.error(errorData?.error || "Failed to publish course");
      }
    }
  };

  const filteredDrafts = drafts.filter(draft =>
    draft.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper to extract pricing
  const getCoursePricing = (course) => {
    const tiers = course.pricingTiers || [];
    const basicTier = tiers.find((t) => t.tier === "basic");
    const goldTier = tiers.find((t) => t.tier === "gold" || t.tier === "standard");
    const platinumTier = tiers.find((t) => t.tier === "platinum" || t.tier === "premium");

    return {
      basic: basicTier?.price || 0,
      gold: goldTier?.price || 0,
      platinum: platinumTier?.price || 0,
      hasBasic: !!basicTier,
      hasGold: !!goldTier,
      hasPlatinum: !!platinumTier,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="text-indigo-600" />
              Draft Courses
            </h1>
            <p className="text-gray-500 mt-1">
              Continue working on your unfinished courses
            </p>
          </div>
          <Link
            to="/educator/add-course"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <BookOpen size={18} />
            Create New Course
          </Link>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search drafts by title..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Drafts List */}
        {filteredDrafts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? "No drafts found" : "No draft courses yet"}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms"
                : "When you save a course as draft, it will appear here so you can continue editing later."
              }
            </p>
            {!searchTerm && (
              <Link
                to="/educator/add-course"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <BookOpen size={18} />
                Start Creating a Course
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDrafts.map((draft) => {
              // Calculate progress
              const completedSteps = draft.completedSteps || {};
              const progressCount = Object.values(completedSteps).filter(Boolean).length;
              const progressPercent = Math.round((progressCount / 4) * 100);
              const pricing = getCoursePricing(draft);

              return (
                <div
                  key={draft._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Thumbnail */}
                    <div className="md:w-48 h-32 md:h-auto bg-gray-100 flex-shrink-0 relative">
                      {draft.thumbnail?.url ? (
                        <img
                          src={draft.thumbnail.url}
                          alt={draft.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">
                        DRAFT
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                            {draft.title || "Untitled Course"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              Last edited: {formatDate(draft.updatedAt || draft.createdAt)}
                            </span>
                            {(pricing.hasBasic || pricing.hasGold || pricing.hasPlatinum) && (
                              <span className="flex flex-wrap items-center gap-2">
                                <DollarSign size={14} />
                                {pricing.hasBasic && (
                                  <span className="text-xs text-slate-600">
                                    Basic {currency}{(pricing.basic / 100).toFixed(2)}
                                  </span>
                                )}
                                {pricing.hasGold && (
                                  <span className="text-xs text-amber-700">
                                    Gold {currency}{(pricing.gold / 100).toFixed(2)}
                                  </span>
                                )}
                                {pricing.hasPlatinum && (
                                  <span className="text-xs text-cyan-800">
                                    Platinum {currency}{(pricing.platinum / 100).toFixed(2)}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/educator/edit-course/${draft._id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
                          >
                            <Edit3 size={16} />
                            Continue Editing
                          </Link>
                          <button
                            onClick={() => handlePublish(draft._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                            title="Publish Course"
                          >
                            <Send size={16} />
                            Publish
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDraft(draft);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Draft"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Indicator */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">Completion:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${progressPercent}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-gray-700 font-medium">
                            {progressPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Draft?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "<strong>{selectedDraft.title || "Untitled Course"}</strong>"?
                All progress will be permanently lost.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedDraft(null);
                  }}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(selectedDraft._id)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Drafts;
