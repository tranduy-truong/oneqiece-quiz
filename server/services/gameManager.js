const { pool } = require('../db');
const jwt = require('jsonwebtoken');
const { calculateMultiplayerReward, getLevelInfo, getRankInfo } = require('./rankService');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_quiz_jwt_key_2026_onepiece';

class GameManager {
    constructor() {
        // In-memory active rooms: { [roomCode]: RoomObject }
        this.rooms = new Map();
        // Mapping: socketId -> { roomCode, isHost, sessionToken }
        this.socketMap = new Map();
        // Socket.IO server instance
        this.io = null;
    }

    setIO(io) {
        this.io = io;
    }

    /**
     * Tạo mã phòng 6 ký tự ngẫu nhiên (dễ đọc, tránh nhầm lẫn)
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (this.rooms.has(code)) {
            return this.generateRoomCode();
        }
        return code;
    }

    /**
     * Host tạo phòng thi đấu mới
     */
    async createRoom(hostSocketId, hostToken, quizId, options = {}) {
        const [quizRows] = await pool.query(
            'SELECT q.*, t.name as topic_name FROM quizzes q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.id = ? AND q.status = "PUBLISHED"',
            [quizId]
        );

        if (quizRows.length === 0) {
            throw new Error('Bộ đề thi không tồn tại hoặc chưa được công khai.');
        }

        const quiz = quizRows[0];
        const roomCode = this.generateRoomCode();
        const maxPlayers = parseInt(options.maxPlayers, 10) || 50;
        const isPublic = options.isPublic !== false;

        const room = {
            roomCode,
            hostSocketId,
            hostToken,
            quizId: quiz.id,
            quizTitle: quiz.title,
            topicName: quiz.topic_name || 'Chung',
            timePerQuestion: quiz.time_per_question || 15,
            totalQuestions: quiz.total_questions || 20,
            isRandom: Boolean(quiz.is_random),
            status: 'WAITING', // WAITING, STARTING, QUESTION, QUESTION_RESULT, LEADERBOARD, FINISHED, CANCELLED
            maxPlayers,
            isPublic,
            players: new Map(), // sessionToken -> Player
            playerSockets: new Map(), // socketId -> sessionToken
            questionList: [], // Locked question snapshots
            currentQuestionIndex: -1,
            questionStartTime: null,
            questionTimer: null,
            transitionTimer: null,
            currentAnswers: new Map(), // sessionToken -> { answer, isCorrect, responseTimeMs, scoreAwarded }
            gameSessionId: null,
            createdAt: Date.now()
        };

        this.rooms.set(roomCode, room);
        this.socketMap.set(hostSocketId, { roomCode, isHost: true, hostToken });

        // Ghi nhận vào DB bảng rooms
        try {
            await pool.query(
                `INSERT INTO rooms (room_code, host_session_token, quiz_id, status, max_players, is_public) 
                 VALUES (?, ?, ?, 'WAITING', ?, ?)`,
                [roomCode, hostToken, quiz.id, maxPlayers, isPublic]
            );
        } catch (dbErr) {
            console.error('Lỗi lưu room vào DB:', dbErr.message);
        }

        return {
            roomCode,
            quizTitle: quiz.title,
            topicName: quiz.topic_name,
            timePerQuestion: room.timePerQuestion,
            totalQuestions: room.totalQuestions,
            maxPlayers: room.maxPlayers
        };
    }

