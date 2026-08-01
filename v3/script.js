/* =======================================================================
 *  카드 빙고 젠더리빌 · 초음파 성별 맞추기 (v3)
 *  ---------------------------------------------------------------------
 *  ⭐️ 여기만 바꾸면 됩니다! ⭐️
 *  아기의 실제 성별을 'boy'(아들) 또는 'girl'(딸) 로 설정하세요.
 * ===================================================================== */
const ACTUAL_GENDER = 'girl'; // 'boy' 또는 'girl'
/* ===================================================================== */

// 3x3 빙고 라인 (가로 3 + 세로 3 + 대각선 2 = 8개)
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // 가로
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // 세로
  [0, 4, 8], [2, 4, 6],            // 대각선
];

// 상태
let userGuess = null;
let board = [];        // 9칸의 성별 배열 ('boy' | 'girl')
let flipped = [];      // 9칸의 뒤집힘 여부
let gameOver = false;

// 요소
const screens = {
  start: document.getElementById('screen-start'),
  guess: document.getElementById('screen-guess'),
  game: document.getElementById('screen-game'),
  reveal: document.getElementById('screen-reveal'),
};
const cardGrid = document.getElementById('card-grid');
const gameGuessEl = document.getElementById('game-guess');
const gameHintEl = document.getElementById('game-hint');
const confettiLayer = document.getElementById('confetti-layer');

const GENDER_TEXT = {
  boy:  { label: '아들', emoji: '👦', color: '#2b7fd6', burst: '#2f8bff' },
  girl: { label: '딸', emoji: '👧', color: '#e85a97', burst: '#ff3b57' },
};

/* -------------------- 화면 전환 -------------------- */
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('is-active'));
  screens[name].classList.add('is-active');
}

/* -------------------- 화면 0: 시작 -------------------- */
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('guess');
});

/* -------------------- 화면 1: 성별 선택 -------------------- */
document.querySelectorAll('.choice').forEach((btn) => {
  btn.addEventListener('click', () => {
    userGuess = btn.dataset.guess;
    const g = GENDER_TEXT[userGuess];
    gameGuessEl.textContent = `나의 예상: ${g.emoji} ${g.label}`;
    logGuess(userGuess);
    showScreen('game');
    setupBoard();
  });
});

// 예측 버튼 클릭을 서버 로그에만 남긴다 (화면에는 노출되지 않음)
function logGuess(choice) {
  const url = `/log.gif?choice=${choice}`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    new Image().src = url;
  }
}

/* -------------------- 화면 2: 카드 빙고 세팅 -------------------- */
// 보드 전체에서 단색으로 완성된 빙고 라인의 개수와 성별을 센다.
function countBingoLines(cells) {
  let count = 0;
  let gender = null;
  for (const line of LINES) {
    const g = cells[line[0]];
    if (g && line.every((i) => cells[i] === g)) {
      count++;
      gender = g;
    }
  }
  return { count, gender };
}

// 빙고 라인이 "정확히 1개"이고 그게 정답 성별이며,
// 정답 성별 5칸 / 반대 성별 4칸이 되도록 보드를 생성한다.
function generateBoard(answer) {
  const other = answer === 'boy' ? 'girl' : 'boy';
  let cells;
  let guard = 0;

  do {
    // 8개 라인(가로/세로/대각선) 중 하나를 정답 라인으로 무작위 선택
    const winLine = LINES[Math.floor(Math.random() * LINES.length)];
    cells = new Array(9).fill(null);
    winLine.forEach((i) => { cells[i] = answer; });

    // 남은 6칸 중 무작위 2칸을 추가 정답(총 5칸), 나머지 4칸은 반대 성별
    const rest = [];
    for (let i = 0; i < 9; i++) if (cells[i] === null) rest.push(i);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    rest.forEach((idx, k) => { cells[idx] = k < 2 ? answer : other; });
    guard++;

    // 완성된 빙고 라인이 정확히 1개이고, 그 성별이 정답일 때만 채택
    const { count, gender } = countBingoLines(cells);
    if (count === 1 && gender === answer) break;
  } while (guard < 500);

  return cells;
}

