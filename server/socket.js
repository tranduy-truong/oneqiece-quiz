const gameManager = require('./services/gameManager');

function setupSocketIO(io) {
    gameManager.setIO(io);

    io.on('connection', (socket) => {
        // 1. Host tạo phòng
        socket.on('CREATE_ROOM', async (data, callback) => {
            try {
                const { quiz_id, max_players, is_public, host_token } = data;
                const result = await gameManager.createRoom(
                    socket.id,
                    host_token || `host_${socket.id}`,
                    quiz_id,
                    { maxPlayers: max_players, isPublic: is_public }
                );

                socket.join(result.roomCode);
                if (typeof callback === 'function') {
                    callback({ success: true, data: result });
                }
            } catch (err) {
                console.error('Socket CREATE_ROOM Error:', err.message);
                if (typeof callback === 'function') {
                    callback({ success: false, error: err.message });
                }
            }
        });

        // 2. Player tham gia phòng
        socket.on('JOIN_ROOM', async (data, callback) => {
            try {
                const { room_code, username, session_token, avatar } = data;
                const result = await gameManager.joinRoom(
                    room_code.toUpperCase().trim(),
                    socket.id,
                    username,
                    session_token,
                    avatar
                );

                socket.join(result.roomCode);

                // Broadcast thông báo tới tất cả người trong phòng
                io.to(result.roomCode).emit('PLAYER_JOINED', {
                    player: result.player,
                    totalPlayers: result.playerList.length,
                    playerList: result.playerList
                });

                if (typeof callback === 'function') {
                    callback({ success: true, data: result });
                }
            } catch (err) {
                console.error('Socket JOIN_ROOM Error:', err.message);
                if (typeof callback === 'function') {
                    callback({ success: false, error: err.message });
                }
            }
        });

        // 3. Host bắt đầu trận đấu
        socket.on('START_GAME', async (data, callback) => {
            try {
                const { room_code } = data;
                await gameManager.startGame(room_code.toUpperCase().trim(), socket.id);
                if (typeof callback === 'function') {
                    callback({ success: true });
                }
            } catch (err) {
                console.error('Socket START_GAME Error:', err.message);
                if (typeof callback === 'function') {
                    callback({ success: false, error: err.message });
                }
            }
        });

        // 4. Player nộp câu trả lời
        socket.on('SUBMIT_ANSWER', async (data, callback) => {
            try {
                const room_code = data.room_code || '';
                const selected_answer = data.selected_answer || data.answer || data.choice || '';
                const result = await gameManager.submitAnswer(
                    room_code.toUpperCase().trim(),
                    socket.id,
                    selected_answer
                );
                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (err) {
                console.error('Socket SUBMIT_ANSWER Error:', err.message);
                if (typeof callback === 'function') {
                    callback({ success: false, error: err.message });
                }
            }
        });

        // 5. Reconnect khôi phục session
        socket.on('RECONNECT', (data, callback) => {
            try {
                const { room_code, session_token } = data;
                const result = gameManager.reconnectPlayer(
                    room_code.toUpperCase().trim(),
                    socket.id,
                    session_token
                );

                if (result.success) {
                    socket.join(room_code.toUpperCase().trim());
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (err) {
                console.error('Socket RECONNECT Error:', err.message);
                if (typeof callback === 'function') {
                    callback({ success: false, error: err.message });
                }
            }
        });

        // 6. Xử lý ngắt kết nối
        socket.on('disconnect', () => {
            gameManager.handleDisconnect(socket.id);
        });
    });
}

module.exports = setupSocketIO;
