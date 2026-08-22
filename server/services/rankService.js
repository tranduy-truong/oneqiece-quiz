/**
 * Rank & XP Progression Service for ONE PIECE QUIZ
 * Centralized logic for Rating, Rank Tiers, Divisions, XP and Levels.
 */

const RANK_TIERS = [
    { tier: 'BRONZE', name: 'Tân Binh Hải Tặc', minRating: 0, maxRating: 999, color: '#cd7f32', icon: '🥉' },
    { tier: 'SILVER', name: 'Hải Tặc Grand Line', minRating: 1000, maxRating: 1399, color: '#94a3b8', icon: '🥈' },
    { tier: 'GOLD', name: 'Thuyền Trưởng Danh Tiếng', minRating: 1400, maxRating: 1799, color: '#f59e0b', icon: '🥇' },
    { tier: 'PLATINUM', name: 'Siêu Tân Tinh (Supernova)', minRating: 1800, maxRating: 2199, color: '#38bdf8', icon: '💎' },
    { tier: 'DIAMOND', name: 'Thất Vũ Hải (Warlord)', minRating: 2200, maxRating: 2599, color: '#a855f7', icon: '🔮' },
    { tier: 'MASTER', name: 'Đô Đốc / Tứ Hoàng (Emperor)', minRating: 2600, maxRating: 2999, color: '#e11d48', icon: '👑' },
    { tier: 'GRANDMASTER', name: 'Vua Hải Tặc (Pirate King)', minRating: 3000, maxRating: 99999, color: '#fbbf24', icon: '⚡' }
];

/**
 * Xác định Bậc Rank và Đoàn dựa trên điểm Rating
 * @param {number} rating 
 */
function getRankInfo(rating = 1000) {
    const cleanRating = Math.max(0, parseInt(rating, 10) || 1000);
    
    let tierObj = RANK_TIERS[0];
    for (const t of RANK_TIERS) {
        if (cleanRating >= t.minRating && cleanRating <= t.maxRating) {
            tierObj = t;
            break;
        }
    }

    let division = 'IV';
    if (tierObj.tier === 'MASTER' || tierObj.tier === 'GRANDMASTER') {
        division = '';
    } else {
        const range = tierObj.maxRating - tierObj.minRating + 1;
        const segment = range / 4;
        const offset = cleanRating - tierObj.minRating;
        if (offset < segment) division = 'IV';
        else if (offset < segment * 2) division = 'III';
        else if (offset < segment * 3) division = 'II';
        else division = 'I';
    }

    const rankDisplayName = division ? `${tierObj.name} ${division}` : tierObj.name;
    const rankCode = division ? `${tierObj.tier} ${division}` : tierObj.tier;

    // Tính % tiến trình đến bậc/đoàn tiếp theo
    let progressPercent = 100;
    if (tierObj.tier !== 'GRANDMASTER') {
        const currentMin = tierObj.minRating;
        const currentMax = tierObj.maxRating;
        progressPercent = Math.min(100, Math.max(0, Math.round(((cleanRating - currentMin) / (currentMax - currentMin)) * 100)));
    }

    return {
        tier: tierObj.tier,
        division,
        rankCode,
        rankDisplayName,
        color: tierObj.color,
        icon: tierObj.icon,
        rating: cleanRating,
        progressPercent
    };
}

/**
 * Tính Cấp độ Level dựa trên XP
 * Công thức: Level = Math.floor(Math.sqrt(XP / 100)) + 1
 * @param {number} xp 
 */
function getLevelInfo(xp = 0) {
    const cleanXP = Math.max(0, parseInt(xp, 10) || 0);
    const level = Math.floor(Math.sqrt(cleanXP / 100)) + 1;

    // XP cần để đạt level hiện tại và level tiếp theo
    const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
    const nextLevelBaseXP = Math.pow(level, 2) * 100;
    const xpInCurrentLevel = cleanXP - currentLevelBaseXP;
    const xpNeededForNextLevel = nextLevelBaseXP - currentLevelBaseXP;
    const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100)));

    return {
        level,
        totalXP: cleanXP,
        currentLevelBaseXP,
        nextLevelBaseXP,
        xpInCurrentLevel,
        xpNeededForNextLevel,
        progressPercent
    };
}

/**
 * Tính toán điểm Rating và XP sau bài thi Solo
 */
function calculateSoloReward(accuracy = 0, score = 0, totalQuestions = 20, currentRating = 1000) {
    const acc = Math.max(0, Math.min(100, parseFloat(accuracy) || 0));
    
    // Rating Change
    let ratingChange = 0;
    if (acc >= 90) ratingChange = 25;
    else if (acc >= 75) ratingChange = 15;
    else if (acc >= 50) ratingChange = 5;
    else if (acc >= 30) ratingChange = -5;
    else ratingChange = -15;

    // XP Gained
    const xpGained = Math.max(20, Math.round(50 + (score / 15) + (acc * 0.8)));
    
    // Rating Floor: Không để rating < 0
    const ratingAfter = Math.max(0, currentRating + ratingChange);

    return {
        ratingBefore: currentRating,
        ratingChange,
        ratingAfter,
        xpGained,
        newRank: getRankInfo(ratingAfter)
    };
}

/**
 * Tính toán điểm Rating và XP sau trận đấu Multiplayer Room
 */
function calculateMultiplayerReward(finalRank = 1, totalPlayers = 1, score = 0, accuracy = 0, currentRating = 1000) {
    const rank = Math.max(1, parseInt(finalRank, 10) || 1);
    const players = Math.max(1, parseInt(totalPlayers, 10) || 1);
    const acc = Math.max(0, Math.min(100, parseFloat(accuracy) || 0));

    let ratingChange = 0;
    let isWinner = (rank === 1);

    if (players === 1) {
        // Nếu chơi phòng 1 người, áp dụng thang điểm Solo
        return calculateSoloReward(accuracy, score, 20, currentRating);
    }

    if (rank === 1) {
        ratingChange = Math.min(50, 30 + Math.floor(players * 2));
    } else if (rank <= Math.ceil(players / 2)) {
        // Nửa trên
        ratingChange = Math.max(10, Math.floor(25 - (rank * 3)));
    } else {
        // Nửa dưới
        ratingChange = -Math.max(5, Math.floor((rank - Math.ceil(players / 2)) * 6));
    }

    // Bonus XP
    const xpGained = Math.max(50, Math.round(100 + (score / 20) + (isWinner ? 150 : 0) + (acc * 0.5)));
    const ratingAfter = Math.max(0, currentRating + ratingChange);

    return {
        ratingBefore: currentRating,
        ratingChange,
        ratingAfter,
        xpGained,
        isWinner,
        newRank: getRankInfo(ratingAfter)
    };
}

module.exports = {
    RANK_TIERS,
    getRankInfo,
    getLevelInfo,
    calculateSoloReward,
    calculateMultiplayerReward
};
