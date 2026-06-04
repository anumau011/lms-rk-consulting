/**
 * Shared file-related utilities.
 * Consolidates the duplicated getNoteTypeFromMime function from
 * routes/courses.js and routes/media.js into a single source of truth.
 */

/**
 * Map a MIME type string to an internal note type enum value.
 * @param {string} mimeType
 * @returns {'PDF'|'DOCX'|'PPT'|'IMAGE'|'TEXT'}
 */
const getNoteTypeFromMime = (mimeType = '') => {
  if (mimeType === 'application/pdf') return 'PDF';

  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOCX';
  }

  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'PPT';
  }

  if (mimeType.startsWith('image/')) return 'IMAGE';

  return 'TEXT';
};

module.exports = { getNoteTypeFromMime };
