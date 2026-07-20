// Ngân hàng câu hỏi toán lớp 1
const questionBank = [];

// Sinh câu hỏi cộng trừ trong phạm vi 1-20
function generateQuestions() {
  const questions = [];

  // Phép cộng (1-20)
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      const answer = a + b;
      if (answer <= 20) {
        questions.push({
          id: `add_${a}_${b}`,
          question: `${a} + ${b} = ?`,
          answer: answer,
          type: 'addition',
          choices: generateChoices(answer, 1, 20)
        });
      }
    }
  }

  // Phép trừ (kết quả >= 0)
  for (let a = 2; a <= 20; a++) {
    for (let b = 1; b < a; b++) {
      const answer = a - b;
      questions.push({
        id: `sub_${a}_${b}`,
        question: `${a} - ${b} = ?`,
        answer: answer,
        type: 'subtraction',
        choices: generateChoices(answer, 0, 19)
      });
    }
  }

  return questions;
}

function generateChoices(correct, min, max) {
  const choices = new Set([correct]);
  const offsets = [-3, -2, -1, 1, 2, 3].sort(() => Math.random() - 0.5);
  for (const offset of offsets) {
    const val = correct + offset;
    if (val >= min && val <= max) choices.add(val);
    if (choices.size === 4) break;
  }
  // Nếu chưa đủ 4, thêm ngẫu nhiên
  while (choices.size < 4) {
    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
    choices.add(rand);
  }
  return Array.from(choices).sort(() => Math.random() - 0.5);
}

function getRandomQuestions(count) {
  const all = generateQuestions();
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
