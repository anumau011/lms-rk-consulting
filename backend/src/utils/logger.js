/**
 * Structured logger – thin wrapper around console for production readiness.
 *
 * - Adds ISO timestamp and level tag to every message.
 * - Suppresses debug messages when NODE_ENV === 'production'.
 * - Drop-in replacement for console.log / console.error throughout the codebase.
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel =
  process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug;

const formatMessage = (level, tag, args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]${tag ? ` [${tag}]` : ''}`;
  return [prefix, ...args];
};

const logger = {
  debug(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(...formatMessage('debug', tag, args));
    }
  },

  info(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(...formatMessage('info', tag, args));
    }
  },

  warn(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(...formatMessage('warn', tag, args));
    }
  },

  error(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(...formatMessage('error', tag, args));
    }
  },
};

module.exports = logger;
