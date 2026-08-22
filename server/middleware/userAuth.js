const jwt = require('jsonwebtoken');
const { pool } = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_quiz_jwt_key_2026_onepiece';

/**
 * Middleware bắt buộc đăng nhập (Registered User Auth)
 */
async function requireUserAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.headers['x-access-token']) {
        token = req.headers['x-access-token'];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Vui lòng đăng nhập để thực hiện chức năng này.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                error: 'Phiên đăng nhập không hợp lệ.'
            });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Tài khoản không tồn tại hoặc đã bị khóa.'
            });
        }

        req.user = users[0];
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        });
    }
}

/**
 * Middleware tùy chọn đăng nhập (nếu có token thì gắn req.user, không có thì vẫn next)
 */
async function optionalUserAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.headers['x-access-token']) {
        token = req.headers['x-access-token'];
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.userId) {
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
            if (users.length > 0) {
                req.user = users[0];
            }
        }
    } catch (err) {
        req.user = null;
    }
    next();
}

module.exports = {
    requireUserAuth,
    optionalUserAuth,
    JWT_SECRET
};
