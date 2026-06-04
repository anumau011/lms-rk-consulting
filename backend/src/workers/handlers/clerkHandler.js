const User = require('../../models/User');

const handleUserCreated = async (data) => {
    const { id, email_addresses, first_name, last_name, private_metadata, public_metadata } = data;

    const email = email_addresses.find(e => e.id === data.primary_email_address_id)?.email_address;

    // Create user. Role defaults to 'student' in Schema.
    // We respect if metadata has role (e.g. invited as admin), but typically we defaults.
    const role = public_metadata?.role || 'student';

    await User.findByIdAndUpdate(id, {
        email,
        firstName: first_name,
        lastName: last_name,
        role: role, // Initial creation take from metadata or default
    }, { upsert: true, new: true });

    console.log(`[Worker] Synced Clerk User: ${id}`);
};

const handleUserUpdated = async (data) => {
    const { id, email_addresses, first_name, last_name } = data;
    const email = email_addresses.find(e => e.id === data.primary_email_address_id)?.email_address;

    // We DO NOT update role here. Role is managed by our Admin API -> Mongo.
    // If we blindly synced role from Clerk, we risk race conditions or data loss if Clerk metadata is stale.

    await User.findByIdAndUpdate(id, {
        email,
        firstName: first_name,
        lastName: last_name,
    });

    console.log(`[Worker] Updated Clerk User: ${id}`);
};

const handleUserDeleted = async (data) => {
    const { id } = data;
    await User.findByIdAndDelete(id);
    console.log(`[Worker] Deleted Clerk User: ${id}`);
};

module.exports = {
    handleUserCreated,
    handleUserUpdated,
    handleUserDeleted
};
