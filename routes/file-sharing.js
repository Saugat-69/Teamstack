/**
 * File Sharing Routes
 * Temporary, anonymous room-based file sharing with Redis and Cloudinary
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const RedisClient = require('../utils/redis-client');
const CloudinaryService = require('../utils/cloudinary-service');
const { ROOM_EXPIRY_SECONDS } = require('../utils/cleanup-middleware');

// Initialize services
const redisClient = new RedisClient(
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_TOKEN
);

const cloudinaryService = new CloudinaryService(
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET
);

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024; // 50MB default
const MAX_FILES_PER_ROOM = parseInt(process.env.MAX_FILES_PER_ROOM || '10'); // 10 files default
const TEMP_UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || './uploads/temp';

// Ensure temp directory exists
fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true }).catch(console.error);

// Multer configuration for temporary storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        // Accept any file type (as per requirements)
        cb(null, true);
    },
});

/**
 * Helper: Update room's lastActivity and refresh TTL
 */
async function touchRoom(roomId) {
    try {
        const key = `room:${roomId}`;
        const roomDataStr = await redisClient.get(key);

        if (!roomDataStr) {
            return null;
        }

        const roomData = JSON.parse(roomDataStr);
        roomData.lastActivity = Date.now();
        roomData.expiresAt = Date.now() + (ROOM_EXPIRY_SECONDS * 1000);

        // Update with refreshed TTL
        await redisClient.set(key, roomData, ROOM_EXPIRY_SECONDS);

        return roomData;
    } catch (error) {
        console.error('Error touching room:', error);
        return null;
    }
}

/**
 * POST /api/room/create
 * Create a new temporary room
 */
router.post('/create', async (req, res) => {
    try {
        const roomId = uuidv4(); // Unguessable ID
        const now = Date.now();

        const roomData = {
            roomId,
            files: [],
            createdAt: now,
            lastActivity: now,
            expiresAt: now + (ROOM_EXPIRY_SECONDS * 1000),
        };

        // Store in Redis with TTL
        await redisClient.set(`room:${roomId}`, roomData, ROOM_EXPIRY_SECONDS);

        console.log(`✅ Created room: ${roomId}`);

        res.status(201).json({
            success: true,
            roomId,
            expiresIn: ROOM_EXPIRY_SECONDS,
            message: 'Room created successfully',
        });
    } catch (error) {
        console.error('❌ Create room error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create room',
        });
    }
});

/**
 * POST /api/room/join/:roomId
 * Join an existing room (validates room exists)
 */
router.post('/join/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        // Touch room to refresh TTL
        const roomData = await touchRoom(roomId);

        if (!roomData) {
            return res.status(404).json({
                success: false,
                error: 'Room not found or expired',
            });
        }

        console.log(`✅ User joined room: ${roomId}`);

        res.json({
            success: true,
            roomId,
            fileCount: roomData.files.length,
            expiresAt: roomData.expiresAt,
            message: 'Successfully joined room',
        });
    } catch (error) {
        console.error('❌ Join room error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join room',
        });
    }
});

/**
 * POST /api/room/upload/:roomId
 * Upload a file to a room
 */
router.post('/upload/:roomId', upload.single('file'), async (req, res) => {
    let tempFilePath = null;

    try {
        const { roomId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided',
            });
        }

        tempFilePath = file.path;

        // Get room data
        const roomData = await touchRoom(roomId);

        if (!roomData) {
            // Delete temp file
            await fs.unlink(tempFilePath).catch(() => { });

            return res.status(404).json({
                success: false,
                error: 'Room not found or expired',
            });
        }

        // Check file limit
        if (roomData.files.length >= MAX_FILES_PER_ROOM) {
            await fs.unlink(tempFilePath).catch(() => { });

            return res.status(400).json({
                success: false,
                error: `Maximum ${MAX_FILES_PER_ROOM} files per room`,
            });
        }

        // Upload to Cloudinary
        const { url, publicId } = await cloudinaryService.uploadFile(
            tempFilePath,
            roomId,
            file.originalname
        );

        // Add file to room
        const fileData = {
            id: uuidv4(),
            name: file.originalname,
            url,
            publicId,
            size: file.size,
            uploadedAt: Date.now(),
        };

        roomData.files.push(fileData);
        roomData.lastActivity = Date.now();
        roomData.expiresAt = Date.now() + (ROOM_EXPIRY_SECONDS * 1000);

        // Update Redis
        await redisClient.set(`room:${roomId}`, roomData, ROOM_EXPIRY_SECONDS);

        // Delete temp file
        await fs.unlink(tempFilePath).catch(() => { });

        console.log(`✅ File uploaded to room ${roomId}: ${file.originalname}`);

        res.status(201).json({
            success: true,
            file: {
                id: fileData.id,
                name: fileData.name,
                size: fileData.size,
                uploadedAt: fileData.uploadedAt,
            },
            message: 'File uploaded successfully',
        });
    } catch (error) {
        console.error('❌ Upload error:', error);

        // Cleanup temp file on error
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => { });
        }

        const message = error.message || 'Failed to upload file';
        const statusCode = message.includes('file size') ? 413 : 500;

        res.status(statusCode).json({
            success: false,
            error: message,
        });
    }
});

/**
 * GET /api/room/files/:roomId
 * Get list of files in a room
 */
router.get('/files/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        // Touch room to refresh TTL
        const roomData = await touchRoom(roomId);

        if (!roomData) {
            return res.status(404).json({
                success: false,
                error: 'Room not found or expired',
            });
        }

        // Return files without exposing Cloudinary URLs (for security)
        const files = roomData.files.map(f => ({
            id: f.id,
            name: f.name,
            size: f.size,
            uploadedAt: f.uploadedAt,
        }));

        res.json({
            success: true,
            files,
            roomId,
            expiresAt: roomData.expiresAt,
        });
    } catch (error) {
        console.error('❌ Get files error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve files',
        });
    }
});

/**
 * GET /api/room/download/:roomId/:fileId
 * Download a file (redirect to Cloudinary)
 */
router.get('/download/:roomId/:fileId', async (req, res) => {
    try {
        const { roomId, fileId } = req.params;

        // Touch room to refresh TTL
        const roomData = await touchRoom(roomId);

        if (!roomData) {
            return res.status(404).json({
                success: false,
                error: 'Room not found or expired',
            });
        }

        // Find file
        const file = roomData.files.find(f => f.id === fileId);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }

        console.log(`📥 Download requested: ${file.name} from room ${roomId}`);

        // Redirect to Cloudinary URL
        res.redirect(file.url);
    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download file',
        });
    }
});

module.exports = router;
