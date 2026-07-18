/* =======================================================================
 *  다트 젠더리빌 · 초음파 성별 맞추기 (v2)
 *  ---------------------------------------------------------------------
 *  ⭐️ 여기만 바꾸면 됩니다! ⭐️
 *  아기의 실제 성별을 'boy'(남자아이) 또는 'girl'(여자아이) 로 설정하세요.
 * ===================================================================== */
const ACTUAL_GENDER = 'girl'; // 'boy' 또는 'girl'
/* ===================================================================== */

const DARTS_TO_POP = 1; // 풍선을 터뜨리는 데 필요한 명중 횟수
const MAX_AIM_ANGLE = 58; // 조준선이 좌우로 흔들리는 최대 각도(도)
const AIM_SPEED = 90; // 초당 회전 각도(도) — 클수록 빨라짐(어려움)
const BALLOON_SPEED = 520; // 풍선이 떠다니는 속도(px/초) — 클수록 어려움

// 상태
let userGuess = null;
let dartHits = 0;
let isPopping = false;
let isThrowing = false;
let aimAngle = 0;
let aimDir = 1;
let aimRAF = null;
let lastTime = 0;

// 풍선 위치/이동 상태
let balloonX = 0; // 스테이지 기준 중심 X(px)
let balloonY = 70; // 스테이지 기준 중심 Y(px)
let balloonVX = 1; // 수평 방향(-1 또는 1)
let balloonReady = false; // 위치 초기화 여부

// 요소
const screens = {
  start: document.getElementById('screen-start'),
  guess: document.getElementById('screen-guess'),
  game: document.getElementById('screen-game'),
  reveal: document.getElementById('screen-reveal'),
};
const balloon = document.getElementById('balloon');
const gameStage = document.getElementById('game-stage');
const aim = document.getElementById('aim');
const dart = document.getElementById('dart');
const btnThrow = document.getElementById('btn-throw');
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
    showScreen('game');
    startAim();
  });
});

/* -------------------- 화면 2: 조준 & 다트 던지기 -------------------- */
// 조준선이 좌우로 흔들리고, 풍선은 계속 떠다닌다.
function aimLoop(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!isThrowing && !isPopping) {
    // 조준선 흔들기
    aimAngle += aimDir * AIM_SPEED * dt;
    if (aimAngle >= MAX_AIM_ANGLE) { aimAngle = MAX_AIM_ANGLE; aimDir = -1; }
    if (aimAngle <= -MAX_AIM_ANGLE) { aimAngle = -MAX_AIM_ANGLE; aimDir = 1; }
    aim.style.transform = `rotate(${aimAngle}deg)`;
  }

  if (!isPopping) {
    driftBalloon(dt);
  }

  aimRAF = requestAnimationFrame(aimLoop);
}

// 풍선을 매 프레임 조금씩 이동시킨다.
function driftBalloon(dt) {
  const stageRect = gameStage.getBoundingClientRect();
  const halfW = balloon.offsetWidth / 2;
  const minX = halfW + 6;
  const maxX = stageRect.width - halfW - 6;

  balloonX += balloonVX * BALLOON_SPEED * dt;
  if (balloonX <= minX) { balloonX = minX; balloonVX = 1; }
  if (balloonX >= maxX) { balloonX = maxX; balloonVX = -1; }

  // 위아래로 살짝 물결치듯
  balloonY = 70 + Math.sin(performance.now() / 600) * 22;

  balloon.style.left = `${balloonX}px`;
  balloon.style.top = `${balloonY - balloon.offsetHeight / 2}px`;
}

function startAim() {
  aimAngle = 0;
  aimDir = 1;
  lastTime = 0;
  // 풍선 초기 위치(스테이지 중앙 근처)
  const stageRect = gameStage.getBoundingClientRect();
  balloonX = stageRect.width / 2;
  balloonY = 70;
  balloonVX = Math.random() > 0.5 ? 1 : -1;
  balloon.style.transition = 'none'; // 부드러운 실시간 이동을 위해 전환 해제
  balloonReady = true;
  if (!aimRAF) aimRAF = requestAnimationFrame(aimLoop);
}

// (풍선이 스스로 돌아다니므로 별도 순간이동은 사용하지 않음)

