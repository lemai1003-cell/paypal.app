// ===== STATE =====
let currentQuestions = [];
let userAnswers = [];
let currentIndex = 0;
let timerInterval = null;
let elapsedSeconds = 0;
let lastResult = null;

// ===== NAVIGATION =====
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  page.classList.add('active');

  if (id === 'page-history') renderHistory();
}

// ===== QUIZ START =====
function startPractice(count) {
  currentQuestions = getRandomQuestions(count);
  userAnswers = new Array(count).fill(null);
  currentIndex = 0;
  elapsedSeconds = 0;

  showPage('page-quiz');
  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    document.getElementById('quiz-timer').textContent = '⏱ ' + formatTime(elapsedSeconds);
  }, 1000);
}

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

  const fill = ((currentIndex + 1) / total) * 100;
  document.getElementById('progress-fill').style.width = fill + '%';

  // Choices
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
    } else if (userAnswers[currentIndex] === choice) {
      btn.classList.add('selected');
    }

    btn.onclick = () => selectAnswer(choice);
    grid.appendChild(btn);
  });

  // Highlight selected if already answered
  if (userAnswers[currentIndex] !== null) {
    grid.querySelectorAll('.choice-item').forEach(btn => btn.classList.add('disabled'));
  }

  // Nav buttons
  document.getElementById('btn-prev').classList.toggle('hidden', currentIndex === 0);
  const isLast = currentIndex === total - 1;
  document.getElementById('btn-next').classList.toggle('hidden', isLast);
  document.getElementById('btn-submit').classList.toggle('hidden', !isLast);
}

function selectAnswer(choice) {
  if (userAnswers[currentIndex] !== null) return;
  userAnswers[currentIndex] = choice;
  renderQuestion();

  // Auto advance after short delay
  setTimeout(() => {
    if (currentIndex < currentQuestions.length - 1) {
      currentIndex++;
      renderQuestion();
    }
  }, 600);
}

function nextQuestion() {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

// ===== SUBMIT =====
function submitQuiz() {
  clearInterval(timerInterval);

  const total = currentQuestions.length;
  let correct = 0;
  currentQuestions.forEach((q, i) => {
    if (userAnswers[i] === q.answer) correct++;
  });

  const pct = Math.round((correct / total) * 100);
  const timeStr = formatTime(elapsedSeconds);

  lastResult = { questions: currentQuestions, answers: userAnswers, correct, total, pct, timeStr };

  // Save to history
  saveHistory(lastResult);

  // Render result
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
}

// ===== REVIEW =====
function reviewAnswers() {
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
      </div>
    `;
    list.appendChild(item);
  });

  showPage('page-review');
}

// ===== HISTORY (Firestore) =====
async function saveHistory(result) {
  try {
    const { db, addDoc, collection } = window._fb;
    const uid = window._fbUserId;
    await addDoc(collection(db, 'users', uid, 'history'), {
      date: new Date().toISOString(),
      dateDisplay: new Date().toLocaleString('vi-VN'),
      correct: result.correct,
      total: result.total,
      pct: result.pct,
      time: result.timeStr
    });
  } catch (e) {
    // Fallback localStorage nếu lỗi
    const history = getLocalHistory();
    history.unshift({ date: new Date().toLocaleString('vi-VN'), correct: result.correct, total: result.total, pct: result.pct, time: result.timeStr });
    localStorage.setItem('paypal_math_history', JSON.stringify(history.slice(0, 50)));
  }
}

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem('paypal_math_history') || '[]'); } catch { return []; }
}

async function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '<div class="history-empty">⏳ Đang tải...</div>';

  try {
    const { db, collection, query, orderBy, limit, getDocs, deleteDoc } = window._fb;
    const uid = window._fbUserId;
    const q = query(collection(db, 'users', uid, 'history'), orderBy('date', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    list.innerHTML = '';
    if (snapshot.empty) {
      list.innerHTML = '<div class="history-empty">📭 Chưa có lịch sử làm bài</div>';
      return;
    }

    const docs = [];
    snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

    docs.forEach(h => {
      const pctClass = h.pct >= 80 ? 'good' : h.pct >= 50 ? 'ok' : 'bad';
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-info">
          <div class="history-date">${h.dateDisplay || h.date}</div>
          <div class="history-score">${h.correct}/${h.total} câu đúng</div>
          <div class="history-meta">⏱ ${h.time}</div>
        </div>
        <div class="history-pct ${pctClass}">${h.pct}%</div>
      `;
      list.appendChild(item);
    });

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-clear-history';
    clearBtn.textContent = '🗑 Xóa lịch sử';
    clearBtn.onclick = async () => {
      if (!confirm('Xóa toàn bộ lịch sử?')) return;
      const { db, deleteDoc, doc } = window._fb;
      const uid = window._fbUserId;
      for (const h of docs) {
        await deleteDoc(doc(db, 'users', uid, 'history', h.id));
      }
      renderHistory();
    };
    list.appendChild(clearBtn);

  } catch (e) {
    console.error(e);
    list.innerHTML = '<div class="history-empty">❌ Không thể tải lịch sử</div>';
  }
}

// ===== EXIT MODAL =====
function confirmExit() {
  document.getElementById('modal-exit').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-exit').classList.add('hidden');
}
function exitQuiz() {
  clearInterval(timerInterval);
  closeModal();
  showPage('page-home');
}
