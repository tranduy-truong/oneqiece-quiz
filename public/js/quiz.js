/**
 * One Piece Quiz - Welcome Landing Screen, Instant Feedback with Side GIFs & Answer Lock
 */

// Hình ảnh GIF cho các trạng thái
const GIF_LOADING =
  "https://media1.tenor.com/m/EQLp7bbM_7gAAAAC/kizaru-smile-one-piece.gif";
const GIF_CORRECT =
  "https://media.tenor.com/8nKtYuN8pmUAAAAM/chopper-toni-chopper.gif";
const GIF_WRONG =
  "https://media.tenor.com/nXjNCZY_PE4AAAAM/happy-dance-moves.gif";

let questions = [];
let currentIndex = 0;
// Lưu trữ trạng thái câu đã làm: { [questionId]: { user_answer, is_correct, correct_answer, explanation, category, difficulty } }
let answeredRecords = {};
let score = 0;
let streak = 0;
let maxStreak = 0;
let correctCount = 0;

// DOM Elements
const welcomeScreen = document.getElementById("welcome-screen");
const loadingState = document.getElementById("loading-state");
const loadingImage = document.getElementById("loading-image");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const questionProgress = document.getElementById("question-progress");
const scoreDisplay = document.getElementById("score-display");
const streakDisplay = document.getElementById("streak-display");
const progressBar = document.getElementById("progress-bar");
const badgeCategory = document.getElementById("badge-category");
const badgeDifficulty = document.getElementById("badge-difficulty");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const questionNavigator = document.getElementById("question-navigator");

const explanationBox = document.getElementById("explanation-box");
const explanationGif = document.getElementById("explanation-gif");
const explanationStatus = document.getElementById("explanation-status");
const explanationText = document.getElementById("explanation-text");
const explanationNote = document.getElementById("explanation-note");

const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnFinish = document.getElementById("btn-finish");

// Khi load trang: Giữ nguyên màn hình Chào mừng (Welcome) cho tới khi bấm Bắt đầu
document.addEventListener("DOMContentLoaded", () => {
  if (loadingImage && GIF_LOADING) {
    loadingImage.src = GIF_LOADING;
  }
});

/**
 * Bắt đầu làm Quiz khi bấm nút "BẮT ĐẦU NGAY"
 */
async function startQuizNow() {
  welcomeScreen.style.display = "none";
  loadingState.style.display = "flex";
  errorState.style.display = "none";
  quizScreen.style.display = "none";
  resultScreen.style.display = "none";

  try {
    const response = await fetch("/api/questions");
    const result = await response.json();

    if (response.ok && result.success && result.data.length > 0) {
      questions = result.data;
      currentIndex = 0;
      score = 0;
      streak = 0;
      maxStreak = 0;
      correctCount = 0;
      answeredRecords = {};

      setTimeout(() => {
        loadingState.style.display = "none";
        quizScreen.style.display = "block";
        renderNavigator();
        renderCurrentQuestion();
      }, 300);
    } else {
      throw new Error(
        result.error || "Chưa có câu hỏi nào trong cơ sở dữ liệu.",
      );
    }
  } catch (err) {
    console.error("Lỗi tải câu hỏi:", err);
    loadingState.style.display = "none";
    errorState.style.display = "block";
    errorMessage.innerText =
      err.message || "Không thể kết nối đến cơ sở dữ liệu.";
  }
}

/**
 * Vẽ bảng điều hướng chuyển qua lại giữa các câu hỏi
 */
function renderNavigator() {
  questionNavigator.innerHTML = "";
  questions.forEach((q, idx) => {
    const item = document.createElement("div");
    item.className = "nav-grid-item";
    item.id = `nav-dot-${idx}`;
    item.innerText = idx + 1;
    item.onclick = () => jumpToQuestion(idx);
    questionNavigator.appendChild(item);
  });
  updateNavigatorState();
}

/**
 * Cập nhật màu sắc trạng thái các nút trong bảng chuyển câu hỏi
 */
