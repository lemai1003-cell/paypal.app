import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, get, remove }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ===== FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyBZsWW8sKosivJD8jGIE19cq6NL-zbIa6U",
  authDomain: "app-eta-6320b.firebaseapp.com",
  databaseURL: "https://app-eta-6320b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "app-eta-6320b",
  storageBucket: "app-eta-6320b.firebasestorage.app",
  messagingSenderId: "24326511208",
  appId: "1:24326511208:web:6980d4e17959b08e02f9dd"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

function getDeviceId() {
  let id = localStorage.getItem('paypal_device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substr(2, 12) + Date.now();
    localStorage.setItem('paypal_device_id', id);
  }
  return id;
}

async function fbSave(result) {
  try {
    await push(ref(db, `history/${getDeviceId()}`), {
      dateDisplay: new Date().toLocaleString('vi-VN'),
      correct: result.correct,
      total: result.total,
      pct: result.pct,
      time: result.timeStr,
      createdAt: Date.now()
    });
  } catch (e) { console.warn('Firebase save error:', e); }
}

async function fbGet() {
  try {
    const snap = await get(ref(db, `history/${getDeviceId()}`));
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  } catch (e) { console.warn('Firebase get error:', e); return null; }
}

async function fbClear() {
  try { await remove(ref(db, `history/${getDeviceId()}`)); } catch (e) { console.warn(e); }
}

// ===== STATE =====
let currentQuestions = [];
let userAnswers = [];
let currentIndex = 0;
let timerInterval = null;
let elapsedSeconds = 0;
let lastResult = null;

// ===== NAVIGATION =====
window.showPage = function(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'page-history') renderHistory();
};

// ===== QUIZ START =====
window.startPractice = function(count) {
  currentQuestions = getRandomQuestions(count);
  userAnswers = new Array(count).fill(null);
  currentIndex = 0;
  elapsedSeconds = 0;
  showPage('page-quiz');
  renderQuestion();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    document.getElementById('quiz-timer').textContent = '⏱ ' + formatTime(elapsedSeconds);
  }, 1000);
};

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  document.getElementById('q-current').textContent = currentIndex + 1;
  document.getElementById('q-total').textContent = total;
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('progress-fill').style.width = ((currentIndex + 1) / total * 100) + '%';

  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-item';
    btn.textContent = choice;
    if (userAnswers[currentIndex] !== null) {
      btn.classList.add('disabled');
      if (choice === q.answer) btn.classList.add('correct');
      else if (choice === userAnswers[currentIndex]) btn.classList.add('wrong');
    }
    btn.onclick = () => selectAnswer(choice);
    grid.appendChild(btn);
  });

  document.getElementById('btn-prev').classList.toggle('hidden', currentIndex === 0);
  const isLast = currentIndex === total - 1;
  document.getElementById('btn-next').classList.toggle('hidden', isLast);
  document.getElementById('btn-submit').classList.toggle('hidden', !isLast);
}

function selectAnswer(choice) {
  if (userAnswers[currentIndex] !== null) return;
  userAnswers[currentIndex] = choice;
  renderQuestion();
  setTimeout(() => {
    if (currentIndex < currentQuestions.length - 1) { currentIndex++; renderQuestion(); }
  }, 600);
}

window.nextQuestion = function() { if (currentIndex < currentQuestions.length - 1) { currentIndex++; renderQuestion(); } };
window.prevQuestion = function() { if (currentIndex > 0) { currentIndex--; renderQuestion(); } };

// ===== SUBMIT =====
window.submitQuiz = function() {
  clearInterval(timerInterval);
  const total = currentQuestions.length;
  let correct = 0;
  currentQuestions.forEach((q, i) => { if (userAnswers[i] === q.answer) correct++; });
  const pct = Math.round((correct / total) * 100);
  const timeStr = formatTime(elapsedSeconds);
  lastResult = { questions: currentQuestions, answers: userAnswers, correct, total, pct, timeStr };

  // Lưu cả local và Firebase
  saveHistoryLocal(lastResult);
  fbSave(lastResult);

  const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '👍' : pct >= 50 ? '😊' : '💪';
  const title = pct >= 90 ? 'Xuất sắc!' : pct >= 70 ? 'Tốt lắm!' : pct >= 50 ? 'Cố lên nhé!' : 'Hãy luyện thêm!';
  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('score-main').textContent = `${correct}/${total}`;
  document.getElementById('score-percent').textContent = `${pct}%`;
  document.getElementById('stat-correct').textContent = correct;
  document.getElementById('stat-wrong').textContent = total - correct;
  document.getElementById('stat-time').textContent = timeStr;
  showPage('page-result');
};

// ===== REVIEW =====
window.reviewAnswers = function() {
  const list = document.getElementById('review-list');
  list.innerHTML = '';
  lastResult.questions.forEach((q, i) => {
    const userAns = lastResult.answers[i];
    const isCorrect = userAns === q.answer;
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <span class="review-num">${i + 1}.</span>
      <span class="review-q">${q.question}</span>
      <div>
        <span class="review-badge ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '✅ Đúng' : '❌ Sai'}</span>
        ${!isCorrect ? `<div class="review-answer">Đáp án: <b>${q.answer}</b>${userAns !== null ? ` | Bạn chọn: <b>${userAns}</b>` : ' | Chưa chọn'}</div>` : ''}
      </div>`;
    list.appendChild(item);
  });
  showPage('page-review');
};

// ===== HISTORY =====
function saveHistoryLocal(result) {
  const h = getHistoryLocal();
  h.unshift({ date: new Date().toLocaleString('vi-VN'), correct: result.correct, total: result.total, pct: result.pct, time: result.timeStr });
  localStorage.setItem('paypal_math_history', JSON.stringify(h.slice(0, 50)));
}
function getHistoryLocal() {
  try { return JSON.parse(localStorage.getItem('paypal_math_history') || '[]'); } catch { return []; }
}

async function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '<div class="history-empty">⏳ Đang tải...</div>';
  let history = await fbGet();
  if (!history) history = getHistoryLocal();
  list.innerHTML = '';
  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">📭 Chưa có lịch sử làm bài</div>';
    return;
  }
  history.forEach(h => {
    const pctClass = h.pct >= 80 ? 'good' : h.pct >= 50 ? 'ok' : 'bad';
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-info">
        <div class="history-date">${h.dateDisplay || h.date}</div>
        <div class="history-score">${h.correct}/${h.total} câu đúng</div>
        <div class="history-meta">⏱ ${h.time}</div>
      </div>
      <div class="history-pct ${pctClass}">${h.pct}%</div>`;
    list.appendChild(item);
  });
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn-clear-history';
  clearBtn.textContent = '🗑 Xóa lịch sử';
  clearBtn.onclick = async () => {
    if (confirm('Xóa toàn bộ lịch sử?')) {
      localStorage.removeItem('paypal_math_history');
      await fbClear();
      renderHistory();
    }
  };
  list.appendChild(clearBtn);
}

// ===== EXIT MODAL =====
window.confirmExit = function() { document.getElementById('modal-exit').classList.remove('hidden'); };
window.closeModal = function() { document.getElementById('modal-exit').classList.add('hidden'); };
window.exitQuiz = function() { clearInterval(timerInterval); closeModal(); showPage('page-home'); };
