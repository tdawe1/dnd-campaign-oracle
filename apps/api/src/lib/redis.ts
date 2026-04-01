import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

try {
    redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
            if (times > 3) return null; // stop retrying after 3 attempts
            return Math.min(times * 50, 2000);
        }
    });

    redis.on('error', (err) => {
        console.warn('Redis connection error:', err.message);
    });
} catch (e) {
    console.warn('Redis client failed to initialize');
}

export { redis };
