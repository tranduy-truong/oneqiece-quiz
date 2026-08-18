const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key_quiz_app';

function requireAdminAuth(req, res, next) {
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
            error: 'Chưa xác thực quyền Admin. Vui lòng đăng nhập.' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.role === 'admin') {
            req.admin = decoded;
            return next();
        }
        return res.status(403).json({ 
            success: false, 
            error: 'Bạn không có quyền truy cập chức năng này.' 
        });
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' 
        });
    }
}

module.exports = {
    requireAdminAuth,
    JWT_SECRET
};
