const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const connection = require('../config/redis');
const connectDB = require('../config/db');

// Handlers
const { handleUserCreated, handleUserUpdated, handleUserDeleted } = require('./handlers/clerkHandler');

// Start DB
connectDB();

const worker = new Worker('webhook-events', async (job) => {
    console.log(`[Worker] Processing job: ${job.name}`);

    try {
        switch (job.name) {
            // Clerk
            case 'user.created':
                await handleUserCreated(job.data);
                break;
            case 'user.updated':
                await handleUserUpdated(job.data);
                break;
            case 'user.deleted':
                await handleUserDeleted(job.data);
                break;

            default:
                console.warn(`[Worker] Unhandled job type: ${job.name}`);
        }
    } catch (err) {
        console.error(`[Worker] Job Failed ${job.name}:`, err);
        throw err; // Trigger retry
    }
}, { connection });

worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed with ${err.message}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('[Worker] Shutting down gracefully...');
    try {
        await worker.close();
        console.log('[Worker] Worker closed');
    } catch (err) {
        console.error('[Worker] Error closing worker:', err);
    }
    
    try {
        await connection.quit();
        console.log('[Worker] Redis connection closed');
    } catch (err) {
        console.error('[Worker] Error closing Redis:', err);
    }
    
    try {
        await mongoose.connection.close();
        console.log('[Worker] MongoDB connection closed');
    } catch (err) {
        console.error('[Worker] Error closing MongoDB:', err);
    }
    
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log('[Worker] Started listening for events...');
