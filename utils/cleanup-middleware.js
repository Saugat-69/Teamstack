/**
 * Lazy Cleanup Middleware
 * Runs on every request to check for expired rooms and delete their files
 */

const ROOM_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

async function lazyCleanup(redisClient, cloudinaryService) {
    try {
        // Get all room keys
        const roomKeys = await redisClient.keys('room:*');

        if (!roomKeys || roomKeys.length === 0) {
            return;
        }

        const now = Date.now();
        const cleanupPromises = [];

        for (const key of roomKeys) {
            try {
                // Check TTL
                const ttl = await redisClient.ttl(key);

                // TTL of -2 means key doesn't exist, -1 means no expiry set
                if (ttl === -2) {
                    continue; // Already deleted
                }

                // If TTL is very low (less than 1 second) or expired
                if (ttl !== -1 && ttl < 1) {
                    // Get room data before deletion
                    const roomDataStr = await redisClient.get(key);

                    if (roomDataStr) {
                        const roomData = JSON.parse(roomDataStr);
                        const roomId = key.replace('room:', '');

                        // Delete Cloudinary files
                        cleanupPromises.push(
                            cloudinaryService.deleteRoomFiles(roomId).catch(err =>
                                console.error(`Failed to cleanup room ${roomId}:`, err)
                            )
                        );

                        // Delete Redis key
                        await redisClient.del(key);
                        console.log(`🧹 Cleaned up expired room: ${roomId}`);
                    }
                }
            } catch (error) {
                console.error(`Error processing room ${key}:`, error);
            }
        }

        // Wait for all cleanup operations
        await Promise.allSettled(cleanupPromises);
    } catch (error) {
        console.error('❌ Lazy cleanup error:', error);
    }
}

/**
 * Create cleanup middleware
 * @param {RedisClient} redisClient 
 * @param {CloudinaryService} cloudinaryService 
 * @returns Express middleware function
 */
function createCleanupMiddleware(redisClient, cloudinaryService) {
    let isCleanupRunning = false;
    let lastCleanup = 0;
    const CLEANUP_COOLDOWN = 60 * 1000; // Run max once per minute

    return async (req, res, next) => {
        const now = Date.now();

        // Run cleanup if not already running and cooldown has passed
        if (!isCleanupRunning && (now - lastCleanup) > CLEANUP_COOLDOWN) {
            isCleanupRunning = true;
            lastCleanup = now;

            // Run in background, don't block request
            lazyCleanup(redisClient, cloudinaryService)
                .finally(() => {
                    isCleanupRunning = false;
                });
        }

        next();
    };
}

module.exports = {
    createCleanupMiddleware,
    lazyCleanup,
    ROOM_EXPIRY_SECONDS,
};