function updateNavigatorState() {
  questions.forEach((q, idx) => {
    const dot = document.getElementById(`nav-dot-${idx}`);
    if (!dot) return;

    dot.className = "nav-grid-item";

    if (answeredRecords[q.id]) {
      if (answeredRecords[q.id].is_correct) {
        dot.classList.add("answered-correct");
      } else {
        dot.classList.add("answered-wrong");
      }
    }

    if (idx === currentIndex) {
      dot.classList.add("active");
    }
  });

  // Kiểm tra xem đã hoàn thành tất cả câu hỏi chưa
  const answeredCount = Object.keys(answeredRecords).length;
  if (answeredCount === questions.length) {
    btnFinish.style.display = "inline-flex";
  } else {
    btnFinish.style.display = "none";
  }
}

/**
 * Hiển thị câu hỏi hiện tại
 */
function renderCurrentQuestion() {
  if (questions.length === 0) return;

  const q = questions[currentIndex];
  const record = answeredRecords[q.id]; // Kiểm tra xem câu này đã làm chưa

  // Cập nhật thông số
  questionProgress.innerText = `Câu ${currentIndex + 1} / ${questions.length}`;
  scoreDisplay.innerText = score;
  streakDisplay.innerText = streak;

  const progressPercent = Math.round(
    ((currentIndex + 1) / questions.length) * 100,
  );
  progressBar.style.width = `${progressPercent}%`;

  badgeCategory.innerText = q.category || "Chung";
  badgeDifficulty.innerText = `Level ${q.difficulty || 1}`;

  questionText.innerText = q.question_text;

  // Render 4 options
  optionsContainer.innerHTML = "";
  const options = [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ];

  options.forEach((opt) => {
    const optEl = document.createElement("div");
    optEl.className = "option-item";
    optEl.dataset.key = opt.key;

    // Nếu câu hỏi ĐÃ LÀM RỒI -> Khóa chọn lại và hiển thị đáp án đúng/sai
    if (record) {
      optEl.classList.add("disabled");
      if (opt.key === record.user_answer) {
        optEl.classList.add(record.is_correct ? "correct" : "wrong");
      }
      if (!record.is_correct && opt.key === record.correct_answer) {
        optEl.classList.add("correct");
      }
    } else {
      // Nếu chưa làm -> Cho phép click chọn
      optEl.onclick = () => handleSelectOption(q.id, opt.key, optEl);
    }

    optEl.innerHTML = `
            <div class="option-key">${opt.key}</div>
            <div class="option-text">${escapeHtml(opt.text)}</div>
        `;
    optionsContainer.appendChild(optEl);
  });

  // Nếu đã làm -> Hiện lại giải thích kèm hình GIF tương ứng (Đúng: Chopper, Sai: Bon Clay)
  if (record) {
    if (record.is_correct) {
      explanationBox.className = "explanation-card correct-card";
      explanationGif.src = GIF_CORRECT;
      explanationStatus.className = "explanation-status correct";
      explanationStatus.innerText = "CHÍNH XÁC!";
    } else {
      explanationBox.className = "explanation-card wrong-card";
      explanationGif.src = GIF_WRONG;
      explanationStatus.className = "explanation-status wrong";
      explanationStatus.innerText = `CHƯA CHÍNH XÁC! (Đáp án đúng: ${record.correct_answer})`;
    }
    explanationText.innerText =
      record.explanation || "Không có giải thích bổ sung.";
    explanationNote.innerText = `Chủ đề: ${record.category || "Chung"} | Độ khó: Level ${record.difficulty || 1}`;
    explanationBox.style.display = "block";
  } else {
    explanationBox.style.display = "none";
  }

  // Cập nhật trạng thái nút Trước / Tiếp
  btnPrev.disabled = currentIndex === 0;
  btnNext.disabled = currentIndex === questions.length - 1;

  updateNavigatorState();
}

/**
 * Xử lý khi người dùng bấm chọn đáp án
 */
