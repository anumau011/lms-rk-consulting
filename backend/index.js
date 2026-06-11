// require('dotenv').config({
//   path: `.env.${process.env.NODE_ENV || "development"}`
// });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
// Routes
const webhookRoutes = require('./src/routes/webhooks');
const adminRoutes = require('./src/routes/admin');
const courseRoutes = require('./src/routes/courses');
const mediaRoutes = require('./src/routes/media');
const progressRoutes = require('./src/routes/progress');
const studentRoutes = require('./src/routes/student');
const testimonialRoutes = require('./src/routes/testimonials');
const clerkMiddleware = require('@clerk/clerk-sdk-node');

// Initialize
// debugging
// Step Into: Moves execution inside the function being called
// Step Over: Executes current line without entering functions.
// Step Out: You entered a function accidentally



const app = express();

app.use(clerkMiddleware.ClerkExpressWithAuth());

connectDB();

// ── Security & Logging ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';
app.use(cors({ origin: allowedOrigins }));

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// ── Body Parsing ────────────────────────────────────────────────────────────
// Stash raw body for webhook signature verification (Stripe / Clerk / Razorpay).
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/hooks', webhookRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);

// Student / Frontend-compatible routes (no v1 prefix to match client)
app.use('/api', studentRoutes);

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'API Running' }));

// ── Centralized Error Handler (must be last) ────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info('SERVER', `Running on port ${PORT}`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
const gracefulShutdown = async () => {
  logger.info('SERVER', 'Shutting down gracefully...');
  
  
  // Close HTTP server
  server.close(async () => {
    logger.info('SERVER', 'HTTP server closed');
    
    try {
      // Close MongoDB connection
      await mongoose.connection.close();
      logger.info('SERVER', 'MongoDB connection closed');
    } catch (err) {
      logger.error('SERVER', 'Error closing MongoDB:', err.message);
    }
    
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('SERVER', 'Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

