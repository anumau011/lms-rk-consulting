const mongoose = require("mongoose");

const LectureSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isFreePreview: {
      type: Boolean,
      default: false,
    },
    
    // Video Reference
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  },
);

// Indexes
LectureSchema.index({ courseId: 1 });
LectureSchema.index({ sectionId: 1, order: 1 });
LectureSchema.index({ videoId: 1 }, { sparse: true });

// Statics
LectureSchema.statics.getNextOrder = async function (sectionId) {
  const lastLecture = await this.findOne({ sectionId })
    .sort({ order: -1 })
    .select("order");

  return lastLecture ? lastLecture.order + 1 : 0;
};

LectureSchema.statics.reorderLectures = async function (
  sectionId,
  lectureOrders,
) {
  // lectureOrders: [{ lectureId, order }, ...]
  const bulkOps = lectureOrders.map(({ lectureId, order }) => ({
    updateOne: {
      filter: { _id: lectureId, sectionId },
      update: { $set: { order } },
    },
  }));

  return this.bulkWrite(bulkOps);
};

// Methods
LectureSchema.methods.isComplete = async function () {
  if (this.videoId) {
    const Video = require("./Video");
    const video = await Video.findById(this.videoId);
    return video && video.status === "READY";
  }
  return false;
};

LectureSchema.methods.getDuration = async function () {
  if (this.videoId) {
    const Video = require("./Video");
    const video = await Video.findById(this.videoId);
    return video ? video.duration : 0;
  }
  return 0;
};

module.exports = mongoose.model("Lecture", LectureSchema);
