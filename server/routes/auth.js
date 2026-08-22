const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../db');
const { requireUserAuth, JWT_SECRET } = require('../middleware/userAuth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { getRankInfo, getLevelInfo } = require('../services/rankService');
require('dotenv').config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

/**
 * GET /api/auth/config
 * Lấy cấu hình public của hệ thống Auth (Google Client ID)
 */
router.get('/config', (req, res) => {
    res.json({
        success: true,
        googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim()
    });
});

/**
 * Hàm băm SHA-256 an toàn cho token
 */
function hashToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

/**
 * POST /api/auth/register
 * Đăng ký tài khoản người chơi mới
 */
router.post('/register', async (req, res) => {
    try {
        const { username, display_name, email, password, confirm_password } = req.body;

        if (!username || !display_name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng điền đầy đủ các thông tin bắt buộc.'
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanUsername = String(username).trim().toLowerCase();
        const cleanDisplayName = String(display_name).trim();

        // 1. Validate Email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Địa chỉ email không đúng định dạng.' });
        }

        // 2. Validate Username regex (3-30 ký tự, chữ số và gạch dưới)
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        if (!usernameRegex.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                error: 'Tên đăng nhập từ 3 - 30 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới (_).'
            });
        }

        // 3. Validate Password
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
        }

        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ success: false, error: 'Mật khẩu xác nhận không khớp.' });
        }

        // 4. Kiểm tra trùng email
        const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (emailRows.length > 0) {
            return res.status(400).json({ success: false, error: 'Địa chỉ email này đã được sử dụng.' });
        }

        // 5. Kiểm tra trùng username
        const [userRows] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
        if (userRows.length > 0) {
            return res.status(400).json({ success: false, error: 'Tên đăng nhập này đã có người sử dụng.' });
        }

        // 6. Mã hóa mật khẩu với bcrypt
        const passwordHash = await bcrypt.hash(password, 10);

        // 7. Tạo User mới
        const [insertRes] = await pool.query(
            `INSERT INTO users (username, display_name, email, password_hash, email_verified, rating, xp, level, rank_tier, rank_division)
             VALUES (?, ?, ?, ?, FALSE, 1000, 0, 1, 'BRONZE', 'IV')`,
            [cleanUsername, cleanDisplayName, cleanEmail, passwordHash]
        );
        const userId = insertRes.insertId;

        // 8. Tạo Token xác thực email 24h
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHashed = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [userId, tokenHashed, expiresAt]
        );

        // 9. Gửi Email kích hoạt
        const emailRes = await sendVerificationEmail(cleanEmail, cleanDisplayName, rawToken);

        res.json({
            success: true,
            message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.',
            devMode: emailRes ? emailRes.devMode : false,
            verifyUrl: emailRes ? emailRes.verifyUrl : null
        });
    } catch (err) {
        console.error('Lỗi API Register:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đăng ký tài khoản.' });
    }
});

/**
 * GET /api/auth/verify-email
 * Kích hoạt tài khoản người dùng qua link email
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Thiếu mã token xác thực.' });
        }

        const tokenHashed = hashToken(token);

        const [tokenRows] = await pool.query(
            `SELECT * FROM email_verification_tokens 
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
            [tokenHashed]
        );

        if (tokenRows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Link xác thực không hợp lệ hoặc đã hết hạn (24 giờ).'
            });
        }

        const tokenData = tokenRows[0];

        // Cập nhật email_verified = TRUE
        await pool.query('UPDATE users SET email_verified = TRUE WHERE id = ?', [tokenData.user_id]);
        // Đánh dấu token đã sử dụng
        await pool.query('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [tokenData.id]);

        res.json({
            success: true,
            message: 'Tài khoản của bạn đã được xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.'
        });
    } catch (err) {
        console.error('Lỗi Verify Email:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xác thực email.' });
    }
});

/**
 * POST /api/auth/resend-verification
 * Gửi lại email xác thực
 */
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập địa chỉ email.' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

        if (users.length === 0 || users[0].email_verified) {
            return res.json({
                success: true,
                message: 'Nếu email tồn tại và chưa được kích hoạt, một đường dẫn xác thực mới đã được gửi.'
            });
        }

        const user = users[0];
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHashed = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [user.id, tokenHashed, expiresAt]
        );

        const emailRes = await sendVerificationEmail(cleanEmail, user.display_name, rawToken);

        res.json({
            success: true,
            message: 'Đã gửi lại link xác thực! Vui lòng kiểm tra hộp thư email của bạn.',
            devMode: emailRes ? emailRes.devMode : false,
            verifyUrl: emailRes ? emailRes.verifyUrl : null
        });
    } catch (err) {
        console.error('Lỗi Resend Verification:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi gửi lại email xác thực.' });
    }
});

