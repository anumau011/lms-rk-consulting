const axios = require('axios');
const Lecture = require('../models/Lecture');
const Note = require('../models/Note');
const Video = require('../models/Video');
const { deleteVideo } = require('../services/bunny');
const logger = require('./logger');

const TAG = 'LECTURE_CLEANUP';

const deleteNoteFromStorage = async (notePath) => {
  if (!notePath) return;

  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
  const storagePassword = process.env.BUNNY_STORAGE_PASSWORD?.trim();

  if (!storageZone || !storageZoneName || !storagePassword) {
    logger.warn(TAG, 'Skipping note storage delete due to missing Bunny storage env vars');
    return;
  }

  const deleteUrl = `https://${storageZone}/${storageZoneName}${notePath}`;
  await axios.delete(deleteUrl, {
    headers: { AccessKey: storagePassword },
  });
};

const cleanupLectureAssets = async (lecture) => {
  if (!lecture?._id) return;

  const notes = await Note.find({ lectureId: lecture._id }).select('_id path').lean();

  await Promise.all(
    notes.map(async (note) => {
      try {
        await deleteNoteFromStorage(note.path);
      } catch (err) {
        logger.warn(TAG, `Failed to delete note file for note ${note._id}: ${err.message}`);
      }
    })
  );

  await Note.deleteMany({ lectureId: lecture._id });

  if (!lecture.videoId) return;

  const videoStillUsed = await Lecture.exists({
    _id: { $ne: lecture._id },
    videoId: lecture.videoId,
  });

  if (videoStillUsed) return;

  const videoDoc = await Video.findById(lecture.videoId).select('_id videoGuid');
  if (!videoDoc) return;

  try {
    await deleteVideo(videoDoc.videoGuid);
  } catch (err) {
    logger.warn(TAG, `Failed to delete Bunny video ${videoDoc.videoGuid}: ${err.message}`);
  }

  await Video.deleteOne({ _id: videoDoc._id });
};

module.exports = { cleanupLectureAssets };
