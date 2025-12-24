/**
 * Redis Client using Upstash REST API
 * No additional package needed - uses native fetch
 */

class RedisClient {
    constructor(url, token) {
        if (!url || !token) {
            throw new Error('Redis URL and TOKEN are required');
        }
        this.url = url;
        this.token = token;
    }

    async execute(command, ...args) {
        try {
            const response = await fetch(`${this.url}/${command}/${args.join('/')}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Redis error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('❌ Redis execute error:', error);
            throw error;
        }
    }

    // Get a key
    async get(key) {
        return this.execute('GET', key);
    }

    // Set a key with optional TTL (seconds)
    async set(key, value, ttl = null) {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
        if (ttl) {
            return this.execute('SETEX', key, ttl, serialized);
        }
        return this.execute('SET', key, serialized);
    }

    // Delete a key
    async del(key) {
        return this.execute('DEL', key);
    }

    // Get all keys matching a pattern
    async keys(pattern) {
        return this.execute('KEYS', pattern);
    }

    // Get TTL of a key
    async ttl(key) {
        return this.execute('TTL', key);
    }

    // Update TTL of existing key
    async expire(key, seconds) {
        return this.execute('EXPIRE', key, seconds);
    }
}

module.exports = RedisClient;