async function handleSelectOption(questionId, selectedKey, clickedElement) {
  // Nếu câu này đã có trong record -> Khóa, không cho làm lại
  if (answeredRecords[questionId]) return;

  // Khóa ngay lập tức các nút
  const allOptions = document.querySelectorAll(".option-item");
  allOptions.forEach((el) => el.classList.add("disabled"));

  try {
    const response = await fetch("/api/quiz/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: questionId,
        selected_answer: selectedKey,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const isCorrect = data.is_correct;
      const correctKey = data.correct_answer;

      // Lưu vào danh sách đã trả lời (Khóa vĩnh viễn không cho sửa)
      answeredRecords[questionId] = {
        user_answer: selectedKey,
        is_correct: isCorrect,
        correct_answer: correctKey,
        explanation: data.explanation,
        category: data.category,
        difficulty: data.difficulty,
      };

      if (isCorrect) {
        clickedElement.classList.add("correct");
        explanationBox.className = "explanation-card correct-card";
        explanationGif.src = GIF_CORRECT;
        explanationStatus.className = "explanation-status correct";
        explanationStatus.innerText = "CHÍNH XÁC!";

        correctCount++;
        streak++;
        if (streak > maxStreak) maxStreak = streak;

        const pointTable = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 75, 6: 100 };
        let pts = pointTable[data.difficulty] || 10;
        if (streak >= 3) pts += 10;
        score += pts;
      } else {
        clickedElement.classList.add("wrong");
        explanationBox.className = "explanation-card wrong-card";
        explanationGif.src = GIF_WRONG;
        explanationStatus.className = "explanation-status wrong";
        explanationStatus.innerText = `CHƯA CHÍNH XÁC! (Đáp án đúng: ${correctKey})`;

        allOptions.forEach((el) => {
          if (el.dataset.key === correctKey) {
            el.classList.add("correct");
          }
        });

        streak = 0;
      }

      scoreDisplay.innerText = score;
      streakDisplay.innerText = streak;

      explanationText.innerText =
        data.explanation || "Không có giải thích bổ sung cho câu hỏi này.";
      explanationNote.innerText = `Chủ đề: ${data.category || "Chung"} | Độ khó: Level ${data.difficulty || 1}`;
      explanationBox.style.display = "block";

      updateNavigatorState();
    } else {
      alert(data.error || "Lỗi khi kiểm tra đáp án.");
    }
  } catch (err) {
    console.error("Lỗi check answer:", err);
    alert("Lỗi kết nối máy chủ.");
  }
}

/**
 * Chuyển tới câu hỏi trước
 */
function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentQuestion();
  }
}

/**
 * Chuyển tới câu hỏi kế tiếp
 */
function nextQuestion() {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderCurrentQuestion();
  }
}

/**
 * Nhảy tới câu hỏi cụ thể theo số thứ tự
 */
function jumpToQuestion(index) {
  if (index >= 0 && index < questions.length) {
    currentIndex = index;
    renderCurrentQuestion();
  }
}

/**
 * Hoàn thành bài trắc nghiệm và hiển thị kết quả
 */
async function finishQuiz() {
  quizScreen.style.display = "none";
  loadingState.style.display = "flex";

  // Tạo object userAnswers từ answeredRecords
  const answers = {};
  Object.keys(answeredRecords).forEach((id) => {
    answers[id] = answeredRecords[id].user_answer;
  });

  try {
    const response = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      loadingState.style.display = "none";
      resultScreen.style.display = "block";

      const summary = result.summary;
      document.getElementById("result-rank").innerText = summary.rank;
      document.getElementById("result-rank-desc").innerText =
        summary.rank_message;
      document.getElementById("stat-score").innerText = summary.score;
      document.getElementById("stat-accuracy").innerText =
        `${summary.accuracy_percentage}%`;
      document.getElementById("stat-correct").innerText =
        `${summary.correct_count} / ${summary.total_questions}`;
      document.getElementById("stat-max-streak").innerText = maxStreak;

      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      throw new Error(result.error || "Có lỗi xảy ra khi tổng kết điểm.");
    }
  } catch (err) {
    loadingState.style.display = "none";
    alert(`Lỗi tổng kết: ${err.message}`);
  }
}

/**
 * Làm lại bài trắc nghiệm từ đầu (Quay về màn hình Welcome)
 */
function restartQuiz() {
  resultScreen.style.display = "none";
  welcomeScreen.style.display = "flex";
}

/**
 * Helper escape HTML
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
