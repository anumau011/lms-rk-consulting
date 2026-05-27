const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoOptions = {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 10000,
            retryWrites: true,
            retryReads: true,
        };
        
        const conn = await mongoose.connect(process.env.MONGO_URI, mongoOptions);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Handle connection events
        conn.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        conn.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection gracefully closed');
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
            }
        });
        
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