// 던지기: 현재 각도를 멈추고 다트를 발사
btnThrow.addEventListener('click', () => {
  if (isThrowing || isPopping) return;
  isThrowing = true;

  const launchAngle = aimAngle; // 발사 순간의 각도 고정
  aim.classList.add('is-hidden-line');
  dart.classList.add('is-hidden');

  // 명중 판정: 하단 회전축에서 풍선 중심을 향하는 각도와 비교
  const stageRect = gameStage.getBoundingClientRect();
  const balloonRect = balloon.getBoundingClientRect();
  const pivotX = stageRect.left + stageRect.width / 2;
  const pivotY = stageRect.top + stageRect.height - 6;
  const bx = balloonRect.left + balloonRect.width / 2;
  const by = balloonRect.top + balloonRect.height / 2;

  const angleToBalloon = Math.atan2(bx - pivotX, pivotY - by) * (180 / Math.PI);
  const distance = Math.hypot(bx - pivotX, pivotY - by);
  const balloonRadius = balloonRect.width / 2;
  // 풍선 크기와 거리로 허용 오차를 계산(가까울수록 관대)
  const tolerance = Math.atan2(balloonRadius, distance) * (180 / Math.PI) + 4;
  const isHit = Math.abs(launchAngle - angleToBalloon) <= tolerance;

  flyDart(launchAngle, pivotX, pivotY, isHit, angleToBalloon, distance);
});

// 다트 발사체 애니메이션
function flyDart(angle, pivotX, pivotY, isHit, angleToBalloon, distance) {
  const stageRect = gameStage.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'dart dart-fly';
  fly.innerHTML =
    '<span class="dart__tip"></span>' +
    '<span class="dart__shaft"></span>' +
    '<span class="dart__fin"></span>';

  // 스테이지 기준 시작 좌표(회전축 = 다트 꼬리)
  const startLeft = stageRect.width / 2 - 8;
  const startTop = stageRect.height - 6 - 84;
  fly.style.left = `${startLeft}px`;
  fly.style.top = `${startTop}px`;
  fly.style.transform = `rotate(${angle}deg)`;
  gameStage.appendChild(fly);

  // 명중이면 풍선까지, 빗나가면 화면 밖까지 날아감
  const travel = isHit ? distance - 40 : stageRect.height + 120;
  const rad = angle * (Math.PI / 180);
  const dx = Math.sin(rad) * travel;
  const dy = -Math.cos(rad) * travel;

  const duration = isHit ? 0.26 : 0.42;
  fly.style.transition = `transform ${duration}s cubic-bezier(0.35,0,0.9,0.6)`;
  requestAnimationFrame(() => {
    fly.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle}deg)`;
  });

  setTimeout(() => {
    fly.remove();
    resolveThrow(isHit);
  }, duration * 1000 + 20);
}

function resolveThrow(isHit) {
  // 조준용 다트/조준선 복구 (각도·방향은 던지기 직전 상태에서 이어감)
  dart.classList.remove('is-hidden');
  aim.classList.remove('is-hidden-line');
  aim.style.transform = `rotate(${aimAngle}deg)`;

  if (isHit) {
    dartHits += 1;
    balloon.classList.remove('is-hit');
    void balloon.offsetWidth;
    balloon.classList.add('is-hit');

    if (dartHits >= DARTS_TO_POP) {
      popBalloon();
      return;
    }
    const left = DARTS_TO_POP - dartHits;
    gameHintEl.textContent = `명중! 🎯 ${left}번만 더!`;
  } else {
    gameHintEl.textContent = '앗, 빗나갔어요! 다시 조준! 😖';
  }
  isThrowing = false;
}

function popBalloon() {
  isPopping = true;
  isThrowing = false;
  gameHintEl.textContent = '펑! 🎊';
  btnThrow.disabled = true;

  const color = GENDER_TEXT[ACTUAL_GENDER].burst;
  burstFromBalloon(color);
  balloon.classList.remove('is-hit');
  balloon.classList.add('is-pop');
  launchConfetti(GENDER_TEXT[ACTUAL_GENDER].color, 90);

  setTimeout(() => {
    revealResult();
  }, 1100);
}

/* -------------------- 풍선에서 성별 색이 터져 나오는 효과 -------------------- */
function burstFromBalloon(color) {
  const rect = balloon.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  // 중앙 섬광
  const flash = document.createElement('div');
  flash.className = 'pop-flash';
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
    const dy = Math.sin(angle) * distance - 60;

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
  dartHits = 0;
  isPopping = false;
  isThrowing = false;
  aimAngle = 0;
  aimDir = 1;
  btnThrow.disabled = false;
  gameHintEl.textContent = '조준선이 풍선을 향할 때 버튼을 누르세요!';
  balloon.classList.remove('is-pop', 'is-hit');
  balloon.style.transition = 'none';
  balloon.style.left = '50%';
  balloon.style.top = '24px';
  aim.classList.remove('is-hidden-line');
  aim.style.transform = 'rotate(0deg)';
  dart.classList.remove('is-hidden');
  confettiLayer.innerHTML = '';
  showScreen('start');
});
