const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    path: {
      type: String,
      required: true
    },

    size: {
      type: Number,
      default: 0
    },

    mimeType: {
      type: String,
      trim: true,
      default: ""
    },

    type: {
      type: String,
      enum: ["IMAGE", "DOCX", "PDF", "TEXT", "PPT"],
      required: true
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true
    },

    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
      index: true
    },

    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// 🔥 Index for fast queries
NoteSchema.index({ courseId: 1, lectureId: 1 });
NoteSchema.index({ lectureId: 1, type: 1 });
NoteSchema.index({ lectureId: 1, createdAt: -1 });

module.exports = mongoose.model("Note", NoteSchema);