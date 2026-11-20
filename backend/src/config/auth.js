require('dotenv').config();

module.exports = {
    access: {
        secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev_access_secret_change_me',
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    },
    refresh: {
        secret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
};