function setupBoard() {
  board = generateBoard(ACTUAL_GENDER);
  flipped = new Array(9).fill(false);
  gameOver = false;
  gameHintEl.textContent = '👆 카드를 하나씩 뒤집어 보세요!';

  cardGrid.innerHTML = '';
  board.forEach((gender, index) => {
    const g = GENDER_TEXT[gender];
    const card = document.createElement('button');
    card.className = 'card';
    card.dataset.index = String(index);
    card.setAttribute('aria-label', '카드 뒤집기');
    card.innerHTML =
      '<span class="card__inner">' +
        '<span class="card__face card__back"></span>' +
        `<span class="card__face card__front card__front--${gender}">${g.emoji}</span>` +
      '</span>';
    card.addEventListener('click', () => flipCard(index, card));
    cardGrid.appendChild(card);
  });
}

function flipCard(index, card) {
  if (gameOver || flipped[index]) return;
  flipped[index] = true;
  card.classList.add('is-flipped');
  card.disabled = true;

  // 뒤집기 애니메이션 후 빙고 확인
  setTimeout(checkForBingo, 260);
}

// 뒤집힌 카드들 중 같은 성별 3연속(빙고)이 완성됐는지 확인
function checkForBingo() {
  if (gameOver) return;

  const winLine = LINES.find((line) =>
    line.every((i) => flipped[i]) &&
    line.every((i) => board[i] === board[line[0]])
  );

  if (winLine) {
    endGame(winLine);
  } else if (flipped.every(Boolean)) {
    // 이론상 정답 라인이 항상 존재하므로 도달하지 않지만 안전장치
    endGame(LINES.find((line) => line.every((i) => board[i] === ACTUAL_GENDER)));
  }
}

function endGame(winLine) {
  gameOver = true;
  gameHintEl.textContent = '빙고! 🎉';

  // 정답 라인 카드 강조 + 아직 안 뒤집힌 카드도 모두 공개
  const cards = cardGrid.querySelectorAll('.card');
  winLine.forEach((i) => cards[i].classList.add('is-win'));
  cards.forEach((c, i) => {
    if (!flipped[i]) {
      c.classList.add('is-flipped');
      flipped[i] = true;
    }
  });

  launchConfetti(GENDER_TEXT[ACTUAL_GENDER].color, 90);
  setTimeout(revealResult, 5000);
}

/* -------------------- 화면 3: 결과 공개 -------------------- */
function revealResult() {
  const actual = GENDER_TEXT[ACTUAL_GENDER];
  const isCorrect = userGuess === ACTUAL_GENDER;

  const doll = document.getElementById('reveal-doll');
  doll.classList.remove('doll--boy', 'doll--girl');
  doll.classList.add(ACTUAL_GENDER === 'boy' ? 'doll--boy' : 'doll--girl');

  const titleEl = document.getElementById('reveal-title');
  titleEl.textContent = `${actual.emoji}우리 오뚝이는 ${actual.label}!`;
  titleEl.classList.remove('is-boy', 'is-girl');
  titleEl.classList.add(ACTUAL_GENDER === 'boy' ? 'is-boy' : 'is-girl');

  const messageEl = document.getElementById('reveal-message');
  messageEl.innerHTML = isCorrect
    ? '😆 예상 정답! 축하해요!<br />함께 기뻐해 주셔서 감사합니다 💕'
    : '아쉽게도 예상은 빗나갔어요! 😆<br />그래도 함께해 주셔서 감사합니다 💕';

  showScreen('reveal');
  launchConfetti(actual.color, 120);
}

/* -------------------- 색종이 효과 -------------------- */
function launchConfetti(mainColor, amount) {
  const palette = [mainColor, '#ffd36e', '#ffffff', '#a0e7b0', mainColor];
  for (let i = 0; i < amount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = palette[Math.floor(Math.random() * palette.length)];
    piece.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (Math.random() > 0.5) piece.style.borderRadius = '50%';
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

/* -------------------- 다시 하기 -------------------- */
document.getElementById('reveal-again').addEventListener('click', () => {
  userGuess = null;
  gameOver = false;
  cardGrid.innerHTML = '';
  confettiLayer.innerHTML = '';
  showScreen('start');
});
