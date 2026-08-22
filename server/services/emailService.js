/**
 * Email Service via Gmail SMTP (Nodemailer)
 * Sends Email Verification and Password Reset emails with Grand Line themed responsive HTML.
 * Includes Dev/Console fallback when SMTP credentials are not configured.
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || `"ONE PIECE QUIZ" <${SMTP_USER || 'noreply@onepiecequiz.com'}>`;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

let transporter = null;

function getTransporter() {
    if (!transporter && SMTP_USER && SMTP_PASSWORD) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASSWORD
            }
        });
    }
    return transporter;
}

/**
 * Gửi email xác thực tài khoản
 */
async function sendVerificationEmail(email, username, token) {
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
    const subject = '⚓ Xác nhận tài khoản ONE PIECE QUIZ — Gia nhập băng hải tặc!';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { margin: 0; padding: 0; background-color: #050914; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc; }
            .container { max-width: 580px; margin: 30px auto; background-color: #0c162c; border: 1.5px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
            .header { background: linear-gradient(135deg, #0c162c 0%, #1e293b 100%); padding: 30px 24px; text-align: center; border-bottom: 2px solid #f59e0b; }
            .logo-text { font-size: 24px; font-weight: 900; color: #f8fafc; letter-spacing: 1px; }
            .logo-accent { color: #f59e0b; }
            .content { padding: 36px 28px; text-align: center; }
            .title { font-size: 20px; font-weight: 800; color: #38bdf8; margin-bottom: 16px; }
            .text { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
            .btn { display: inline-block; padding: 14px 34px; background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%); color: #040812 !important; text-decoration: none; font-weight: 900; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 14px rgba(245,158,11,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
            .note { font-size: 13px; color: #64748b; margin-top: 30px; line-height: 1.5; }
            .footer { background-color: #080d1a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo-text">⚓ ONE PIECE <span class="logo-accent">QUIZ</span></div>
            </div>
            <div class="content">
                <div class="title">Chào mừng thuyền viên ${escapeHtml(username)}!</div>
                <p class="text">
                    Bạn vừa đăng ký tài khoản tại Đấu trường trắc nghiệm ONE PIECE QUIZ.<br>
                    Vui lòng bấm vào nút bên dưới để xác thực địa chỉ email và kích hoạt tài khoản leo Rank Grand Line:
                </p>
                <div style="margin: 30px 0;">
                    <a href="${verifyUrl}" class="btn" target="_blank">XÁC THỰC TÀI KHOẢN NGAY</a>
                </div>
                <p class="note">
                    Link xác thực có thời hạn trong <strong>24 giờ</strong>.<br>
                    Nếu nút không hoạt động, hãy copy đường dẫn sau dán vào trình duyệt:<br>
                    <a href="${verifyUrl}" style="color: #38bdf8; word-break: break-all;">${verifyUrl}</a>
                </p>
            </div>
            <div class="footer">
                © 2026 ONE PIECE QUIZ Platform • Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email.
            </div>
        </div>
    </body>
    </html>
    `;

    const trans = getTransporter();
    if (!trans) {
        console.log('====================================================');
        console.log('📧 [DEV EMAIL MODE] Chế độ gửi email dev (chưa cấu hình SMTP):');
        console.log(`👤 Người nhận: ${email} (${username})`);
        console.log(`🔗 Link xác thực: ${verifyUrl}`);
        console.log('====================================================');
        return { success: true, devMode: true, verifyUrl };
    }

    try {
        const info = await trans.sendMail({
            from: SMTP_FROM,
            to: email,
            subject,
            html
        });
        console.log(`✅ Đã gửi email xác thực tới ${email}:`, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Lỗi gửi email xác thực tới ${email}:`, err.message);
        // Fallback in dev console
        console.log(`🔗 Link xác thực khẩn cấp: ${verifyUrl}`);
        return { success: false, error: err.message, verifyUrl };
    }
}

/**
 * Gửi email đặt lại mật khẩu (Password Reset)
 */
async function sendPasswordResetEmail(email, username, token) {
    const resetUrl = `${APP_URL}/forgot-password?token=${token}`;
    const subject = '🔐 Đặt lại mật khẩu tài khoản ONE PIECE QUIZ';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { margin: 0; padding: 0; background-color: #050914; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc; }
            .container { max-width: 580px; margin: 30px auto; background-color: #0c162c; border: 1.5px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
            .header { background: linear-gradient(135deg, #0c162c 0%, #1e293b 100%); padding: 30px 24px; text-align: center; border-bottom: 2px solid #e11d48; }
            .logo-text { font-size: 24px; font-weight: 900; color: #f8fafc; letter-spacing: 1px; }
            .logo-accent { color: #f59e0b; }
            .content { padding: 36px 28px; text-align: center; }
            .title { font-size: 20px; font-weight: 800; color: #fb7185; margin-bottom: 16px; }
            .text { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
            .btn { display: inline-block; padding: 14px 34px; background: linear-gradient(180deg, #f43f5e 0%, #e11d48 100%); color: #ffffff !important; text-decoration: none; font-weight: 900; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 14px rgba(225,29,72,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
            .note { font-size: 13px; color: #64748b; margin-top: 30px; line-height: 1.5; }
            .footer { background-color: #080d1a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo-text">⚓ ONE PIECE <span class="logo-accent">QUIZ</span></div>
            </div>
            <div class="content">
                <div class="title">Yêu cầu đặt lại mật khẩu</div>
                <p class="text">
                    Chào <strong>${escapeHtml(username)}</strong>,<br>
                    Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.<br>
                    Bấm vào nút dưới đây để thiết lập mật khẩu mới:
                </p>
                <div style="margin: 30px 0;">
                    <a href="${resetUrl}" class="btn" target="_blank">ĐẶT LẠI MẬT KHẨU</a>
                </div>
                <p class="note">
                    Link này chỉ có hiệu lực trong <strong>1 giờ</strong>.<br>
                    Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này để bảo vệ tài khoản.
                </p>
            </div>
            <div class="footer">
                © 2026 ONE PIECE QUIZ Platform
            </div>
        </div>
    </body>
    </html>
    `;

    const trans = getTransporter();
    if (!trans) {
        console.log('====================================================');
        console.log('📧 [DEV EMAIL MODE] Chế độ reset password dev:');
        console.log(`👤 Người nhận: ${email} (${username})`);
        console.log(`🔗 Link Reset Password: ${resetUrl}`);
        console.log('====================================================');
        return { success: true, devMode: true, resetUrl };
    }

    try {
        const info = await trans.sendMail({
            from: SMTP_FROM,
            to: email,
            subject,
            html
        });
        console.log(`✅ Đã gửi email reset mật khẩu tới ${email}:`, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Lỗi gửi email reset mật khẩu tới ${email}:`, err.message);
        console.log(`🔗 Link Reset Password khẩn cấp: ${resetUrl}`);
        return { success: false, error: err.message, resetUrl };
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