/**
 * POST /api/auth/login
 * Đăng nhập bằng Email hoặc Username + Mật khẩu
 */
router.post('/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginIdentifier = String(email || username || '').trim().toLowerCase();

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.'
            });
        }

        // Tìm tài khoản theo email hoặc username
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [loginIdentifier, loginIdentifier]
        );

        if (users.length === 0 || !users[0].password_hash) {
            return res.status(401).json({
                success: false,
                error: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.'
            });
        }

        const user = users[0];

        // So khớp mật khẩu
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.'
            });
        }

        // Kiểm tra email_verified
        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                error: 'Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư hoặc yêu cầu gửi lại link kích hoạt.'
            });
        }

        // Tạo JWT Token 7 ngày
        const token = jwt.sign(
            { userId: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const rankInfo = getRankInfo(user.rating);
        const levelInfo = getLevelInfo(user.xp);

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                avatar_url: user.avatar_url,
                rating: user.rating,
                xp: user.xp,
                level: levelInfo.level,
                rank_tier: rankInfo.tier,
                rank_division: rankInfo.division,
                rank_display: rankInfo.rankDisplayName,
                rank_icon: rankInfo.icon
            }
        });
    } catch (err) {
        console.error('Lỗi API Login:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đăng nhập.' });
    }
});

/**
 * POST /api/auth/google
 * Đăng nhập hoặc Liên kết bằng Google OAuth Token
 */
router.post('/google', async (req, res) => {
    try {
        const { credential, id_token } = req.body;
        const googleToken = credential || id_token;

        if (!googleToken) {
            return res.status(400).json({ success: false, error: 'Thiếu Google Auth Token.' });
        }

        let googleUser = null;

        // 1. Xác thực Google Token qua Google API nếu đã cấu hình Client ID
        if (googleClient && GOOGLE_CLIENT_ID) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: googleToken,
                    audience: GOOGLE_CLIENT_ID
                });
                const payload = ticket.getPayload();
                googleUser = {
                    sub: payload.sub,
                    email: payload.email.toLowerCase(),
                    name: payload.name || payload.email.split('@')[0],
                    picture: payload.picture || '/images/A.jpg',
                    email_verified: payload.email_verified
                };
            } catch (vErr) {
                console.error('Lỗi verify Google Token:', vErr.message);
                return res.status(401).json({ success: false, error: 'Google Token không hợp lệ.' });
            }
        } else {
            // Dev Mock Mode nếu chưa cấu hình Google Cloud ID
            try {
                // Giải mã payload token cơ bản trong dev
                const base64Url = googleToken.split('.')[1];
                if (base64Url) {
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const payload = JSON.parse(jsonPayload);
                    googleUser = {
                        sub: payload.sub || `google_${Date.now()}`,
                        email: (payload.email || `user_${Date.now()}@gmail.com`).toLowerCase(),
                        name: payload.name || 'Hải Tặc Google',
                        picture: payload.picture || '/images/A.jpg',
                        email_verified: true
                    };
                }
            } catch (e) {
                googleUser = {
                    sub: `google_dev_${Date.now()}`,
                    email: `google_${Date.now()}@onepiece.local`,
                    name: 'Hải Tặc Google',
                    picture: '/images/A.jpg',
                    email_verified: true
                };
            }
        }

        if (!googleUser || !googleUser.email) {
            return res.status(400).json({ success: false, error: 'Không thể trích xuất thông tin Google.' });
        }

        // 2. Kiểm tra xem Google Account đã liên kết trong auth_accounts chưa
        const [authRows] = await pool.query(
            'SELECT * FROM auth_accounts WHERE provider = "google" AND provider_account_id = ?',
            [googleUser.sub]
        );

        let targetUserId = null;

        if (authRows.length > 0) {
            targetUserId = authRows[0].user_id;
        } else {
            // 3. Kiểm tra xem Email đã có trong users chưa (Account Linking thông minh)
            const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [googleUser.email]);

            if (userRows.length > 0) {
                targetUserId = userRows[0].id;
                // Tự động kích hoạt email_verified vì Google đã chứng thực email này
                await pool.query('UPDATE users SET email_verified = TRUE WHERE id = ?', [targetUserId]);
            } else {
                // Tạo User mới từ Google
                let baseUsername = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                if (baseUsername.length < 3) baseUsername = 'crew_' + baseUsername;
                let finalUsername = baseUsername;

                // Tránh trùng username
                const [checkU] = await pool.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
                if (checkU.length > 0) {
                    finalUsername = `${baseUsername}_${Math.floor(Math.random() * 899 + 100)}`;
                }

                const [newU] = await pool.query(
                    `INSERT INTO users (username, display_name, email, avatar_url, email_verified, rating, xp, level, rank_tier, rank_division)
                     VALUES (?, ?, ?, ?, TRUE, 1000, 0, 1, 'BRONZE', 'IV')`,
                    [finalUsername, googleUser.name, googleUser.email, googleUser.picture]
                );
                targetUserId = newU.insertId;
            }

            // Ghi nhận liên kết vào auth_accounts
            try {
                await pool.query(
                    'INSERT INTO auth_accounts (user_id, provider, provider_account_id) VALUES (?, "google", ?)',
                    [targetUserId, googleUser.sub]
                );
            } catch (linkErr) {
                console.warn('Lỗi ghi auth_account:', linkErr.message);
            }
        }

        // 4. Lấy thông tin user hoàn chỉnh & Cấp JWT Token
        const [finalUserRows] = await pool.query('SELECT * FROM users WHERE id = ?', [targetUserId]);
        if (finalUserRows.length === 0) {
            return res.status(500).json({ success: false, error: 'Không thể khởi tạo phiên đăng nhập.' });
        }

        const user = finalUserRows[0];
        const token = jwt.sign(
            { userId: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const rankInfo = getRankInfo(user.rating);
        const levelInfo = getLevelInfo(user.xp);

        res.json({
            success: true,
            message: 'Đăng nhập Google thành công!',
            token,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                avatar_url: user.avatar_url,
                rating: user.rating,
                xp: user.xp,
                level: levelInfo.level,
                rank_tier: rankInfo.tier,
                rank_division: rankInfo.division,
                rank_display: rankInfo.rankDisplayName,
                rank_icon: rankInfo.icon
            }
        });
    } catch (err) {
        console.error('Lỗi Google Auth API:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đăng nhập Google.' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Yêu cầu gửi link đặt lại mật khẩu
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập địa chỉ email.' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

        // Trả kết quả generic để chống user enumeration
        if (users.length === 0) {
            return res.json({
                success: true,
                message: 'Nếu địa chỉ email tồn tại trên hệ thống, link đặt lại mật khẩu đã được gửi đến hộp thư của bạn.'
            });
        }

        const user = users[0];
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHashed = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [user.id, tokenHashed, expiresAt]
        );

        const emailRes = await sendPasswordResetEmail(cleanEmail, user.display_name, rawToken);

        res.json({
            success: true,
            message: 'Đã gửi link đặt lại mật khẩu! Vui lòng kiểm tra hộp thư email của bạn (có hiệu lực trong 1 giờ).',
            devMode: emailRes ? emailRes.devMode : false,
            resetUrl: emailRes ? emailRes.resetUrl : null
        });
    } catch (err) {
        console.error('Lỗi Forgot Password:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xử lý quên mật khẩu.' });
    }
});

