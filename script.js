/* =======================================================================
 *  젠더리빌 · 오뚝이 성별 맞추기
 *  ---------------------------------------------------------------------
 *  ⭐️ 여기만 바꾸면 됩니다! ⭐️
 *  아기의 실제 성별을 'boy'(남자아이) 또는 'girl'(여자아이) 로 설정하세요.
 * ===================================================================== */
const ACTUAL_GENDER = 'boy'; // 'boy' 또는 'girl'
/* ===================================================================== */

const TOTAL_HITS = 10; // 박을 몇 번 맞춰야 터지는지

// 상태
let userGuess = null;
let hitCount = 0;
let isBursting = false;

// 요소
const screens = {
  intro: document.getElementById('screen-intro'),
  game: document.getElementById('screen-game'),
  reveal: document.getElementById('screen-reveal'),
};
const pot = document.getElementById('pot');
const gameStage = document.querySelector('.game-stage');
const gameGuessEl = document.getElementById('game-guess');
const gameHintEl = document.getElementById('game-hint');
const confettiLayer = document.getElementById('confetti-layer');

const GENDER_TEXT = {
  boy:  { label: '남자아이', emoji: '👦', color: '#2b7fd6', burst: '#2f8bff' },
  girl: { label: '여자아이', emoji: '👧', color: '#e85a97', burst: '#ff3b57' },
};

/* -------------------- 화면 전환 -------------------- */
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('is-active'));
  screens[name].classList.add('is-active');
}

/* -------------------- 화면 1: 성별 선택 -------------------- */
document.querySelectorAll('.choice').forEach((btn) => {
  btn.addEventListener('click', () => {
    userGuess = btn.dataset.guess;
    const g = GENDER_TEXT[userGuess];
    gameGuessEl.textContent = `나의 예상: ${g.emoji} ${g.label}`;
    showScreen('game');
  });
});

/* -------------------- 화면 2: 박 터뜨리기 -------------------- */
function throwBeanbag() {
  const bag = document.createElement('div');
  bag.className = 'beanbag';
  // 살짝 좌우로 흔들리게 랜덤 위치
  const offset = (Math.random() * 40 - 20).toFixed(0);
  bag.style.left = `calc(50% + ${offset}px)`;
  gameStage.appendChild(bag);
  requestAnimationFrame(() => bag.classList.add('is-thrown'));
  setTimeout(() => bag.remove(), 450);
}

pot.addEventListener('click', () => {
  if (isBursting || hitCount >= TOTAL_HITS) return;

  throwBeanbag();

  // 오자미가 날아가 맞는 순간에 카운트
  setTimeout(() => {
    hitCount += 1;

    pot.classList.remove('is-hit');
    void pot.offsetWidth; // 애니메이션 리셋
    pot.classList.add('is-hit');

    if (hitCount === TOTAL_HITS - 3) {
      gameHintEl.textContent = '조금만 더! 💪';
    } else if (hitCount >= TOTAL_HITS) {
      burstPot();
    }
  }, 330);
});

function burstPot() {
  isBursting = true;
  gameHintEl.textContent = '펑! 🎊';
  pot.classList.remove('is-hit');
  pot.classList.add('is-burst');

  // 박 안에서 성별 색이 터져 나오는 효과
  burstFromPot(GENDER_TEXT[ACTUAL_GENDER].burst);
  launchConfetti(GENDER_TEXT[ACTUAL_GENDER].color, 90);

  setTimeout(() => {
    revealResult();
  }, 1100);
}

/* -------------------- 박에서 색이 터져 나오는 효과 -------------------- */
function burstFromPot(color) {
  const rect = pot.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  // 중앙 섬광
  const flash = document.createElement('div');
  flash.className = 'pot-flash';
  flash.style.left = `${originX}px`;
  flash.style.top = `${originY}px`;
  flash.style.background = `radial-gradient(circle, #fff, ${color} 60%, transparent 72%)`;
  confettiLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 700);

  // 사방으로 퍼지는 색 조각들
  const pieces = 60;
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('div');
    p.className = 'burst-piece';

    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 190;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 60; // 위로 살짝 더 튀게

    p.style.left = `${originX}px`;
    p.style.top = `${originY}px`;
    p.style.setProperty('--dx', `${dx}px`);
    p.style.setProperty('--dy', `${dy}px`);
    p.style.background = Math.random() > 0.35 ? color : '#ffffff';
    p.style.animationDelay = `${Math.random() * 0.08}s`;
    if (Math.random() > 0.5) p.style.borderRadius = '50%';
    confettiLayer.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

/* -------------------- 화면 3: 결과 공개 -------------------- */
function revealResult() {
  const actual = GENDER_TEXT[ACTUAL_GENDER];
  const isCorrect = userGuess === ACTUAL_GENDER;

  const doll = document.getElementById('reveal-doll');
  doll.classList.remove('doll--boy', 'doll--girl');
  doll.classList.add(ACTUAL_GENDER === 'boy' ? 'doll--boy' : 'doll--girl');

  const titleEl = document.getElementById('reveal-title');
  titleEl.textContent = `${actual.emoji} 우리 아기는 ${actual.label}!`;
  titleEl.classList.remove('is-boy', 'is-girl');
  titleEl.classList.add(ACTUAL_GENDER === 'boy' ? 'is-boy' : 'is-girl');

  const messageEl = document.getElementById('reveal-message');
  messageEl.innerHTML = isCorrect
    ? '🎯 예상 정답! 축하해요!<br />함께 기뻐해 주셔서 감사합니다 💕'
    : `아쉽게도 예상은 빗나갔어요! 😆<br />그래도 함께해 주셔서 감사합니다 💕`;

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
  hitCount = 0;
  isBursting = false;
  gameHintEl.textContent = '👆 박을 클릭하세요!';
  pot.classList.remove('is-burst', 'is-hit');
  confettiLayer.innerHTML = '';
  showScreen('intro');
});
