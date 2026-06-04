const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
  {
    // Course Association
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    instructorId: {
      type: String,
      required: true,
      index: true,
    },

    // Video Details
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Bunny.net Stream Data
    videoGuid: {
      type: String,
      required: true,
      unique: true,
    },
    videoLibraryId: {
      type: Number,
      required: true,
      index: true,
    },
    thumbnailFileName: {
      type: String,
    },
    collectionId: {
      type: String,
    },
    hasMP4Fallback: {
      type: Boolean,
      default: false,
    },

    // Video Status
    status: {
      type: String,
      enum: [
        "QUEUED",
        "PROCESSING",
        "ENCODING",
        "READY",
        "FAILED",
        "UPLOADING",
      ],
      default: "QUEUED",
      index: true,
    },
    bunnyStatus: {
      type: Number,
      default: 0,
    },

    // Video Metadata
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    storageSize: {
      type: Number, // in bytes
      default: 0,
    },
    encodeProgress: {
      type: Number, // 0-100
      default: 0,
    },

    // Usage tracking
    isUsedInLecture: {
      type: Boolean,
      default: false,
    },

    // Upload tracking
    uploadedAt: {
      type: Date,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
VideoSchema.index({ courseId: 1, status: 1 });
VideoSchema.index({ instructorId: 1, courseId: 1 });
VideoSchema.index({ courseId: 1, isUsedInLecture: 1 });

// Statics
VideoSchema.statics.getUnusedVideos = async function (courseId) {
  return this.find({
    courseId,
    isUsedInLecture: false,
    status: "READY",
  }).sort({ createdAt: -1 });
};

VideoSchema.statics.getAllVideosForCourse = async function (courseId) {
  return this.find({ courseId }).sort({ createdAt: -1 });
};

// Methods
VideoSchema.methods.markAsUsed = async function () {
  this.isUsedInLecture = true;
  return this.save();
};

VideoSchema.methods.markAsUnused = async function () {
  this.isUsedInLecture = false;
  return this.save();
};

VideoSchema.methods.updateStatus = async function (status, bunnyStatus = null) {
  this.status = status;
  if (bunnyStatus !== null) {
    this.bunnyStatus = bunnyStatus;
  }
  if (status === "READY" && !this.processedAt) {
    this.processedAt = new Date();
  }
  return this.save();
};

module.exports = mongoose.model("Video", VideoSchema);