/**
 * POST /api/auth/reset-password
 * Đặt lại mật khẩu mới thông qua token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password, confirm_password } = req.body;

        if (!token || !new_password) {
            return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin.' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
        }

        if (confirm_password && new_password !== confirm_password) {
            return res.status(400).json({ success: false, error: 'Mật khẩu xác nhận không khớp.' });
        }

        const tokenHashed = hashToken(token);

        const [tokenRows] = await pool.query(
            `SELECT * FROM password_reset_tokens 
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
            [tokenHashed]
        );

        if (tokenRows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (1 giờ).'
            });
        }

        const tokenData = tokenRows[0];
        const newPasswordHash = await bcrypt.hash(new_password, 10);

        // Cập nhật mật khẩu mới
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, tokenData.user_id]);
        // Đánh dấu token đã sử dụng
        await pool.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [tokenData.id]);

        res.json({
            success: true,
            message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
        });
    } catch (err) {
        console.error('Lỗi Reset Password:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đặt lại mật khẩu.' });
    }
});

/**
 * GET /api/auth/me
 * Lấy thông tin tài khoản hiện tại
 */
router.get('/me', requireUserAuth, async (req, res) => {
    try {
        const user = req.user;
        const rankInfo = getRankInfo(user.rating);
        const levelInfo = getLevelInfo(user.xp);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                avatar_url: user.avatar_url,
                bio: user.bio,
                rating: user.rating,
                xp: user.xp,
                level: levelInfo.level,
                level_info: levelInfo,
                rank_tier: rankInfo.tier,
                rank_division: rankInfo.division,
                rank_display: rankInfo.rankDisplayName,
                rank_icon: rankInfo.icon,
                rank_color: rankInfo.color,
                rank_progress: rankInfo.progressPercent,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Lỗi /api/auth/me:', err);
        res.status(500).json({ success: false, error: 'Lỗi lấy thông tin tài khoản.' });
    }
});

module.exports = router;
