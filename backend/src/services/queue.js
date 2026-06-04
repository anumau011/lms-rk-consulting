const { Queue } = require('bullmq');
const connection = require('../config/redis');

const webhookQueue = new Queue('webhook-events', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
    }
});

module.exports = {
    webhookQueue,
};
