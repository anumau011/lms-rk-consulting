import React, { useState, useEffect, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from "react-hot-toast";
import * as tus from 'tus-js-client';
import {
  LayoutDashboard, List, DollarSign, Upload,
  Settings, CheckCircle, Save, ArrowLeft, Plus,
  FileText, Video, HelpCircle, Trash2, Edit3, GripVertical, ChevronDown, ChevronUp, ChevronRight, X, Play
} from 'lucide-react';
import axios from 'axios';

// Remove trailing slash from env var
const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

// --- API HELPER ---
const createApi = (getToken) => {
  const request = async (endpoint, options = {}) => {
    try {
      const token = await getToken();
      const isFormDataBody = options.body instanceof FormData;

      const headers = {
        ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
      };

      const res = await fetch(`${backendUrl}${endpoint}`, { ...options, headers });

      if (res.status === 204) return { success: true };

      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text };
      }

      if (!res.ok) {
        // Return the full error data from backend to preserve missingSteps, details, etc.
        return {
          success: false,
          error: data.error || data.message || `API Error: ${res.status}`,
          message: data.error || data.message || `API Error: ${res.status}`,
          missingSteps: data.missingSteps,
          details: data.details,
          completedSteps: data.completedSteps
        };
      }

      return data;
    } catch (error) {
      console.error(`API Request Failed [${endpoint}]:`, error);
      return { success: false, error: error.message, message: error.message };
    }
  };

  return {
    createCourse: (title) => request('/api/v1/courses', { method: 'POST', body: JSON.stringify({ title }) }),
    getCourse: (courseId) => request(`/api/v1/courses/${courseId}`),
    updateDetails: (courseId, data) => request(`/api/v1/courses/${courseId}/details`, { method: 'PATCH', body: JSON.stringify(data) }),
    createSection: (courseId, data) => request(`/api/v1/courses/${courseId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
    getSections: (courseId) => request(`/api/v1/courses/${courseId}/sections`),
    updateSection: (courseId, sectionId, data) => request(`/api/v1/courses/${courseId}/sections/${sectionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSection: (courseId, sectionId) => request(`/api/v1/courses/${courseId}/sections/${sectionId}`, { method: 'DELETE' }),
    reorderSections: (courseId, sectionOrders) => request(`/api/v1/courses/${courseId}/sections/reorder`, { method: 'PUT', body: JSON.stringify({ sectionOrders }) }),
    createLecture: (courseId, sectionId, data) => request(`/api/v1/courses/${courseId}/sections/${sectionId}/lectures`, { method: 'POST', body: JSON.stringify(data) }),
    //ok
    // GET /api/courses/:courseId/sections/:sectionId/
    getLectures: (courseId, sectionId) => request(`/api/v1/courses/${courseId}/sections/${sectionId}/lectures`),

    updateLecture: (courseId, lectureId, data) => request(`/api/v1/courses/${courseId}/lectures/${lectureId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    //ok
    deleteLecture: (courseId, lectureId) => request(`/api/v1/courses/${courseId}/lectures/${lectureId}`, { method: 'DELETE' }),
    reorderLectures: (courseId, sectionId, lectureOrders) => request(`/api/v1/courses/${courseId}/sections/${sectionId}/lectures/reorder`, { method: 'PUT', body: JSON.stringify({ lectureOrders }) }),
    getCurriculum: (courseId) => request(`/api/v1/courses/${courseId}/curriculum`),
    updatePricing: (courseId, data) => request(`/api/v1/courses/${courseId}/pricing`, { method: 'PATCH', body: JSON.stringify(data) }),
    publishCourse: (courseId) => request(`/api/v1/courses/${courseId}/publish`, { method: 'POST' }),
    unpublishCourse: (courseId) => request(`/api/v1/courses/${courseId}/unpublish`, { method: 'POST' }),
    getLectureNotes: (courseId, lectureId) => request(`/api/v1/courses/${courseId}/lectures/${lectureId}/notes`),
    uploadLectureNote: (courseId, lectureId, formData) => request(`/api/v1/courses/${courseId}/lectures/${lectureId}/notes/upload`, { method: 'POST', body: formData }),
    deleteLectureNote: (courseId, lectureId, noteId) => request(`/api/v1/courses/${courseId}/lectures/${lectureId}/notes/${noteId}`, { method: 'DELETE' }),
  };
};

// --- DRAG & DROP COMPONENTS ---

const DraggableLecture = ({ lecture, index, sectionId, onMove, onDelete, onEdit, api, courseId }) => {
  const { getToken } = useAuth();


  const [{ isDragging }, drag] = useDrag({
    type: 'LECTURE',
    item: { index, sectionId, lectureId: lecture._id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: 'LECTURE',
    hover: (item) => {
      if (item.sectionId !== sectionId) return;
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  const [isExpanded, setIsExpanded] = useState(false);


  // Local video state (updated immediately after upload)
  const [localVideoInfo, setLocalVideoInfo] = useState(null);

  // Video state - use local state if available, otherwise fall back to lecture prop
  const hasVideo = !!localVideoInfo?.videoGuid || !!lecture?.videoId?.videoGuid;
  const videoGuid = localVideoInfo?.videoGuid || lecture?.videoId?.videoGuid || '';
  const videoLibraryId = localVideoInfo?.videoLibraryId || lecture?.videoId?.videoLibraryId || '';
  const thumbnailFileName = localVideoInfo?.thumbnailFileName || lecture?.videoId?.thumbnailFileName || 'thumbnail.jpg';
  const videoDuration = lecture?.videoId?.duration || 0;
  const videoTitle = localVideoInfo?.videoTitle || lecture?.videoId?.title || 'Uploaded Video';

  const [isPreview, setIsPreview] = useState(hasVideo);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const [signedVideoUrl, setSignedVideoUrl] = useState(null);
  const [signedThumbnailUrl, setSignedThumbnailUrl] = useState(null);
  const [loadingVideoUrl, setLoadingVideoUrl] = useState(false);
  const [isFreePreview, setIsFreePreview] = useState(lecture.isFreePreview || false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Additional video-related states for legacy code compatibility
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [libraryId, setLibraryId] = useState('');

  // Notes upload states
  const [notesUploading, setNotesUploading] = useState(false);
  const [notesProgress, setNotesProgress] = useState(0);
  const [notesStatus, setNotesStatus] = useState('');
  const [selectedNotesFile, setSelectedNotesFile] = useState(null);
  const [notesList, setNotesList] = useState(Array.isArray(lecture.notes) ? lecture.notes : []);
  const [isVideoSectionExpanded, setIsVideoSectionExpanded] = useState(true);
  const [isNotesSectionExpanded, setIsNotesSectionExpanded] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const formatBytes = (value = 0) => {
    if (!value || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const amount = value / (1024 ** index);
    return `${amount.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  };

  // Update video state when lecture prop changes (e.g., after loading from DB)
  useEffect(() => {
    if (lecture.videoId?.videoGuid) {
      setVideoUrl(lecture.videoUrl);
      setIsPreview(true);
      setVideoData({
        filename: lecture.videoId?.title || 'Uploaded Video.mp4',
        duration: lecture.videoId?.duration || '00:00',
        thumbnail: lecture.videoId?.thumbnailFileName,
        downloadable: lecture.isDownloadable || false,
        isFreePreview: lecture.isFreePreview || false
      });
      setHasUnsavedChanges(false);
    }

    const lectureNotes = Array.isArray(lecture.notes) ? lecture.notes : [];
    setNotesList(lectureNotes);
    setShowNotes(lectureNotes.length > 0);
  }, [lecture]);



  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = await getToken();

      // Get upload credentials from Bunny CDN API
      const response = await fetch(`${backendUrl}/api/v1/media/bunny/sign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: file.name, lectureId: lecture._id, courseId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload credentials");
      }

      const credentials = await response.json();
      console.log("Received credentials:", credentials);

      // Create TUS upload
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: {
          AuthorizationSignature: credentials.signature,
          AuthorizationExpire: credentials.expirationTime,
          VideoId: credentials.videoId,
          LibraryId: credentials.libraryId,
        },
        metadata: {
          filetype: file.type,
          title: file.name,
        },
        onError(error) {
          console.error("Upload error:", error);
          setUploading(false);
          setUploadStatus('');
          toast.error("Upload failed: " + error.message);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const progress = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(progress);
        },
        onSuccess: async () => {
          const videoInfo = {
            videoGuid: credentials.videoId,
            videoLibraryId: credentials.libraryId,
            videoTitle: file.name,
            thumbnailFileName: 'thumbnail.jpg',
          };
          setLocalVideoInfo(videoInfo);
          setUploading(false);
          setIsPreview(true);
          setHasUnsavedChanges(false);
          setSelectedFile(null);
          toast.success("Video uploaded successfully! Processing will begin shortly.");

        },
      });

      // Store upload instance for cancellation
      setCurrentUpload(upload);

      // Resume previous upload if available
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      upload.start();
    } catch (error) {
      console.error('Upload initialization error:', error);
      setUploading(false);
      setUploadStatus('');
      toast.error("Failed to start upload: " + error.message);
    }
  };

  const handleCancelUpload = () => {
    // Abort the current upload if it exists
    if (currentUpload) {
      currentUpload.abort(true);
      setCurrentUpload(null);
    }

    setUploading(false);
    setUploadProgress(0);
    setSelectedFile(null);
    toast.info('Upload cancelled');
  };

  const handleRemoveVideo = async () => {
    if (window.confirm("Remove this video?")) {
      try {
        // Clear video from lecture on backend
        const result = await api.updateLecture(courseId, lecture._id, { video: null });
        if (result.success) {
          setLocalVideoInfo(null);
          setIsPreview(false);
          setSelectedFile(null);
          setUploadStatus('');
          toast.success('Video removed');
        } else {
          toast.error('Failed to remove video');
        }
      } catch (error) {
        console.error('Error removing video:', error);
        toast.error('Error removing video');
      }
    }
  };

  const toggleFreePreview = () => {
    setIsFreePreview(prev => !prev);
    setHasUnsavedChanges(true);
  };

  const handleSaveVideo = async () => {
    setIsSavingVideo(true);
    try {
      const updateData = {
        _id: localVideoInfo?._id || lecture.videoId?._id,
        videoTitle: localVideoInfo?.title || lecture.videoId?.title || lecture.title,
        isFreePreview: isFreePreview
      };

      const result = await api.updateLecture(courseId, lecture._id, updateData);

      if (result.success) {
        setHasUnsavedChanges(false);
        toast.success('Lecture updated successfully!');
      } else {
        toast.error('Failed to update lecture');
      }
    } catch (error) {
      console.error('Error updating lecture:', error);
      toast.error('Error updating lecture');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleNotesSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedNotesFile(file);
    setNotesStatus('uploading');
    setNotesUploading(true);
    setNotesProgress(0);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${backendUrl}/api/v1/courses/${courseId}/lectures/${lecture._id}/notes/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size;
            const percent = Math.round((progressEvent.loaded / total) * 100);
            setNotesProgress(percent);
          },
        },
      );

      const savedNote = response?.data?.note;
      if (!savedNote) {
        throw new Error('Invalid response while saving note');
      }

      setNotesList((prev) => [savedNote, ...prev]);
      setShowNotes(true);
      setNotesStatus('complete');
      toast.success('Notes uploaded successfully!');
    } catch (error) {
      console.error('Error uploading notes:', error);
      const errorMessage = error?.response?.data?.error || error.message;
      toast.error(`Failed to upload notes: ${errorMessage}`);
      setNotesStatus('');
    } finally {
      setNotesUploading(false);
      setSelectedNotesFile(null);
      e.target.value = '';
    }
  };

  const handleCancelNotesUpload = () => {
    setNotesUploading(false);
    setNotesProgress(0);
    setNotesStatus('');
    setSelectedNotesFile(null);
  };

  const handleRemoveNotes = async (noteId) => {
    if (!window.confirm('Remove this file?')) return;

    try {
      const result = await api.deleteLectureNote(courseId, lecture._id, noteId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete note');
      }

      setNotesList((prev) => prev.filter((note) => note._id !== noteId));
      toast.success('Notes removed successfully!');
    } catch (error) {
      console.error('Error removing notes:', error);
      toast.error(`Error removing notes: ${error.message}`);
    }
  };

  const fetchNoteBlob = async (noteId, shouldDownload = false) => {
    const token = await getToken();
    const response = await axios.get(
      `${backendUrl}/api/v1/courses/${courseId}/lectures/${lecture._id}/notes/${noteId}/file${shouldDownload ? '?download=1' : ''}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  };

  const handlePreviewNote = async (note) => {
    try {
      const blob = await fetchNoteBlob(note._id, false);
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      const errorMessage = error?.response?.data?.error || error.message;
      toast.error(`Failed to preview file: ${errorMessage}`);
    }
  };

  const handleDownloadNote = async (note) => {
    try {
      const blob = await fetchNoteBlob(note._id, true);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = note.name || 'note-file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const errorMessage = error?.response?.data?.error || error.message;
      toast.error(`Failed to download file: ${errorMessage}`);
    }
  };

  const handleThumbnailLoad = async () => {
    const token = await getToken();
    const response = await axios.get(`${backendUrl}/api/video/${lecture._id}/signed-thumbnail-url`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Received thumbnail URL:', response.data.thumbnailUrl);
    setThumbnailUrl(response.data.thumbnailUrl);
  }

  const handleVideoLoad = async () => {
    const token = await getToken();
    const response = await axios.get(`${backendUrl}/api/video/${lecture._id}/signed-video-url`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Received video URL:', response.data.playbackUrl);
    setSignedVideoUrl(response.data.playbackUrl);
  }

  const closeLectureVideoPreview = () => {
    setShowVideoPlayer(false);
    setSignedVideoUrl(null);
  };

  const closeLibraryVideoPreview = () => {
  };

  return (
    <div ref={(node) => drag(drop(node))} className={`bg-white border border-gray-100 rounded-lg group mb-2 transition-all ${isDragging ? 'opacity-50' : ''}`}>
      {/* Lecture Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-indigo-600"><GripVertical size={16} /></div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-gray-800" />
              <span className="text-sm font-medium text-gray-700">Lecture {index + 1}: {lecture.title}</span>
              <button onClick={() => onEdit(lecture)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit3 size={12} /></button>
              <button onClick={() => onDelete(lecture._id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
            </div>

            <div className="flex items-center gap-2">
              {/* Content indicators when collapsed and has content */}
              {/* //TODO */}
              {!isExpanded && hasVideo && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                    <Video size={12} /> Video
                  </span>
                  {showNotes && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      <FileText size={12} /> Notes
                    </span>
                  )}
                </div>
              )}

              {/* Free Preview Toggle - Show when video exists */}
              {hasVideo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Free Preview:</span>
                  <button
                    onClick={toggleFreePreview}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isFreePreview ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isFreePreview ? 'translate-x-5' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  {isFreePreview && (
                    <span className="text-xs font-medium text-green-600">✓ Free</span>
                  )}
                </div>
              )}

              {/* Save Button - Show when there are unsaved changes */}
              {hasUnsavedChanges && hasVideo && (
                <button
                  onClick={handleSaveVideo}
                  disabled={isSavingVideo}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSavingVideo ? 'Saving...' : 'Save'}
                </button>
              )}

              {/* Add Content button - only visible if no content attached */}
              {/* TODO */}
              {!hasVideo && !isPreview && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isExpanded ? 'bg-gray-100 text-gray-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  <Plus size={14} />
                  Content
                </button>
              )}

              {/* Expand/Collapse arrows - always visible */}
              <button
                onClick={() => { handleThumbnailLoad(); setIsExpanded(!isExpanded); }}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area (Expanded) */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg space-y-4">

          {/* 1. VIDEO SECTION */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* video header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsVideoSectionExpanded((prev) => !prev)}
                className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-indigo-600"
              >
                {isVideoSectionExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                Video Content
              </button>
              <div className="flex items-center gap-2">
                {/* ok */}
                {!isPreview && hasVideo && (
                  <button
                    onClick={() => setIsPreview(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {isVideoSectionExpanded && <div className="p-4">
              {isPreview && hasVideo ? (
                <div className="space-y-3">
                  {/* Video Preview Card */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Thumbnail */}
                    <div
                      className="w-32 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300"
                      onClick={() => { handleVideoLoad(); setShowVideoPlayer(true); }}
                    >
                      <img
                        src={thumbnailUrl}
                        alt={"Thumbnail not found"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('bg-gradient-to-br', 'from-indigo-600', 'to-purple-600');
                        }}
                      />
                      {/* Play Button Overlay - appears on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300">
                        <div className="transform scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="w-12 h-12 rounded-full bg-white bg-opacity-90 flex items-center justify-center shadow-lg">
                            <Play size={20} className="text-indigo-600 ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-1">{videoTitle}</h5>
                      {videoDuration > 0 && <p className="text-sm text-gray-500">{videoDuration}</p>}
                      <button onClick={() => setIsPreview(false)} className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-1 hover:underline">
                        <Edit3 size={14} /> Edit Content
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {/* Settings or additional actions can go here */}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between border-b border-gray-200 mb-4">
                    <div className="flex">
                      <button className="px-4 py-2 text-sm font-medium border-b-2 border-indigo-600 text-indigo-600">
                        Upload Video
                      </button>
                    </div>
                  </div>

                  <div>
                    {uploading ? (
                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Filename</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700"></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-100">
                                <td className="px-4 py-3 text-gray-900">{selectedFile?.name || 'v2o.mp4'}</td>
                                <td className="px-4 py-3 text-gray-600">Video</td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                          className="bg-indigo-600 h-full transition-all duration-300"
                                          style={{ width: `${uploadProgress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-600 w-12">{uploadProgress}%</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">01/30/2026</td>
                                <td className="px-4 py-3 text-right">
                                  <button onClick={handleCancelUpload} className="text-red-500 hover:text-red-700">
                                    <X size={16} />
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id={`video-upload-${lecture._id}`}
                          />
                          <div className="flex-1 text-gray-500 text-sm">
                            {selectedFile ? selectedFile.name : 'No file selected'}
                          </div>
                          <label
                            htmlFor={`video-upload-${lecture._id}`}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 cursor-pointer"
                          >
                            Select Video
                          </label>
                        </div>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Note:</span> All files should be at least 720p and less than 4.0 GB.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>}
          </div>

          {/* 2. NOTES / RESOURCES SECTION - Optional Toggle */}
          <div className="mt-4">
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-indigo-500 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-all"
              >
                <Plus size={16} /> Notes
              </button>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setIsNotesSectionExpanded((prev) => !prev)}
                    className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-indigo-600"
                  >
                    {isNotesSectionExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    Lecture Notes
                  </button>
                  <div className="flex items-center gap-2">
                    {notesList.length === 0 && (
                      <button
                        onClick={() => { setShowNotes(false); }}
                        className="text-xs text-gray-500 hover:text-red-500 font-medium"
                      >
                        Remove Section
                      </button>
                    )}
                  </div>
                </div>
                {isNotesSectionExpanded && <div className="p-4">
                  {notesList.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt,.doc"
                          onChange={handleNotesSelect}
                          className="hidden"
                          id={`notes-upload-more-${lecture._id}`}
                        />
                        <label
                          htmlFor={`notes-upload-more-${lecture._id}`}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer"
                        >
                          Add More Notes
                        </label>
                      </div>
                      {notesList.map((note) => (
                        <div key={note._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="w-12 h-12 bg-indigo-50 rounded flex items-center justify-center flex-shrink-0">
                            <FileText size={24} className="text-indigo-600" />
                          </div>

                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">{note.name}</h5>
                            <p className="text-sm text-gray-500">{note.type} • {formatBytes(note.size)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handlePreviewNote(note)}
                              className="px-3 py-1.5 text-indigo-600 border border-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownloadNote(note)}
                              className="px-3 py-1.5 text-indigo-600 border border-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleRemoveNotes(note._id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Remove File
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {notesUploading ? (
                        <div className="space-y-4">
                          {/* Upload Status Table */}
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Filename</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                                  <th className="px-4 py-3 text-right font-semibold text-gray-700"></th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-100">
                                  <td className="px-4 py-3 text-gray-900">{selectedNotesFile?.name || 'document.pdf'}</td>
                                  <td className="px-4 py-3 text-gray-600">Document</td>
                                  <td className="px-4 py-3">
                                    {notesStatus === 'uploading' && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                              className="bg-indigo-600 h-full transition-all duration-300"
                                              style={{ width: `${notesProgress}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-gray-600 w-12">{notesProgress}%</span>
                                        </div>
                                      </div>
                                    )}
                                    {notesStatus === 'processing' && (
                                      <span className="text-indigo-600 font-medium">Processing</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">01/30/2026</td>
                                  <td className="px-4 py-3 text-right">
                                    {notesStatus === 'uploading' && (
                                      <button onClick={handleCancelNotesUpload} className="text-red-500 hover:text-red-700">
                                        <X size={16} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* File Selector */}
                          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                            <input
                              type="file"
                              accept=".pdf,.docx,.txt,.doc"
                              onChange={handleNotesSelect}
                              className="hidden"
                              id={`notes-upload-${lecture._id}`}
                            />
                            <div className="flex-1 text-gray-500 text-sm">
                              {selectedNotesFile ? selectedNotesFile.name : 'No file selected'}
                            </div>
                            <label
                              htmlFor={`notes-upload-${lecture._id}`}
                              className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 cursor-pointer"
                            >
                              Select File
                            </label>
                          </div>
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Note:</span> PDF, DOCX, TXT files up to 5MB.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Video Player Modal - Lecture Video */}
      {showVideoPlayer && videoGuid && videoLibraryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={closeLectureVideoPreview}>
          <div className="relative w-full max-w-5xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeLectureVideoPreview}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-2 bg-black bg-opacity-50 px-4 py-2 rounded-lg"
            >
              <X size={24} />
              <span className="text-sm font-medium">Close</span>
            </button>
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl">
              <iframe
                key={signedVideoUrl || 'empty-video'}
                src={signedVideoUrl}
                loading="lazy"
                style={{ border: 0, position: 'absolute', top: 0, height: '100%', width: '100%' }}
                allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                allowFullScreen={true}
                className="rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


const DraggableSection = ({ section, index, courseId, onMove, onDelete, onEdit, api }) => {
  const [lectures, setLectures] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddLecture, setShowAddLecture] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [hasReordered, setHasReordered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadLectures(); }, [section._id]);

  const loadLectures = async () => {
    const result = await api.getLectures(courseId, section._id);
    if (result.success) {
      setLectures(result.lectures);
      setHasReordered(false);
    }
  };

  const handleCreateLectureInline = async () => {
    if (!newLectureTitle.trim()) return;
    const result = await api.createLecture(courseId, section._id, { title: newLectureTitle, lectureType: 'VIDEO' });
    if (result.success) {
      setNewLectureTitle('');
      setShowAddLecture(false);
      loadLectures();
      toast.success('Lecture added');
    }
  };

  const handleMoveLecture = (fromIndex, toIndex) => {
    const updated = [...lectures];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setLectures(updated);
    setHasReordered(true);
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const lectureOrders = lectures.map((lectureItem, lectureIndex) => ({ lectureId: lectureItem._id, order: lectureIndex }));
      await api.reorderLectures(courseId, section._id, lectureOrders);
      setHasReordered(false);
      toast.success('Lecture order saved');
    } catch (error) {
      toast.error('Failed to save lecture order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelReorder = () => {
    loadLectures();
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm('Delete this lecture?')) return;
    await api.deleteLecture(courseId, lectureId);
    loadLectures();
    toast.success('Lecture deleted');
  };

  const [{ isDragging }, drag] = useDrag({
    type: 'SECTION',
    item: { index, sectionId: section._id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: 'SECTION',
    hover: (item) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div ref={(node) => drag(drop(node))} className={`bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-6 ${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100 group">
        <div className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-indigo-600"><GripVertical size={18} /></div>
        <h3 className="flex-1 font-bold text-gray-900">Section {index + 1}: {section.title}</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(section)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit3 size={14} /></button>
            <button onClick={() => onDelete(section._id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-2">
          {hasReordered && (
            <div className="flex items-center justify-end gap-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm text-amber-700 font-medium">Unsaved changes</span>
              <button
                onClick={handleCancelReorder}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={14} /> {isSaving ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          )}

          {lectures.map((lecture, idx) => (
            <DraggableLecture
              key={lecture._id}
              lecture={lecture}
              index={idx}
              sectionId={section._id}
              courseId={courseId}
              onMove={handleMoveLecture}
              onDelete={handleDeleteLecture}
              onEdit={(lec) => {
                const newTitle = prompt('Edit lecture title:', lec.title);
                if (newTitle && newTitle.trim()) {
                  api.updateLecture(courseId, lec._id, { title: newTitle.trim() }).then(() => {
                    loadLectures();
                    toast.success('Lecture updated');
                  });
                }
              }}
              api={api}
            />
          ))}

          {showAddLecture ? (
            <div className="mt-2 bg-white border border-indigo-200 rounded-lg p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-500">New Lecture:</span>
                <input
                  autoFocus
                  value={newLectureTitle}
                  onChange={(e) => setNewLectureTitle(e.target.value)}
                  placeholder="Enter a Title"
                  className="flex-1 text-sm p-1 border-b border-gray-200 focus:border-indigo-500 outline-none transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLectureInline()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddLecture(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={handleCreateLectureInline} disabled={!newLectureTitle.trim()} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">Add Lecture</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddLecture(true)}
              className="w-full py-2 flex items-center justify-center px-3 hover:bg-gray-100 rounded-lg group transition-colors mt-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-500 group-hover:text-indigo-600">
                <Plus size={16} /> Add Lecture
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TabCurriculum = ({ courseId, api }) => {
  // ok
  const [sections, setSections] = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [hasReordered, setHasReordered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadSections(); }, [courseId]);
  // ok
  const loadSections = async () => {
    const result = await api.getSections(courseId);
    if (result.success) {
      setSections(result.sections);
      setHasReordered(false);
    }
  };
  // ok
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    const result = await api.createSection(courseId, { title: newSectionTitle });
    if (result.success) {
      loadSections();
      setNewSectionTitle('');
      setShowAddSection(false);
      toast.success('Section added');
    }
  };
  // ok 
  const handleMoveSection = (from, to) => {
    const updated = [...sections];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setSections(updated);
    setHasReordered(true);
  };
  // ok
  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const sectionOrders = sections.map((s, i) => ({ sectionId: s._id, order: i }));
      await api.reorderSections(courseId, sectionOrders);
      setHasReordered(false);
      toast.success('Section order saved');
    } catch (error) {
      toast.error('Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };
  //ok
  const handleCancelReorder = () => {
    loadSections();
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Curriculum</h2>
            <p className="text-sm text-gray-500">Plan and create your course content.</p>
          </div>
        </div>

        {/* Save Order Button */}
        {hasReordered && (
          <div className="flex items-center justify-end gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-sm text-amber-700 font-medium">Unsaved changes to section order</span>
            <button
              onClick={handleCancelReorder}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        )}

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <DraggableSection
              key={section._id} section={section} index={idx} courseId={courseId}
              onMove={handleMoveSection}
              onDelete={async (id) => {
                if (window.confirm('Delete this section and all its lectures?')) {
                  await api.deleteSection(courseId, id);
                  loadSections();
                  toast.success('Section deleted');
                }
              }}
              onEdit={async (sec) => {
                const newTitle = prompt('Edit section title:', sec.title);
                if (newTitle && newTitle.trim()) {
                  await api.updateSection(courseId, sec._id, { title: newTitle.trim() });
                  loadSections();
                  toast.success('Section updated');
                }
              }}
              onAddLecture={() => { /* Handled internally now */ }}
              api={api}
            />
          ))}

          {/* Inline Add Section */}
          {showAddSection ? (
            <div className="bg-gray-50 border border-indigo-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-bold text-gray-900">New Section:</span>
                <input
                  autoFocus
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  placeholder="Enter Section Title"
                  className="flex-1 p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddSection(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                <button onClick={handleAddSection} disabled={!newSectionTitle.trim()} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">Add Section</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add Section
            </button>
          )}
        </div>
      </div>
    </DndProvider>
  );
};

const TabDetails = ({ courseId, api, initialData }) => {
  const [formData, setFormData] = useState({
    title: '', subtitle: '', description: '', category: 'development', level: 'all-levels',
    ...initialData // Pre-fill if available
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail || null);
  const [uploading, setUploading] = useState(false);
  const { getToken } = useAuth();

  // Update local state if initialData loads later
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      if (initialData.thumbnail) setThumbnailPreview(initialData.thumbnail);
    }
  }, [initialData]);

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadThumbnail = async () => {
    if (!thumbnail) return null;

    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('thumbnail', thumbnail);

      const response = await fetch(`${backendUrl}/api/v1/media/upload-thumbnail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to upload thumbnail');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const removeThumbnail = async () => {
    if (window.confirm('Remove course thumbnail?')) {
      try {
        setThumbnail(null);
        setThumbnailPreview(null);

        // Update course to remove thumbnail
        const result = await api.updateDetails(courseId, {
          ...formData,
          thumbnail: null
        });

        if (result.success) {
          setFormData(prev => ({ ...prev, thumbnail: null }));
          toast.success('Thumbnail removed successfully');
        } else {
          toast.error('Failed to remove thumbnail');
        }
      } catch (error) {
        console.error('Error removing thumbnail:', error);
        toast.error('Error removing thumbnail');
      }
    }
  };

  const handleSave = async () => {
    try {
      let thumbnailData = formData.thumbnail;

      // Upload thumbnail if changed
      if (thumbnail) {
        thumbnailData = await uploadThumbnail();
      } else if (!thumbnailPreview) {
        // Thumbnail was removed
        thumbnailData = null;
      }

      const updatedData = {
        ...formData,
        thumbnail: thumbnailData
      };

      const result = await api.updateDetails(courseId, updatedData);
      if (result.success) {
        toast.success('Details saved successfully');
        setThumbnail(null);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error('Failed to save details');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Course Details</h2>
          <p className="text-sm text-gray-500">Edit the basic information for your course</p>
        </div>
        <button onClick={handleSave} disabled={uploading} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          <Save size={18} /> {uploading ? 'Uploading...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        {/* Thumbnail Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Course Thumbnail</label>
          {thumbnailPreview ? (
            <div className="space-y-3">
              <div className="relative inline-block w-full max-w-md">
                <img src={thumbnailPreview} alt="Course thumbnail" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
                <button
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                  title="Remove thumbnail"
                >
                  <X size={16} />
                </button>
              </div>

              {thumbnail && (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-medium">
                    New thumbnail selected - click Save to upload
                  </span>
                </div>
              )}

              {/* Change Thumbnail Button */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                  id="thumbnail-change"
                />
                <label
                  htmlFor="thumbnail-change"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  <Upload size={16} /> Change Thumbnail
                </label>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="hidden"
                id="thumbnail-upload"
              />
              <label htmlFor="thumbnail-upload" className="cursor-pointer">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload size={24} className="text-indigo-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Click to upload course thumbnail</p>
                <p className="text-xs text-gray-500">PNG, JPG up to 5MB (Recommended: 1280x720)</p>
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
          <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Complete React Guide" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
          <input value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} className="w-full p-3 border border-gray-200 rounded-lg" placeholder="Short description" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={5} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 border border-gray-200 rounded-lg" placeholder="Detailed course description" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 border border-gray-200 rounded-lg">
              <option value="development">Development</option>
              <option value="business">Business</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} className="w-full p-3 border border-gray-200 rounded-lg">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all-levels">All Levels</option>
            </select>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 mb-2">Course Enrollment Expiration</label>
              <p className="text-xs text-gray-600 mb-3">How long students can access the course after purchase (in months)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.enrollmentExpirationMonths || 12}
                  onChange={e => setFormData({ ...formData, enrollmentExpirationMonths: Math.max(1, Math.min(120, parseInt(e.target.value) || 12)) })}
                  className="w-24 p-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-sm text-gray-600">months</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Example: 12 months = access for 1 year from purchase</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabPricing = ({ courseId, api, initialData }) => {
  const [pricingTiers, setPricingTiers] = useState([
    { tier: 'basic', price: 0, discount: 0, features: [], isActive: true },
    { tier: 'gold', price: 0, discount: 0, features: [], isActive: true },
    { tier: 'platinum', price: 0, discount: 0, features: [], isActive: true },
  ]);
  const [newFeature, setNewFeature] = useState({ basic: '', gold: '', platinum: '' });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (initialData?.pricingTiers && Array.isArray(initialData.pricingTiers) && initialData.pricingTiers.length > 0) {
      setPricingTiers(initialData.pricingTiers);
      setIsInitialized(true);
    } else if (initialData && !isInitialized) {
      setIsInitialized(true);
    }
  }, [initialData]);

  const calculateFinalPrice = (price, discount) => {
    if (!price || !discount) return price;
    return price - (price * discount / 100);
  };

  const updateTier = (idx, field, val) => {
    const updated = [...pricingTiers];
    updated[idx][field] = val;
    setPricingTiers(updated);
  };

  const addFeature = (idx, tierName) => {
    if (!newFeature[tierName]?.trim()) return;
    const updated = [...pricingTiers];
    if (!updated[idx].features) updated[idx].features = [];
    updated[idx].features.push(newFeature[tierName].trim());
    setPricingTiers(updated);
    setNewFeature({ ...newFeature, [tierName]: '' });
  };

  const removeFeature = (idx, featureIdx) => {
    const updated = [...pricingTiers];
    updated[idx].features.splice(featureIdx, 1);
    setPricingTiers(updated);
  };

  const handleSave = async () => {
    try {
      const result = await api.updatePricing(courseId, { pricingTiers });
      if (result.success) {
        toast.success('Pricing saved successfully');
        // Update initialData to reflect saved changes
        if (initialData) {
          initialData.pricingTiers = result.course?.pricingTiers || pricingTiers;
        }
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error('Failed to save pricing');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pricing</h2>
          <p className="text-sm text-gray-500">Manage pricing tiers</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700">
          <Save size={18} /> Save Changes
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {pricingTiers.map((tier, idx) => {
          const getTierBorderStyle = (tierName) => {
            if (tierName === 'basic') return { borderTop: '4px solid #3b82f6' };
            if (tierName === 'gold') return { borderTop: '4px solid #f59e0b' };
            if (tierName === 'platinum') return { borderTop: '4px solid #a855f7' };
            return { borderTop: '4px solid #d1d5db' };
          };
          return (
            <>

              <div key={idx} style={getTierBorderStyle(tier.tier)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-lg mb-4 capitalize text-indigo-900">{tier.tier} tier</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={tier.price || ''}
                    onChange={(e) => updateTier(idx, 'price', Number(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter price in rupees"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    value={tier.discount || ''}
                    onChange={(e) => updateTier(idx, 'discount', Number(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter discount percentage"
                    min="0"
                    max="100"
                  />
                  {tier.price > 0 && (
                    <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Original Price:</span>
                        <span className="font-medium text-gray-900">₹{tier.price.toLocaleString('en-IN')}</span>
                      </div>
                      {tier.discount > 0 && (
                        <>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Discount ({tier.discount}%):</span>
                            <span className="font-medium text-red-600">-₹{((tier.price * tier.discount / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-indigo-200">
                            <span className="font-semibold text-gray-700">Final Price:</span>
                            <span className="font-bold text-green-600">₹{calculateFinalPrice(tier.price, tier.discount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Features Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Features</label>
                  <div className="space-y-2 mb-2">
                    {tier.features?.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <span className="text-sm text-gray-700">{feature}</span>
                        <button
                          onClick={() => removeFeature(idx, fIdx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={newFeature[tier.tier] || ''}
                      onChange={(e) => setNewFeature({ ...newFeature, [tier.tier]: e.target.value })}
                      placeholder="Add feature"
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && addFeature(idx, tier.tier)}
                    />
                  </div>
                  <div className="w-full mt-2">
                    <button
                      onClick={() => addFeature(idx, tier.tier)}
                      className="w-full px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Feature
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </>
          );
        })}
      </div>
    </div>
  );
};

const TabPublish = ({ courseId, api, isPublished, onStatusChange }) => {
  const navigate = useNavigate();

  const handlePublish = async () => {
    if (!window.confirm("Are you ready to publish this course?")) return;
    const result = await api.publishCourse(courseId);
    if (result.success) {
      toast.success("Course Published!");
      onStatusChange('published');
      navigate('/educator/my-courses');
    } else {
      // Show detailed error messages
      if (result.missingSteps && result.missingSteps.length > 0) {
        toast.error(`Please complete these steps: ${result.missingSteps.join(', ')}`, {
          autoClose: 5000
        });
      } else if (result.details) {
        toast.error(`Course needs at least 1 section with 1 lecture. Current: ${result.details.sections} section(s), ${result.details.lectures} lecture(s)`, {
          autoClose: 5000
        });
      } else {
        toast.error(result.error || result.message || "Failed to publish course");
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Publish?</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Review your settings before making your course live. Students will be able to enroll immediately.
      </p>
      <button onClick={handlePublish} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-200 transition-all hover:scale-105">
        Publish Course Now
      </button>
    </div>
  );
};

// --- MAIN PAGE COMPONENTS ---

const CourseInitiator = () => {
  const { getToken } = useAuth();
  const api = useMemo(() => createApi(getToken), [getToken]);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const result = await api.createCourse(title);
      if (result.success) {
        navigate(`/educator/edit-course/${result.course._id}`);
      } else {
        toast.error(result.message);
      }
    } catch (e) { toast.error('Failed to create course'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Name Your Course</h1>
        <p className="text-gray-500 mb-6">What would you like to call your new course? Don't worry, you can change this later.</p>
        <form onSubmit={handleCreate}>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Advanced Web Development 2024"
            className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all mb-6"
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/educator')} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={!title.trim() || loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200">
              {loading ? 'Creating...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CourseEditor = ({ courseId }) => {
  const { getToken } = useAuth();
  const api = useMemo(() => createApi(getToken), [getToken]);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('curriculum');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      const result = await api.getCourse(courseId);
      if (result.success) setCourse(result.course);
      // else toast.error('Failed to load course');
      setLoading(false);
    };
    fetchCourse();
  }, [courseId, api]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  if (!course) return <div className="p-8 text-center text-red-500">Course not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 min-h-screen flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <button onClick={() => navigate('/educator/my-courses')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="font-bold text-gray-900 line-clamp-2">{course.title}</h1>
          <span className={`inline-block mt-2 px-2 py-1 text-xs rounded font-medium ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {course.status?.toUpperCase() || 'DRAFT'}
          </span>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { id: 'curriculum', label: 'Curriculum', icon: List },
            { id: 'details', label: 'Course Details', icon: LayoutDashboard },
            { id: 'pricing', label: 'Pricing', icon: DollarSign },
            { id: 'publish', label: 'Publish', icon: Upload },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === 'curriculum' && <TabCurriculum courseId={courseId} api={api} />}
        {activeTab === 'details' && <TabDetails courseId={courseId} api={api} initialData={course} />}
        {activeTab === 'pricing' && <TabPricing courseId={courseId} api={api} initialData={course} />}
        {activeTab === 'publish' && <TabPublish courseId={courseId} api={api} isPublished={course.status === 'published'} onStatusChange={(s) => setCourse({ ...course, status: s })} />}
      </div>
    </div>
  );
};

// --- ROOT COMPONENT ---

const AddCourse = () => {
  const { courseId } = useParams();
  // Decide which mode to render
  return courseId ? <CourseEditor courseId={courseId} /> : <CourseInitiator />;
};

export default AddCourse;