    /**
     * Người chơi tham gia phòng (Join Room)
     */
    async joinRoom(roomCode, socketId, username, sessionToken, avatar = '/images/A.jpg', authToken = null) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            throw new Error('Phòng không tồn tại hoặc đã bị hủy.');
        }

        if (room.status !== 'WAITING') {
            throw new Error('Trận đấu trong phòng này đã bắt đầu hoặc đã kết thúc.');
        }

        if (room.players.size >= room.maxPlayers) {
            throw new Error('Phòng đã đầy người chơi.');
        }

        // Kiểm tra User ID nếu có Auth Token
        let userId = null;
        let registeredUser = null;
        if (authToken) {
            try {
                const decoded = jwt.verify(authToken, JWT_SECRET);
                if (decoded && decoded.userId) {
                    const [uRows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
                    if (uRows.length > 0) {
                        registeredUser = uRows[0];
                        userId = registeredUser.id;
                    }
                }
            } catch (authErr) {
                // Ignore token error, fallback to guest
            }
        }

        const cleanUsername = String((registeredUser && registeredUser.display_name) || username || '').trim();
        if (!cleanUsername || cleanUsername.length > 25) {
            throw new Error('Tên người chơi không hợp lệ (1 - 25 ký tự).');
        }

        const finalAvatar = (registeredUser && registeredUser.avatar_url) || avatar || '/images/A.jpg';

        // Kiểm tra trùng username trong cùng room
        for (const p of room.players.values()) {
            if (p.username.toLowerCase() === cleanUsername.toLowerCase() && p.sessionToken !== sessionToken) {
                throw new Error(`Tên "${cleanUsername}" đã có người sử dụng trong phòng này.`);
            }
        }

        // Upsert Player vào DB
        let playerId = null;
        try {
            const [playerRes] = await pool.query(
                `INSERT INTO players (username, session_token, avatar) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE username = VALUES(username), avatar = VALUES(avatar), last_active = CURRENT_TIMESTAMP`,
                [cleanUsername, sessionToken, finalAvatar]
            );
            playerId = playerRes.insertId || null;
            if (!playerId) {
                const [pRows] = await pool.query('SELECT id FROM players WHERE session_token = ?', [sessionToken]);
                if (pRows.length > 0) playerId = pRows[0].id;
            }
        } catch (dbErr) {
            console.error('Lỗi lưu Player vào DB:', dbErr.message);
        }

        const rankInfo = registeredUser ? getRankInfo(registeredUser.rating) : null;

        const player = {
            playerId,
            userId,
            sessionToken,
            username: cleanUsername,
            avatar: finalAvatar,
            socketId,
            connected: true,
            totalScore: 0,
            correctCount: 0,
            wrongCount: 0,
            streak: 0,
            maxStreak: 0,
            lastAnswer: null,
            rank: 1,
            prevRank: 1,
            isRegistered: Boolean(userId),
            rankInfo: rankInfo ? { tier: rankInfo.tier, icon: rankInfo.icon, rating: registeredUser.rating } : null
        };

        room.players.set(sessionToken, player);
        room.playerSockets.set(socketId, sessionToken);
        this.socketMap.set(socketId, { roomCode, isHost: false, sessionToken });

        return {
            roomCode,
            quizTitle: room.quizTitle,
            topicName: room.topicName,
            player: {
                playerId,
                userId,
                username: cleanUsername,
                avatar: finalAvatar,
                sessionToken,
                isRegistered: Boolean(userId),
                rankInfo: player.rankInfo
            },
            playerList: this.getPlayerList(roomCode)
        };
    }

    /**
     * Lấy danh sách người chơi trong phòng
     */
    getPlayerList(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return [];
        return Array.from(room.players.values()).map(p => ({
            playerId: p.playerId,
            username: p.username,
            avatar: p.avatar,
            connected: p.connected,
            totalScore: p.totalScore,
            rank: p.rank
        }));
    }

    /**
     * Host bắt đầu trận đấu (START GAME)
     */
    async startGame(roomCode, hostSocketId) {
        const room = this.rooms.get(roomCode);
        if (!room) throw new Error('Phòng không tồn tại.');
        if (room.hostSocketId !== hostSocketId) throw new Error('Chỉ có Host mới có quyền bắt đầu trận đấu.');
        if (room.status !== 'WAITING') throw new Error('Trận đấu đã bắt đầu.');
        if (room.players.size === 0) throw new Error('Cần ít nhất 1 người chơi trong phòng để bắt đầu.');

        // Lấy danh sách câu hỏi từ Database nếu chưa có sẵn
        let questionRows = room.questionList;
        if (!questionRows || questionRows.length === 0) {
            try {
                let query = 'SELECT * FROM questions WHERE quiz_id = ?';
                if (room.isRandom) {
                    query += ' ORDER BY RAND()';
                } else {
                    query += ' ORDER BY id ASC';
                }
                query += ` LIMIT ${room.totalQuestions}`;

                let [rows] = await pool.query(query, [room.quizId]);

                if (!rows || rows.length === 0) {
                    let fallbackQuery = 'SELECT * FROM questions WHERE topic_id = (SELECT topic_id FROM quizzes WHERE id = ?) AND (quiz_id IS NULL OR quiz_id = ?)';
                    if (room.isRandom) fallbackQuery += ' ORDER BY RAND()';
                    else fallbackQuery += ' ORDER BY id ASC';
                    fallbackQuery += ` LIMIT ${room.totalQuestions}`;
                    const [fbRows] = await pool.query(fallbackQuery, [room.quizId, room.quizId]);
                    rows = fbRows;
                }

                questionRows = rows;
            } catch (dbErr) {
                console.error('Lỗi truy vấn câu hỏi DB:', dbErr.message);
            }
        }

        if (!questionRows || questionRows.length === 0) {
            throw new Error('Chưa có câu hỏi nào cho bộ đề này.');
        }

        room.questionList = questionRows;
        room.status = 'STARTING';

        // Tạo Game Session trong Database
        try {
            const [sessRes] = await pool.query(
                `INSERT INTO game_sessions (quiz_id, mode, total_questions_count) VALUES (?, 'MULTIPLAYER', ?)`,
                [room.quizId, questionRows.length]
            );
            room.gameSessionId = sessRes.insertId;

            // Lưu snapshot toàn bộ câu hỏi của game này
            for (let i = 0; i < questionRows.length; i++) {
                const q = questionRows[i];
                await pool.query(
                    `INSERT INTO game_session_questions 
                    (game_session_id, question_order, original_question_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty, arc, chapter)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [room.gameSessionId, i + 1, q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.category, q.difficulty, q.arc || 'Chung', q.chapter || 'Chung']
                );
            }

            await pool.query('UPDATE rooms SET status = "IN_GAME" WHERE room_code = ?', [roomCode]);
        } catch (dbErr) {
            console.error('Lỗi khởi tạo Game Session DB:', dbErr.message);
        }

        // Bắt đầu đếm ngược 3s chuẩn bị
        this.io.to(roomCode).emit('GAME_STARTING', {
            countdown: 3,
            totalQuestions: questionRows.length
        });

        setTimeout(() => {
            this.sendNextQuestion(roomCode);
        }, 3000);
    }

    /**
     * Chuyển sang câu hỏi kế tiếp
     */
    sendNextQuestion(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room || room.status === 'CANCELLED') return;

        room.currentQuestionIndex++;

        // Nếu đã hết câu hỏi -> Kết thúc game
        if (room.currentQuestionIndex >= room.questionList.length) {
            this.finishGame(roomCode);
            return;
        }

        const q = room.questionList[room.currentQuestionIndex];
        room.status = 'QUESTION';
        room.currentAnswers.clear();
        room.questionStartTime = Date.now();

        // Broadcast câu hỏi tới tất cả client (LƯU Ý BẢO MẬT: KHÔNG gửi correct_answer và explanation)
        const payload = {
            questionNumber: room.currentQuestionIndex + 1,
            totalQuestions: room.questionList.length,
            questionText: q.question_text,
            options: {
                A: q.option_a,
                B: q.option_b,
                C: q.option_c,
                D: q.option_d
            },
            category: q.category || 'Chung',
            difficulty: q.difficulty || 1,
            arc: q.arc || 'Chung',
            chapter: q.chapter || 'Chung',
            timeLimit: room.timePerQuestion,
            startTime: room.questionStartTime
        };

        this.io.to(roomCode).emit('QUESTION_STARTED', payload);

        // Đặt Timer đếm ngược tại Server
        if (room.questionTimer) clearTimeout(room.questionTimer);
        room.questionTimer = setTimeout(() => {
            this.endQuestion(roomCode);
        }, (room.timePerQuestion + 0.5) * 1000);
    }

    /**
     * Xử lý nộp câu trả lời từ Player
     */
    async submitAnswer(roomCode, socketId, selectedAnswer) {
        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'QUESTION') {
            return { success: false, error: 'Câu hỏi chưa mở hoặc đã hết thời gian.' };
        }

        const sessionToken = room.playerSockets.get(socketId);
        if (!sessionToken) {
            return { success: false, error: 'Không tìm thấy người chơi.' };
        }

        const player = room.players.get(sessionToken);
        if (!player) {
            return { success: false, error: 'Người chơi không hợp lệ.' };
        }

        // Anti-cheat: Chặn trả lời 2 lần trong 1 câu
        if (room.currentAnswers.has(sessionToken)) {
            return { success: false, error: 'Bạn đã nộp đáp án cho câu hỏi này rồi.' };
        }

        const now = Date.now();
        const responseTimeMs = Math.max(0, now - room.questionStartTime);
        const timeLimitMs = room.timePerQuestion * 1000;

        // Nếu quá giờ quá 1 giây (độ trễ mạng) -> tính là hết giờ
        if (responseTimeMs > timeLimitMs + 1000) {
            return { success: false, error: 'Đã hết thời gian trả lời câu hỏi này.' };
        }

        const currentQ = room.questionList[room.currentQuestionIndex];
        const isCorrect = String(selectedAnswer).toUpperCase() === String(currentQ.correct_answer).toUpperCase();

        // Công thức tính điểm Kahoot Speed-Bonus
        let scoreAwarded = 0;
        if (isCorrect) {
            const baseScore = 1000;
            const maxBonus = 500;
            const speedRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
            scoreAwarded = Math.round(baseScore + (speedRatio * maxBonus));

            player.correctCount++;
            player.streak++;
            if (player.streak > player.maxStreak) player.maxStreak = player.streak;
            player.totalScore += scoreAwarded;
        } else {
            player.wrongCount++;
            player.streak = 0;
        }

        const answerRecord = {
            answer: selectedAnswer,
            isCorrect,
            responseTimeMs,
            scoreAwarded,
            answeredAt: now
        };

        player.lastAnswer = answerRecord;
        room.currentAnswers.set(sessionToken, answerRecord);

        // Lưu câu trả lời vào Database
        if (room.gameSessionId && player.playerId) {
            pool.query(
                `INSERT INTO game_player_answers 
                (game_session_id, player_id, question_order, selected_answer, is_correct, response_time_ms, score_awarded)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [room.gameSessionId, player.playerId, room.currentQuestionIndex + 1, selectedAnswer, isCorrect, responseTimeMs, scoreAwarded]
            ).catch(err => console.error('Lỗi ghi nhận answer DB:', err.message));
        }

        // Báo cho Host biết tiến độ (ví dụ 5/6 người đã trả lời)
        this.io.to(roomCode).emit('ANSWER_SUBMITTED_PROGRESS', {
            answeredCount: room.currentAnswers.size,
            totalPlayers: room.players.size
        });

        // Nếu tất cả người chơi đều đã trả lời xong -> Kết thúc câu hỏi ngay không cần chờ hết giờ
        if (room.currentAnswers.size >= room.players.size) {
            clearTimeout(room.questionTimer);
            setTimeout(() => this.endQuestion(roomCode), 500);
        }

        return {
            success: true,
            isCorrect,
            scoreAwarded,
            totalScore: player.totalScore
        };
    }

    /**
     * Kết thúc câu hỏi -> Tiết lộ đáp án đúng & thống kê
     */
    endQuestion(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'QUESTION') return;

        if (room.questionTimer) clearTimeout(room.questionTimer);
        room.status = 'QUESTION_RESULT';

        const currentQ = room.questionList[room.currentQuestionIndex];

        // Thống kê số lượng người chọn từng đáp án A, B, C, D
        const stats = { A: 0, B: 0, C: 0, D: 0, NO_ANSWER: 0 };
        for (const p of room.players.values()) {
            const ans = room.currentAnswers.get(p.sessionToken);
            if (ans && stats[ans.answer] !== undefined) {
                stats[ans.answer]++;
            } else {
                stats.NO_ANSWER++;
            }
        }

        // Cập nhật lại xếp hạng tạm thời
        this.updateRoomRankings(roomCode);

        // Gửi kết quả câu hỏi tới tất cả player và host
        this.io.to(roomCode).emit('QUESTION_ENDED', {
            questionNumber: room.currentQuestionIndex + 1,
            correctAnswer: currentQ.correct_answer,
            explanation: currentQ.explanation || 'Không có giải thích bổ sung.',
            stats,
            leaderboard: this.getLeaderboard(roomCode)
        });

        // Sau 4 giây chuyển sang màn hình Leaderboard
        room.transitionTimer = setTimeout(() => {
            this.showLeaderboard(roomCode);
        }, 4000);
    }

    /**
     * Cập nhật thứ hạng người chơi
     */
    updateRoomRankings(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const playersArr = Array.from(room.players.values());
        playersArr.sort((a, b) => b.totalScore - a.totalScore);

        playersArr.forEach((p, idx) => {
            p.prevRank = p.rank;
            p.rank = idx + 1;
        });
    }

    /**
     * Lấy danh sách bảng xếp hạng Leaderboard
     */
    getLeaderboard(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return [];

        const playersArr = Array.from(room.players.values());
        playersArr.sort((a, b) => b.totalScore - a.totalScore);

        return playersArr.map(p => ({
            playerId: p.playerId,
            username: p.username,
            avatar: p.avatar,
            totalScore: p.totalScore,
            rank: p.rank,
            rankChange: p.prevRank - p.rank, // Dương = tăng hạng, Âm = tụt hạng, 0 = giữ nguyên
            isCorrectLast: p.lastAnswer ? p.lastAnswer.isCorrect : false,
            scoreAwardedLast: p.lastAnswer ? p.lastAnswer.scoreAwarded : 0
        }));
    }

    /**
     * Hiển thị bảng xếp hạng Leaderboard giữa các câu hỏi
     */
    showLeaderboard(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room || room.status === 'CANCELLED') return;

        room.status = 'LEADERBOARD';

        const isLastQuestion = room.currentQuestionIndex >= room.questionList.length - 1;

        this.io.to(roomCode).emit('LEADERBOARD_UPDATE', {
            questionNumber: room.currentQuestionIndex + 1,
            totalQuestions: room.questionList.length,
            isLastQuestion,
            leaderboard: this.getLeaderboard(roomCode)
        });

        // Sau 4.5 giây tự động chuyển sang câu hỏi kế tiếp (hoặc kết thúc nếu là câu cuối)
        room.transitionTimer = setTimeout(() => {
            this.sendNextQuestion(roomCode);
        }, 4500);
    }

    /**
     * Kết thúc toàn bộ trận đấu -> Trao cúp Podium & Lưu Database
     */
    async finishGame(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        room.status = 'FINISHED';
        this.updateRoomRankings(roomCode);
        const finalLeaderboard = this.getLeaderboard(roomCode);

        // Lưu kết quả tổng kết của từng player vào DB
        if (room.gameSessionId) {
            try {
                await pool.query('UPDATE game_sessions SET finished_at = CURRENT_TIMESTAMP WHERE id = ?', [room.gameSessionId]);
                await pool.query('UPDATE rooms SET status = "FINISHED" WHERE room_code = ?', [roomCode]);

                for (const p of room.players.values()) {
                    const accuracy = room.questionList.length > 0 ? (p.correctCount / room.questionList.length) * 100 : 0;
                    
                    if (p.playerId) {
                        await pool.query(
                            `INSERT INTO game_player_results 
                            (game_session_id, player_id, total_score, correct_count, wrong_count, accuracy, final_rank)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [room.gameSessionId, p.playerId, p.totalScore, p.correctCount, p.wrongCount, accuracy, p.rank]
                        );
                    }

                    // Nếu là Registered User -> Tính Rank & XP và lưu vào quiz_results
                    if (p.userId) {
                        try {
                            const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [p.userId]);
                            if (userRows.length > 0) {
                                const user = userRows[0];
                                const reward = calculateMultiplayerReward(p.rank, room.players.size, p.totalScore, accuracy, user.rating);
                                const newTotalXP = (user.xp || 0) + reward.xpGained;
                                const newLevelInfo = getLevelInfo(newTotalXP);

                                // Cập nhật user rating & xp
                                await pool.query(
                                    `UPDATE users 
                                     SET rating = ?, xp = ?, level = ?, rank_tier = ?, rank_division = ?
                                     WHERE id = ?`,
                                    [reward.ratingAfter, newTotalXP, newLevelInfo.level, reward.newRank.tier, reward.newRank.division, user.id]
                                );

                                // Lưu vào quiz_results
                                await pool.query(
                                    `INSERT INTO quiz_results 
                                     (user_id, player_id, game_session_id, quiz_id, mode, score, correct_answers, total_questions, accuracy, rating_before, rating_change, rating_after, xp_gained, final_rank)
                                     VALUES (?, ?, ?, ?, 'RANKED_MULTIPLAYER', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [user.id, p.playerId, room.gameSessionId, room.quizId, p.totalScore, p.correctCount, room.questionList.length, accuracy, reward.ratingBefore, reward.ratingChange, reward.ratingAfter, reward.xpGained, p.rank]
                                );
                            }
                        } catch (uErr) {
                            console.error('Lỗi cập nhật rank user multiplayer:', uErr.message);
                        }
                    } else {
                        // Guest result
                        await pool.query(
                            `INSERT INTO quiz_results 
                             (user_id, player_id, game_session_id, quiz_id, mode, score, correct_answers, total_questions, accuracy, rating_before, rating_change, rating_after, xp_gained, final_rank)
                             VALUES (NULL, ?, ?, ?, 'CASUAL_MULTIPLAYER', ?, ?, ?, ?, 1000, 0, 1000, 0, ?)`,
                            [p.playerId, room.gameSessionId, room.quizId, p.totalScore, p.correctCount, room.questionList.length, accuracy, p.rank]
                        );
                    }
                }
            } catch (dbErr) {
                console.error('Lỗi lưu kết quả chung cuộc DB:', dbErr.message);
            }
        }

        // Broadcast vinh danh Podium Top 1, Top 2, Top 3
        this.io.to(roomCode).emit('GAME_FINISHED', {
            podium: {
                first: finalLeaderboard[0] || null,
                second: finalLeaderboard[1] || null,
                third: finalLeaderboard[2] || null
            },
            fullLeaderboard: finalLeaderboard,
            totalQuestions: room.questionList.length
        });
    }

    /**
     * Người chơi thoát hoặc mất kết nối
     */
    handleDisconnect(socketId) {
        const info = this.socketMap.get(socketId);
        if (!info) return;

        const { roomCode, isHost, sessionToken } = info;
        const room = this.rooms.get(roomCode);
        if (!room) return;

        if (isHost) {
            // Nếu Host thoát trong lúc phòng đang chờ -> Hủy phòng
            if (room.status === 'WAITING') {
                room.status = 'CANCELLED';
                this.io.to(roomCode).emit('ROOM_CANCELLED', { message: 'Host đã đóng phòng thi đấu.' });
                this.rooms.delete(roomCode);
            }
        } else if (sessionToken) {
            const player = room.players.get(sessionToken);
            if (player) {
                player.connected = false;
                if (room.status === 'WAITING') {
                    // Nếu đang ở lobby thì xóa hẳn
                    room.players.delete(sessionToken);
                    room.playerSockets.delete(socketId);
                    this.io.to(roomCode).emit('PLAYER_LEFT', {
                        sessionToken,
                        username: player.username,
                        totalPlayers: room.players.size,
                        playerList: this.getPlayerList(roomCode)
                    });
                } else {
                    // Nếu đang thi đấu thì chỉ đánh dấu mất kết nối để cho phép Reconnect
                    this.io.to(roomCode).emit('PLAYER_DISCONNECTED', {
                        sessionToken,
                        username: player.username
                    });
                }
            }
        }

        this.socketMap.delete(socketId);
    }

    /**
     * Khôi phục kết nối (Reconnect) khi F5 hoặc rớt mạng
     */
    reconnectPlayer(roomCode, socketId, sessionToken) {
        const room = this.rooms.get(roomCode);
        if (!room || !room.players.has(sessionToken)) {
            return { success: false, error: 'Phiên chơi không còn tồn tại.' };
        }

        const player = room.players.get(sessionToken);
        player.socketId = socketId;
        player.connected = true;
        room.playerSockets.set(socketId, sessionToken);
        this.socketMap.set(socketId, { roomCode, isHost: false, sessionToken });

        this.io.to(roomCode).emit('PLAYER_RECONNECTED', {
            sessionToken,
            username: player.username
        });

        // Trả về trạng thái hiện tại của Game để Client hiển thị tiếp tục
        let currentQuestionPayload = null;
        if (room.status === 'QUESTION' && room.currentQuestionIndex >= 0) {
            const q = room.questionList[room.currentQuestionIndex];
            currentQuestionPayload = {
                questionNumber: room.currentQuestionIndex + 1,
                totalQuestions: room.questionList.length,
                questionText: q.question_text,
                options: {
                    A: q.option_a,
                    B: q.option_b,
                    C: q.option_c,
                    D: q.option_d
                },
                timeLimit: room.timePerQuestion,
                startTime: room.questionStartTime,
                hasAnswered: room.currentAnswers.has(sessionToken),
                userAnswer: room.currentAnswers.get(sessionToken) || null
            };
        }

        return {
            success: true,
            status: room.status,
            currentQuestion: currentQuestionPayload,
            totalScore: player.totalScore,
            rank: player.rank,
            leaderboard: this.getLeaderboard(roomCode)
        };
    }
}

const gameManager = new GameManager();
module.exports = gameManager;
