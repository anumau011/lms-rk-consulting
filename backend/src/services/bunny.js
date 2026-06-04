const axios = require('axios');
const crypto = require('crypto');

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOST; // e.g., vz-xxxxx.b-cdn.net
const BUNNY_VIDEO_SECURITY_KEY = process.env.BUNNY_STREAM_SECRET_KEY; // For signed URLs

const bunnyApi = axios.create({
    baseURL: `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}`,
    headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json'
    }
});

/**
 * Create a video in Bunny Stream
 * @param {string} title - Video title
 * @param {string} collectionId - Optional collection ID
 * @returns {Promise<Object>} Video details
 */
const createVideo = async (title, collectionId = '') => {
    try {
        const response = await bunnyApi.post('/videos', {
            title,
            collectionId
        });

        return response.data;
    } catch (error) {
        console.error('Bunny createVideo error:', error.response?.data || error.message);
        throw new Error(`Failed to create video: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Get video details
 * @param {string} videoGuid - Video GUID
 * @returns {Promise<Object>} Video details
 */
const getVideo = async (videoGuid) => {
    try {
        const response = await bunnyApi.get(`/videos/${videoGuid}`);
        return response.data;
    } catch (error) {
        console.error('Bunny getVideo error:', error.response?.data || error.message);
        throw new Error(`Failed to get video: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Delete video
 * @param {string} videoGuid - Video GUID
 * @returns {Promise<void>}
 */
const deleteVideo = async (videoGuid) => {
    try {
        await bunnyApi.delete(`/videos/${videoGuid}`);
    } catch (error) {
        console.error('Bunny deleteVideo error:', error.response?.data || error.message);
        throw new Error(`Failed to delete video: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Generate signed URL for video playback
 * @param {string} videoGuid - Video GUID
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} Signed playback URL
 */
const generateSignedUrl = (videoGuid, expiresIn = 3600) => {
    if (!BUNNY_VIDEO_SECURITY_KEY) {
        // If no security key, return non-signed URL
        // "https://iframe.mediadelivery.net/embed/759/eb1c4f77-0cda-46be-b47d-1118ad7c2ffe?autoplay=true"
        return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoGuid}`;
    }

    // Calculate expiration timestamp
    const expires = Math.floor(Date.now() / 1000) + expiresIn;

    // Create signature base string
    const signatureBase = `${BUNNY_VIDEO_SECURITY_KEY}${videoGuid}${expires}`;
    
    // Generate SHA256 hash
    const signature = crypto
        .createHash('sha256')
        .update(signatureBase)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Return signed URL
    return `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/playlist.m3u8?token=${signature}&expires=${expires}`;
};

/**
 * Generate signed iframe embed URL
 * @param {string} videoLibraryId - Video Library ID
 * @param {string} videoGuid - Video GUID
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} Signed iframe embed URL
 */
const generateSignedIframeUrl = (videoLibraryId, videoGuid, expiresIn = 3600) => {
    if (!BUNNY_VIDEO_SECURITY_KEY) {
        // If no security key, return non-signed URL
        return `https://iframe.mediadelivery.net/embed/${videoLibraryId}/${videoGuid}`;
    }

    // Calculate expiration timestamp
    // Step 1: Generate expiration timestamp (in seconds)
    const expires = Math.floor(Date.now() / 1000) + expiresIn;

    // Step 2: Create string to hash (IMPORTANT: exact order)
    const data = BUNNY_VIDEO_SECURITY_KEY + videoGuid + expires;

    // Step 3: Generate SHA256 HEX token
    const token = crypto
        .createHash("sha256")
        .update(data)
        .digest("hex");

    // Step 4: Return signed URL
    return `https://iframe.mediadelivery.net/embed/${videoLibraryId}/${videoGuid}?token=${token}&expires=${expires}`;
};

/**
 * Generate thumbnail URL
 * @param {string} videoGuid - Video GUID
 * @returns {string} Thumbnail URL
 */
const getThumbnailUrl = (videoGuid) => {
    return `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/thumbnail.jpg`;
};

/**
 * Generate signed thumbnail URL
 * @param {string} videoGuid - Video GUID
 * @param {string} thumbnailFileName - Thumbnail filename (default: thumbnail.jpg)
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} Signed thumbnail URL
 */
const generateSignedThumbnailUrl = (videoGuid, thumbnailFileName = 'thumbnail.jpg', expiresIn = 3600) => {
    if (!BUNNY_VIDEO_SECURITY_KEY) {
        // If no security key, return non-signed URL
        return `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/${thumbnailFileName}`;
    }

    // Calculate expiration timestamp
    const expires = Math.floor(Date.now() / 1000) + expiresIn;

    // Create signature base string
    const signatureBase = `${BUNNY_VIDEO_SECURITY_KEY}${videoGuid}${expires}`;
    
    // Generate SHA256 hash
    const signature = crypto
        .createHash('sha256')
        .update(signatureBase)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Return signed thumbnail URL
    return `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/${thumbnailFileName}?token=${signature}&expires=${expires}`;
};

/**
 * Update video details
 * @param {string} videoGuid - Video GUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated video details
 */
const updateVideo = async (videoGuid, updates) => {
    try {
        const response = await bunnyApi.post(`/videos/${videoGuid}`, updates);
        return response.data;
    } catch (error) {
        console.error('Bunny updateVideo error:', error.response?.data || error.message);
        throw new Error(`Failed to update video: ${error.response?.data?.message || error.message}`);
    }
};

const extractAvailableResolutions = (videoData = {}) => {
    const rawCandidates = [
        videoData.availableResolutions,
        videoData.AvailableResolutions,
        videoData.resolutions,
        videoData.Resolutions,
        videoData.outputResolutions,
        videoData.OutputResolutions,
    ];

    const parsed = [];

    rawCandidates.forEach((candidate) => {
        if (!candidate) return;

        if (Array.isArray(candidate)) {
            candidate.forEach((value) => parsed.push(value));
            return;
        }

        if (typeof candidate === 'string') {
            candidate.split(/[\s,;|]+/).forEach((value) => parsed.push(value));
            return;
        }

        if (typeof candidate === 'object') {
            Object.keys(candidate).forEach((key) => parsed.push(key));
            Object.values(candidate).forEach((value) => parsed.push(value));
        }
    });

    const normalized = [...new Set(parsed
        .map((value) => String(value).toLowerCase().match(/(\d{3,4})/))
        .filter(Boolean)
        .map((match) => Number(match[1]))
        .filter((height) => Number.isFinite(height) && height >= 144 && height <= 4320))]
        .sort((a, b) => a - b);

    if (normalized.length > 0) return normalized;

    const fallbackMax = Number(videoData.height || videoData.Height || 720);
    const ladder = [240, 360, 480, 720, 1080, 1440, 2160];
    return ladder.filter((height) => height <= fallbackMax);
};

const generateSignedMp4DownloadUrl = (videoGuid, resolutionHeight, expiresIn = 3600) => {
    const securityKey = process.env.BUNNY_STREAM_SECRET_KEY;
    const host = process.env.BUNNY_CDN_HOST;

    if (!host) {
        throw new Error('Bunny pull zone host is not configured');
    }

    const safeResolution = Number(resolutionHeight);
    if (!Number.isFinite(safeResolution)) {
        throw new Error('Invalid resolution provided');
    }

    const path = `/${videoGuid}/play_${safeResolution}p.mp4`;

    if (!securityKey) {
        return `https://${host}${path}`;
    }

    const expires = Math.floor(Date.now() / 1000) + Number(expiresIn || 3600);
    const hashableBase = `${securityKey}${path}${expires}`;

    const token = crypto
        .createHash('md5')
        .update(hashableBase)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `https://${host}${path}?token=${token}&expires=${expires}`;
};

const generateSignedStorageFileUrl = (filePath, expiresIn = 3600) => {
    const securityKey = process.env.BUNNY_STORAGE_SECRET_KEY;
    const host = process.env.BUNNY_STORAGE_PULL_ZONE_HOST;

    if (!host) {
        throw new Error('Bunny storage pull zone host is not configured');
    }

    const normalizedPath = String(filePath || '').startsWith('/')
        ? String(filePath)
        : `/${String(filePath || '')}`;

    if (!normalizedPath || normalizedPath === '/') {
        throw new Error('Invalid file path provided');
    }

    if (!securityKey) {
        return `https://${host}${normalizedPath}`;
    }

    const expires = Math.floor(Date.now() / 1000) + Number(expiresIn || 3600);
    const hashableBase = `${securityKey}${normalizedPath}${expires}`;

    const token = crypto
        .createHash('md5')
        .update(hashableBase)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `https://${host}${normalizedPath}?token=${token}&expires=${expires}`;
};

/**
 * Map Bunny status code to readable status
 * @param {number} statusCode - Bunny status code
 * @returns {string} Status string
 */
const mapBunnyStatus = (statusCode) => {
    const statusMap = {
        0: 'QUEUED',
        1: 'PROCESSING',
        2: 'ENCODING',
        3: 'READY',
        4: 'READY', // Resolution finished - video is playable
        5: 'FAILED',
        6: 'UPLOADING', // PresignedUploadStarted
        7: 'PROCESSING', // PresignedUploadFinished
        8: 'FAILED', // PresignedUploadFailed
        9: 'READY', // CaptionsGenerated
        10: 'READY' // TitleOrDescriptionGenerated
    };

    return statusMap[statusCode] || 'QUEUED';
};

module.exports = {
    createVideo,
    getVideo,
    deleteVideo,
    generateSignedUrl,
    generateSignedIframeUrl,
    getThumbnailUrl,
    generateSignedThumbnailUrl,
    generateSignedMp4DownloadUrl,
    generateSignedStorageFileUrl,
    extractAvailableResolutions,
    updateVideo,
    mapBunnyStatus,
    bunnyApi
};
