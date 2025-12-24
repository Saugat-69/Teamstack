/**
 * Cloudinary Client for file uploads and deletions
 */

const cloudinary = require('cloudinary').v2;

class CloudinaryService {
    constructor(cloudName, apiKey, apiSecret) {
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary credentials are required');
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        });

        this.cloudinary = cloudinary;
    }

    /**
     * Upload a file to Cloudinary
     * @param {string} filePath - Local file path
     * @param {string} roomId - Room ID for folder organization
     * @param {string} originalName - Original filename
     * @returns {Promise<{url: string, publicId: string}>}
     */
    async uploadFile(filePath, roomId, originalName) {
        try {
            const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const publicId = `teamup/${roomId}/${Date.now()}-${sanitizedName}`;

            const result = await this.cloudinary.uploader.upload(filePath, {
                resource_type: 'raw', // Support any file type
                public_id: publicId,
                folder: `teamup/${roomId}`,
            });

            return {
                url: result.secure_url,
                publicId: result.public_id,
            };
        } catch (error) {
            console.error('❌ Cloudinary upload error:', error);
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    /**
     * Delete a single file from Cloudinary
     * @param {string} publicId - Cloudinary public ID
     * @returns {Promise<boolean>}
     */
    async deleteFile(publicId) {
        try {
            await this.cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            return true;
        } catch (error) {
            console.error(`❌ Failed to delete file ${publicId}:`, error);
            return false;
        }
    }

    /**
     * Delete all files in a room folder
     * @param {string} roomId - Room ID
     * @returns {Promise<number>} Number of files deleted
     */
    async deleteRoomFiles(roomId) {
        try {
            const prefix = `teamup/${roomId}/`;

            // Get all resources with this prefix
            const result = await this.cloudinary.api.resources({
                type: 'upload',
                resource_type: 'raw',
                prefix: prefix,
                max_results: 500,
            });

            let deletedCount = 0;

            // Delete each file
            for (const resource of result.resources) {
                const deleted = await this.deleteFile(resource.public_id);
                if (deleted) deletedCount++;
            }

            // Try to delete the folder (may fail if not empty, that's ok)
            try {
                await this.cloudinary.api.delete_folder(`teamup/${roomId}`);
            } catch (folderError) {
                // Folder deletion is best-effort
                console.log(`⚠️ Could not delete folder for room ${roomId}`);
            }

            console.log(`🧹 Deleted ${deletedCount} files from room ${roomId}`);
            return deletedCount;
        } catch (error) {
            console.error(`❌ Failed to delete room files for ${roomId}:`, error);
            return 0;
        }
    }
}

module.exports = CloudinaryService;
