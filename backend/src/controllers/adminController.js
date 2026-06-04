const User = require('../models/User');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { VALID_ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

const TAG = 'ADMIN_CTRL';

/** POST /promote — Promote a user to a new role. */
const promoteUser = async (req, res) => {
  const { userId, role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Sync to Clerk so frontend knows immediately
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  logger.info(TAG, `User ${userId} promoted to ${role}`);
  res.json({ success: true, user });
};

/** GET /users — List recent users. */
const listUsers = async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, users });
};

module.exports = { promoteUser, listUsers };
