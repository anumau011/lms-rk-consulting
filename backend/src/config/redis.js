const Redis = require('ioredis');

// const redisOptions = {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD || undefined,
//     maxRetriesPerRequest: null, // Required for BullMQ
//     enableReadyCheck: true,
//     enableOfflineQueue: true,
//     retryStrategy: (times) => {
//         const delay = Math.min(times * 50, 2000);
//         return delay;
//     },
// };

const redisUrl = "rediss://default:AcLnAAIncDEwMjgwYmI5NzI2YTE0OTY1YTIyMTYzYjljOWFlYWM4MHAxNDk4OTU@valid-sheepdog-49895.upstash.io:6379";

const connection = new Redis(redisUrl);

// Handle connection events
connection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

connection.on('close', () => {
    console.log('Redis connection closed');
});

// Graceful shutdown
const shutdownRedis = async () => {
    try {
        await connection.quit();
        console.log('Redis connection gracefully closed');
    } catch (err) {
        console.error('Error closing Redis connection:', err);
        connection.disconnect();
    }
};

process.on('SIGTERM', shutdownRedis);
process.on('SIGINT', shutdownRedis);

module.exports = connection;
