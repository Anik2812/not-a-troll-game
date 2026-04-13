/* ============================================
   DEFINITELY NOT A TROLL GAME™ — Game Engine
   ============================================ */

const TILE = 40;
const GRAVITY = 0.5;
const JUMP_FORCE = -13;
const MOVE_SPEED = 5;
const FRICTION = 0.8;
const MAX_FALL = 14;
const COYOTE_TIME = 8;

/* ---------- LEVELS loaded from levels.js ---------- */

/* ---------- DEATH MESSAGES (Non-repeating shuffle) ---------- */
const DEATH_MESSAGES = [
  "SKILL ISSUE", "THAT WAS ON PURPOSE, RIGHT?", "GRAVITY WINS AGAIN",
  "YOU DIED. SHOCKING.", "SMOOTH MOVE", "404: SKILL NOT FOUND",
  "THE FLOOR SENDS ITS REGARDS", "HAVE YOU TRIED NOT DYING?",
  "YOUR KEYBOARD IS FILING FOR DIVORCE", "SPECTACULAR. IN THE WORST WAY.",
  "THE SPIKES SAY HI", "EVEN THE PIXELS CRINGED",
  "YOU WALKED INTO THAT. LITERALLY.", "FUN FACT: CLOSING THE TAB IS FREE",
  "THE GAME ISN'T EVEN TRYING AND NEITHER ARE YOU",
  "TASK FAILED SUCCESSFULLY", "PRESS F TO PAY RESPECTS",
  "YOUR ANCESTORS ARE DISAPPOINTED", "THE VOID CALLED. IT WANTS YOU BACK.",
  "RESPAWN SPONSORED BY YOUR BAD DECISIONS", "DEATH #∞: ETERNAL RETURN",
  "THE AI CHATBOT IS LAUGHING RIGHT NOW", "CERTIFIED GAMER MOMENT™",
  "INSERT COIN TO CONTINUE (COIN WILL STEAL YOUR POINTS)",
  "ACHIEVEMENT UNLOCKED: DYING AGAIN", "THE DEVS DIDN'T PLAYTEST THIS. OR DID THEY?",
];
let _deathMsgBag = [];
function getNextDeathMessage() {
  if (_deathMsgBag.length === 0) {
    _deathMsgBag = [...DEATH_MESSAGES];
    for (let i = _deathMsgBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_deathMsgBag[i], _deathMsgBag[j]] = [_deathMsgBag[j], _deathMsgBag[i]];
    }
  }
  return _deathMsgBag.pop();
}

const DEATH_SUBS = [
  "Press SPACE to make the same mistake",
  "Press SPACE to disappoint yourself again",
  "Press SPACE. The spikes are waiting.",
  "Press SPACE (the definition of insanity)",
  "SPACE to respawn. Or just sit there. Same outcome.",
  "Press SPACE. The game dares you.",
  "SPACE = suffering. You know this.",
  "Press SPACE and pretend you have a plan.",
];
let _deathSubBag = [];
function getNextDeathSub() {
  if (_deathSubBag.length === 0) {
    _deathSubBag = [...DEATH_SUBS];
    for (let i = _deathSubBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_deathSubBag[i], _deathSubBag[j]] = [_deathSubBag[j], _deathSubBag[i]];
    }
  }
  return _deathSubBag.pop();
}

/* ---------- PARTICLE ---------- */
class Particle {
  constructor(x, y, color, type) {
    this.x = x; this.y = y;
    this.color = color;
    this.life = 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = type === 'death' ? 2 + Math.random() * 4 : 1 + Math.random() * 2.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (type === 'jump' ? 2 : 0);
    this.size = type === 'death' ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
    this.decay = type === 'death' ? 0.015 : 0.025;
    this.gravity = type === 'coin' ? 0 : 0.08;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= this.decay * dt;
    this.size *= 0.995;
  }
  draw(ctx, cam) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - cam.x - this.size/2, this.y - cam.y - this.size/2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

/* ---------- PLAYER ---------- */
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 26; this.h = 30;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.coyote = 0;
    this.health = 3;
    this.maxHealth = 3;
    this.alive = true;
    this.facing = 1;
    this.scaleX = 1; this.scaleY = 1;
    this.blinkTimer = 100 + Math.random() * 200;
    this.blinking = false;
    this.trail = [];
    this.invincible = 0;
    this.damageFlash = 0;
  }
  draw(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;

    // Trail
    ctx.globalCompositeOperation = 'screen';
    this.trail.forEach((t, i) => {
      ctx.globalAlpha = (i + 1) / this.trail.length * 0.4;
      ctx.fillStyle = i % 2 === 0 ? '#ff003c' : '#ffffff';
      ctx.fillRect(t.x - cam.x + 2, t.y - cam.y + 2, this.w - 4, this.h - 4);
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Damage flash
    if (this.invincible > 0 && Math.floor(this.invincible) % 6 < 3) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.scaleX * this.facing, this.scaleY);

    // Body
    ctx.shadowBlur = this.alive ? 16 : 0;
    ctx.shadowColor = this.alive ? 'rgba(255, 0, 60, 0.4)' : 'transparent';
    ctx.fillStyle = this.alive ? '#fff' : '#444';
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);

    // Glassy stroke
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.alive ? 'rgba(230, 57, 70, 0.8)' : '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);

    // Eyes
    const eyeY = -3;
    const eyeSpacing = 5;
    if (this.alive) {
      const blink = this.blinking;
      // Whites
      ctx.fillStyle = '#fff';
      ctx.fillRect(-eyeSpacing - 3, eyeY - (blink ? 0.5 : 3), 6, blink ? 1 : 6);
      ctx.fillRect(eyeSpacing - 3, eyeY - (blink ? 0.5 : 3), 6, blink ? 1 : 6);
      if (!blink) {
        // Pupils
        ctx.fillStyle = '#111';
        ctx.fillRect(-eyeSpacing - 1, eyeY - 1, 3, 3);
        ctx.fillRect(eyeSpacing - 1, eyeY - 1, 3, 3);
      }
    } else {
      // X eyes
      ctx.strokeStyle = '#ff4466';
      ctx.lineWidth = 2;
      [-eyeSpacing, eyeSpacing].forEach(ex => {
        ctx.beginPath();
        ctx.moveTo(ex - 3, eyeY - 3); ctx.lineTo(ex + 3, eyeY + 3);
        ctx.moveTo(ex + 3, eyeY - 3); ctx.lineTo(ex - 3, eyeY + 3);
        ctx.stroke();
      });
    }

    ctx.restore();
  }
}

/* ---------- UTILITY ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ---------- CAMERA ---------- */
class Camera {
  constructor() { this.x = 0; this.y = 0; this.shake = 0; }
  follow(p, cw, ch, lw, lh) {
    let tx = p.x - cw / 2 + p.w / 2;
    let ty = p.y - ch / 2 + p.h / 2;
    tx = Math.max(0, Math.min(tx, lw - cw));
    ty = Math.max(0, Math.min(ty, lh - ch));
    this.x += (tx - this.x) * 0.08;
    this.y += (ty - this.y) * 0.08;
  }
  applyShake(ctx) {
    if (this.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shake * 2.5, (Math.random() - 0.5) * this.shake * 2.5);
      this.shake *= 0.88;
    } else { this.shake = 0; }
  }
}

/* ---------- SOUND ---------- */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
function playTone(freq, dur, type, vol) {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
window.playSound = function(type) {
  try {
    if (type === 'jump') playTone(500, 0.12, 'square', 0.06);
    else if (type === 'coin') playTone(880, 0.1, 'sine', 0.07);
    else if (type === 'hurt') playTone(150, 0.3, 'sawtooth', 0.08);
    else if (type === 'die') { playTone(300, 0.5, 'sawtooth', 0.1); setTimeout(() => playTone(150, 0.5, 'sawtooth', 0.08), 200); }
    else if (type === 'heal') playTone(660, 0.15, 'sine', 0.06);
    else if (type === 'complete') { playTone(523, 0.15, 'sine', 0.07); setTimeout(() => playTone(659, 0.15, 'sine', 0.07), 150); setTimeout(() => playTone(784, 0.3, 'sine', 0.07), 300); }
    else if (type === 'click') playTone(1000, 0.05, 'sine', 0.04);
  } catch(e) {}
};

/* ---------- GAME ---------- */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
    this.player = null;
    this.currentLevel = 0;
    this.lvl = null;
    this.map = null;
    this.mapW = 0; this.mapH = 0;
    this.particles = [];
    this.coins = [];
    this.signs = [];
    this.doors = [];
    this.healthPacks = [];
    this.spikes = [];
    this.safeCollapsed = new Set();
    this.collected = new Set();
    this.deaths = 0;
    this.score = 0;
    this.totalTime = 0;
    this.levelTime = 0;
    this.state = 'intro'; // intro, playing, dead, complete, victory, button
    this.stateTimer = 0;
    this.keys = {};
    this.keysJustPressed = {};
    this.running = false;
    this.lastTime = 0;
    this.buttonPhase = 0;
    this.buttonX = 0;
    this.buttonY = 0;
    this.buttonW = 80;
    this.buttonH = 50;
    this.buttonTimer = 0;
    this.buttonMsg = '';
    this.buttonClicks = 0;
    this.floatingTexts = [];
    this.bgStars = [];
    this._abortController = new AbortController();
    for (let i = 0; i < 80; i++) {
      this.bgStars.push({ x: Math.random() * 3000, y: Math.random() * 800, s: 0.5 + Math.random() * 2, b: Math.random() });
    }
    this._resize();
    this._setupInput();
  }

  _resize() {
    const p = this.canvas.parentElement;
    const w = (p ? p.clientWidth : window.innerWidth) || window.innerWidth;
    const h = (p ? p.clientHeight : window.innerHeight) || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Store logical dimensions for camera/collision
    this._logicalWidth = w;
    this._logicalHeight = h;
  }

  _setupInput() {
    const sig = this._abortController.signal;
    window.addEventListener('keydown', e => {
      // Don't capture keys when typing in chat or any input
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.code;
      if (!this.keys[k]) this.keysJustPressed[k] = true;
      this.keys[k] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) e.preventDefault();
    }, { signal: sig });
    window.addEventListener('keyup', e => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      this.keys[e.code] = false;
    }, { signal: sig });
    window.addEventListener('resize', () => this._resize(), { signal: sig });
  }

  start() { this.loadLevel(0); this.running = true; this.lastTime = performance.now(); this._loop(); }
  stop() {
    this.running = false;
    this._abortController.abort();
    // Hide all overlays
    ['death-overlay','level-intro','level-complete','victory-screen','pause-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  loadLevel(idx) {
    this.currentLevel = idx;
    if (idx >= LEVELS.length) { this.state = 'victory'; this._showVictory(); return; }
    this.lvl = LEVELS[idx];
    // Normalize map rows to equal length
    const rawMap = this.lvl.map;
    const maxLen = Math.max(...rawMap.map(r => r.length));
    this.map = rawMap.map(r => r.padEnd(maxLen, ' ').split(''));
    this.mapH = this.map.length;
    this.mapW = maxLen;
    // Parse entities from map
    this.coins = []; this.spikes = []; this.healthPacks = []; this.doors = []; this.teapots = [];
    this.safeCollapsed = new Set(); this.collected = new Set();
    this.floatingTexts = [];
    let coinIdx = 0;
    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        const ch = this.map[r][c];
        if (ch === 'P') { this.map[r][c] = ' '; }
        else if (ch === 'o') { this.coins.push({ x: c * TILE + TILE/2, y: r * TILE + TILE/2, idx: coinIdx++, collected: false, trap: coinIdx >= (this.lvl.trapCoinStart + 1) }); this.map[r][c] = ' '; }
        else if (ch === '^') { this.spikes.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE }); this.map[r][c] = ' '; }
        else if (ch === '+') { this.healthPacks.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, used: false }); this.map[r][c] = ' '; }
        else if (ch === 'E') { this.doors.push({ x: c * TILE, y: r * TILE - TILE, w: TILE, h: TILE * 2, real: true }); this.map[r][c] = ' '; }
        else if (ch === 'D') { this.doors.push({ x: c * TILE, y: r * TILE - TILE, w: TILE, h: TILE * 2, real: false }); this.map[r][c] = ' '; }
        else if (ch === 'T') { this.teapots.push({ x: c * TILE + TILE/2, y: r * TILE + TILE/2, w: TILE, h: TILE, collected: false }); this.map[r][c] = ' '; }
        else if (ch === 'B') { this.buttonX = c * TILE; this.buttonY = r * TILE - 20; this.map[r][c] = ' '; }
      }
    }
    this.signs = (this.lvl.signs || []).map(s => ({...s}));
    const [px, py] = this.lvl.playerStart;
    this.player = new Player(px * TILE, py * TILE - 2);
    this.particles = [];
    this.levelTime = 0;
    // Resize canvas for the game screen
    requestAnimationFrame(() => this._resize());
    this.camera.x = this.player.x - (this.canvas.width || 960) / 2;
    this.camera.y = this.player.y - (this.canvas.height || 540) / 2;
    this.state = this.lvl.isButtonLevel ? 'button' : 'intro';
    this.stateTimer = 0;
    if (this.lvl.isButtonLevel) {
      this.buttonPhase = 0; this.buttonClicks = 0; this.buttonMsg = '';
      this.buttonTimer = 0;
      this.state = 'intro';
    }
    this._updateHUD();
    this._showIntro();
  }

  respawn() {
    const [px, py] = this.lvl.playerStart;
    this.player = new Player(px * TILE, py * TILE - 2);
    this.state = this.lvl.isButtonLevel ? 'button' : 'playing';
    this.stateTimer = 0;
    if (this.lvl.isButtonLevel) { this.buttonPhase = 0; this.buttonClicks = 0; this.buttonMsg = ''; }
    this._hideOverlay('death-overlay');
    this._updateHUD();
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 3);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.keysJustPressed = {};
    requestAnimationFrame(() => this._loop());
  }

  update(dt) {
    this.stateTimer += dt;
    // Floating texts
    this.floatingTexts = this.floatingTexts.filter(ft => { ft.y -= 0.8 * dt; ft.life -= 0.02 * dt; return ft.life > 0; });
    // Particles always update
    this.particles = this.particles.filter(p => { p.update(dt); return p.life > 0; });

    if (this.state === 'intro') {
      if (this.keysJustPressed['Space']) { this.state = this.lvl.isButtonLevel ? 'button' : 'playing'; this._hideOverlay('level-intro'); }
      return;
    }
    if (this.state === 'dead') {
      if (this.keysJustPressed['Space'] && this.deathCountdown === 0) {
        this.respawn();
      }
      return;
    }
    if (this.state === 'complete') {
      if (this.keysJustPressed['Space']) { this._hideOverlay('level-complete'); this.loadLevel(this.currentLevel + 1); }
      return;
    }
    if (this.state === 'victory') return;
    if (this.state === 'paused') {
      if (this.keysJustPressed['Escape']) this.resume();
      return;
    }

    this.levelTime += dt / 60;
    this.totalTime += dt / 60;
    if (this.keysJustPressed['Escape']) { this.pause(); return; }

    // General level updates
    if (this.state === 'button') {
      this._updatePlayer(dt);
      this._updateCam(dt);
      this._updateButton(dt);
      // Let it fall through to death checks
    } else if (this.state === 'playing') {
      this._updatePlayer(dt);
      this._updateCam(dt);
      this._checkCollisions();
    }

    // Fall death
    if (this.player.y > this.mapH * TILE + 200) this.die("Fell into the void. Classic.");
    if (this.player.health <= 0) this.die("Health depleted.");
  }

  _updatePlayer(dt) {
    const p = this.player;
    if (!p.alive) return;
    let mx = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) mx = -1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) mx = 1;
    p.vx += mx * MOVE_SPEED * 0.3 * dt;
    p.vx *= Math.pow(FRICTION, dt);
    if (mx) p.facing = mx;
    // Coyote
    if (p.onGround) p.coyote = COYOTE_TIME; else p.coyote = Math.max(0, p.coyote - dt);
    // Jump
    if (this.keysJustPressed['Space'] || this.keysJustPressed['ArrowUp'] || this.keysJustPressed['KeyW']) {
      if (p.coyote > 0) {
        p.vy = JUMP_FORCE; p.coyote = 0; p.scaleX = 0.75; p.scaleY = 1.25;
        this._spawnParticles(p.x + p.w/2, p.y + p.h, 6, '#aaddff', 'jump');
        playSound('jump');
      }
    }
    // Gravity
    p.vy += GRAVITY * dt;
    if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    // Move & collide
    p.onGround = false;
    p.x += p.vx * dt; this._collideX(p);
    const oldY = p.y;
    p.y += p.vy * dt; this._collideY(p, oldY);
    // Squash recovery
    p.scaleX += (1 - p.scaleX) * 0.12 * dt;
    p.scaleY += (1 - p.scaleY) * 0.12 * dt;
    // Trail
    if (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 1) { p.trail.push({ x: p.x, y: p.y, a: 0.3 }); if (p.trail.length > 6) p.trail.shift(); }
    p.trail.forEach(t => t.a *= 0.9);
    p.trail = p.trail.filter(t => t.a > 0.01);
    // Blink
    p.blinkTimer -= dt;
    if (p.blinkTimer <= 0) { p.blinking = !p.blinking; p.blinkTimer = p.blinking ? 6 : 120 + Math.random() * 180; }
    // Invincible
    if (p.invincible > 0) p.invincible -= dt;
  }

  _isSolid(c, r) {
    if (r < 0 || r >= this.mapH || c < 0 || c >= this.mapW) return false;
    const t = this.map[r] && this.map[r][c];
    if (t === '#') return true;
    if (t === 'S' && !this.safeCollapsed.has(`${c},${r}`)) return true;
    return false;
  }
  _isPlatform(c, r) { return r >= 0 && r < this.mapH && c >= 0 && c < this.mapW && this.map[r] && this.map[r][c] === '-'; }

  _updateCam(dt) {
    const lw = this.mapW * TILE;
    const lh = this.mapH * TILE;
    const cw = this._logicalWidth || this.canvas.width;
    const ch = this._logicalHeight || this.canvas.height;
    this.camera.follow(this.player, cw, ch, lw, lh);
  }

  _collideX(p) {
    const top = Math.floor(p.y / TILE), bot = Math.floor((p.y + p.h - 1) / TILE);
    if (p.vx > 0) { const c = Math.floor((p.x + p.w) / TILE); for (let r = top; r <= bot; r++) if (this._isSolid(c, r)) { p.x = c * TILE - p.w; p.vx = 0; return; } }
    else if (p.vx < 0) { const c = Math.floor(p.x / TILE); for (let r = top; r <= bot; r++) if (this._isSolid(c, r)) { p.x = (c + 1) * TILE; p.vx = 0; return; } }
  }

  _collideY(p, oldY) {
    const left = Math.floor(p.x / TILE), right = Math.floor((p.x + p.w - 1) / TILE);
    if (p.vy > 0) {
      const r = Math.floor((p.y + p.h) / TILE);
      for (let c = left; c <= right; c++) {
        if (this._isSolid(c, r) || this._isPlatform(c, r)) {
          if (this._isPlatform(c, r) && oldY !== undefined && Math.floor((oldY + p.h - 0.1) / TILE) >= r) continue;
          p.y = r * TILE - p.h;
          if (p.vy > 4) { p.scaleX = 1.25; p.scaleY = 0.75; this._spawnParticles(p.x + p.w/2, p.y + p.h, 4, '#ffffff', 'land'); }
          p.vy = 0; p.onGround = true;
          // Safe platform collapse
          if (this.map[r] && this.map[r][c] === 'S') {
            const key = `${c},${r}`;
            if (!this.safeCollapsed.has(key)) {
              this.safeCollapsed.add(key);
              this._addFloatingText(c * TILE + TILE/2, r * TILE - 10, 'BETRAYED!', '#ff4466');
              setTimeout(() => { /* already collapsed */ }, 0);
            }
          }
          return;
        }
      }
    } else if (p.vy < 0) {
      const r = Math.floor(p.y / TILE);
      for (let c = left; c <= right; c++) if (this._isSolid(c, r)) { p.y = (r + 1) * TILE; p.vy = 0; return; }
    }
  }

  _checkCollisions() {
    const p = this.player;
    const px = p.x, py = p.y, pw = p.w, ph = p.h;

    // Coins
    this.coins.forEach((coin, i) => {
      if (coin.collected) return;
      const dx = px + pw/2 - coin.x, dy = py + ph/2 - coin.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        coin.collected = true;
        // Randomized coin trap: use coinTrapChance if set, else fall back to old trap flag
        const chance = this.lvl.coinTrapChance || 0;
        const isTrap = chance > 0 ? (Math.random() < chance) : coin.trap;
        if (isTrap) {
          this.score = Math.max(0, this.score - 100);
          this.player.health--;
          this._spawnParticles(coin.x, coin.y, 8, '#ff4466', 'coin');
          this._addFloatingText(coin.x, coin.y - 10, '-100 💀', '#ff4466');
          playSound('hurt');
          this.camera.shake = 5;
          p.invincible = 30;
          if (window.onGameEvent) window.onGameEvent('trapCoin');
        } else {
          this.score += 100;
          this._spawnParticles(coin.x, coin.y, 6, '#ffd600', 'coin');
          this._addFloatingText(coin.x, coin.y - 10, '+100', '#ffd600');
          playSound('coin');
        }
        this._updateHUD();
      }
    });

    // Spikes
    this.spikes.forEach(sp => {
      if (p.invincible > 0) return;
      if (px + pw > sp.x + 6 && px < sp.x + sp.w - 6 && py + ph > sp.y + 10 && py < sp.y + sp.h) {
        if (this.lvl.spikeHeals) {
          if (p.health < p.maxHealth) {
            p.health++;
            this._spawnParticles(sp.x + TILE/2, sp.y, 5, '#00e676', 'coin');
            this._addFloatingText(sp.x + TILE/2, sp.y - 10, '+❤️ WHAT?!', '#00e676');
            p.invincible = 40;
            playSound('heal');
            if (window.onGameEvent) window.onGameEvent('spikeHeal');
          }
        } else {
          p.health--;
          p.invincible = 50;
          this.camera.shake = 6;
          playSound('hurt');
          this._spawnParticles(p.x + pw/2, p.y + ph/2, 6, '#ff4466', 'death');
        }
        this._updateHUD();
      }
    });

    // Health packs
    this.healthPacks.forEach(hp => {
      if (hp.used) return;
      if (px + pw > hp.x + 4 && px < hp.x + hp.w - 4 && py + ph > hp.y + 4 && py < hp.y + hp.h - 4) {
        hp.used = true;
        if (this.lvl.healthPackDamage) {
          p.health--;
          this._spawnParticles(hp.x + TILE/2, hp.y + TILE/2, 8, '#ff4466', 'death');
          this._addFloatingText(hp.x + TILE/2, hp.y, 'HEALTH PACK?! -❤️', '#ff4466');
          this.camera.shake = 8;
          playSound('hurt');
          if (window.onGameEvent) window.onGameEvent('healthDamage');
        } else {
          if (p.health < p.maxHealth) p.health++;
          this._spawnParticles(hp.x + TILE/2, hp.y + TILE/2, 6, '#00e676', 'coin');
          playSound('heal');
        }
        this._updateHUD();
      }
    });

    // Doors
    this.doors.forEach(d => {
      if (d.x < -900) return;
      if (px + pw > d.x + 8 && px < d.x + d.w - 8 && py + ph > d.y + 8 && py < d.y + d.h - 8) {
        if (d.real) { this.completeLevel(); }
        else {
          this._addFloatingText(d.x + d.w/2, d.y - 10, 'WRONG DOOR 💀', '#ff4466');
          this.camera.shake = 12;
          playSound('hurt');
          if (window.onGameEvent) window.onGameEvent('fakeDoor');
          this.player.health = 0;
          this._updateHUD();
        }
      }
    });

    // Teapots (Easter Egg 418)
    this.teapots.forEach(t => {
      if (!t.collected && px + pw > t.x - 16 && px < t.x + 16 && py + ph > t.y - 16 && py < t.y + 16) {
        t.collected = true;
        this.camera.shake = 20;
        playSound('hurt');
        this.state = 'paused';
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('teapot-screen').classList.add('active');
      }
    });
  }

  _updateButton(dt) {
    this._updatePlayer(dt);
    this.buttonTimer += dt;
    if (!this.player.alive) return;

    // Button runs away from the player
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    const bx = this.buttonX + this.buttonW / 2;
    const by = this.buttonY + this.buttonH / 2;
    const dist = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);

    const triggerDist = 55;
    if (dist < triggerDist && this.buttonTimer > 15) {
      this.buttonPhase++;
      this.buttonTimer = 0;
      playSound('click');

      // Flee opposite direction
      const angle = Math.atan2(by - py, bx - px);
      let nx = this.buttonX + Math.cos(angle) * (120 + Math.random() * 150);
      let ny = this.buttonY + Math.sin(angle) * (30 + Math.random() * 30);
      const maxX = this.mapW * TILE - this.buttonW - TILE;
      const minY = TILE * 5;
      const maxY = (this.mapH - 4) * TILE;
      nx = Math.max(TILE, Math.min(nx, maxX));
      ny = Math.max(minY, Math.min(ny, maxY));
      this.buttonX = nx;
      this.buttonY = ny;
      this._spawnParticles(bx, by, 10, '#ff4466', 'death');

      const msgs = [
        "Nope.", "Too slow.", "Not today.",
        "Stop following me.", "This is harassment.",
        "I'm calling HR.", "CAPTCHA Required. Answer: no.",
        "OTP sent to your imaginary phone.",
        "KYC Check: What's your name? WRONG.",
        "⚠️ Too many attempts.", "I'm filing a restraining order.",
        "...fine."
      ];
      if (this.buttonPhase <= msgs.length) {
        this.buttonMsg = msgs[this.buttonPhase - 1];
      }
      if (this.buttonPhase >= 5) this.buttonW = Math.max(22, 80 - this.buttonPhase * 5);
      if (this.buttonPhase >= 5) this.buttonH = Math.max(18, 50 - this.buttonPhase * 3);
      if (this.buttonPhase >= 12) {
        this.buttonMsg = "Fine. You win. 🎉";
        setTimeout(() => this.completeLevel(), 1200);
      }
      if (window.onGameEvent) window.onGameEvent('buttonPress', this.buttonPhase);
    }
  }

  die(reason) {
    if (!this.player.alive) return;
    this.player.alive = false;
    this.state = 'dead';
    this.deaths++;
    this.camera.shake = 12;
    this._spawnParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 20, '#ff4466', 'death');
    playSound('die');
    const msg = getNextDeathMessage();
    const sub = getNextDeathSub();
    // Adaptive trolling
    let extraMsg = '';
    if (this.deaths === 5) extraMsg = '\n🏷️ Difficulty: 👶 Easy Baby Mode enabled! (same difficulty)';
    if (this.deaths === 10) extraMsg = '\n📊 You are in the bottom 0.01% of 7.3M players.';
    if (this.deaths === 15) extraMsg = '\n🎓 Death University has offered you a scholarship.';
    if (this.deaths === 20) extraMsg = '\n📞 Your ISP called. They want their bandwidth back.';
    if (this.deaths === 25) extraMsg = '\n🫖 The teapot weeps for you. Error 418.';
    if (this.deaths === 30) extraMsg = '\n🤖 Gemini AI could beat this. You can\'t. Noted.';
    if (this.deaths === 40) extraMsg = '\n📱 Your phone sent a wellness check notification.';
    if (this.deaths === 50) extraMsg = '\n🏆 Congrats. You broke our death counter. Resetting in 3... 2... no.';
    document.getElementById('death-message').textContent = msg;
    document.getElementById('death-sub').textContent = sub + extraMsg;
    document.getElementById('death-overlay').classList.remove('hidden');
    // 3-second countdown before respawn
    this.deathCountdown = 3;
    const hintEl = document.getElementById('death-hint');
    if (hintEl) hintEl.textContent = 'Respawn in 3...';
    this._deathCountdownInterval = setInterval(() => {
      this.deathCountdown--;
      if (this.deathCountdown > 0) {
        if (hintEl) hintEl.textContent = `Respawn in ${this.deathCountdown}...`;
      } else {
        clearInterval(this._deathCountdownInterval);
        if (hintEl) hintEl.textContent = 'Press SPACE to accept your fate';
        this.deathCountdown = 0;
      }
    }, 1000);
    this._updateHUD();
    if (window.onGameEvent) window.onGameEvent('death', this.deaths);
  }

  completeLevel() {
    this.state = 'complete';
    playSound('complete');
    document.getElementById('complete-msg').textContent = this.lvl.completeMsg;
    document.getElementById('level-complete').classList.remove('hidden');
    if (window.onGameEvent) window.onGameEvent('levelComplete', this.currentLevel);
  }

  pause() { this.state = 'paused'; document.getElementById('pause-overlay').classList.remove('hidden'); }
  resume() { this.state = this.lvl.isButtonLevel ? 'button' : 'playing'; document.getElementById('pause-overlay').classList.add('hidden'); }

  _showIntro() {
    document.getElementById('intro-num').textContent = this.currentLevel + 1;
    document.getElementById('intro-name').textContent = this.lvl.name;
    document.getElementById('intro-sub').textContent = this.lvl.subtitle;
    document.getElementById('level-intro').classList.remove('hidden');
    document.getElementById('hud-level').textContent = 'LEVEL ' + (this.currentLevel + 1) + '/' + LEVELS.length;
  }

  _showVictory() {
    const mins = Math.floor(this.totalTime / 60);
    const secs = Math.floor(this.totalTime % 60);
    const timeStr = `${mins}m ${secs}s`;
    // Save high score
    this._saveHighScore();
    const hs = this._getHighScores();
    document.getElementById('victory-msg').textContent = `Congratulations! You wasted ${timeStr} of your life.`;
    document.getElementById('victory-stats').innerHTML =
      `Deaths: ${this.deaths}<br>Score: ${this.score}<br>Time Wasted: ${timeStr}<br>Life Decisions Questioned: ∞` +
      `<br><br><span style="color:#ffd600">HIGH SCORES</span><br>` +
      `Best Score: ${hs.bestScore}<br>Fewest Deaths: ${hs.fewestDeaths}<br>Fastest Time: ${hs.bestTime}<br>Games Completed: ${hs.gamesCompleted}`;
    document.getElementById('victory-screen').classList.remove('hidden');
    // Trigger AI review
    if (window.onGameEvent) window.onGameEvent('victory', { deaths: this.deaths, score: this.score, time: timeStr });
  }

  _saveHighScore() {
    try {
      const hs = JSON.parse(localStorage.getItem('trollgame_highscores') || '{}');
      const mins = Math.floor(this.totalTime / 60);
      const secs = Math.floor(this.totalTime % 60);
      const timeStr = `${mins}m ${secs}s`;
      hs.bestScore = Math.max(hs.bestScore || 0, this.score);
      hs.fewestDeaths = hs.fewestDeaths === undefined ? this.deaths : Math.min(hs.fewestDeaths, this.deaths);
      hs.bestTime = hs.bestTimeRaw === undefined || this.totalTime < hs.bestTimeRaw ? timeStr : hs.bestTime;
      hs.bestTimeRaw = hs.bestTimeRaw === undefined ? this.totalTime : Math.min(hs.bestTimeRaw, this.totalTime);
      hs.gamesCompleted = (hs.gamesCompleted || 0) + 1;
      localStorage.setItem('trollgame_highscores', JSON.stringify(hs));
    } catch(e) {}
  }

  _getHighScores() {
    try {
      const hs = JSON.parse(localStorage.getItem('trollgame_highscores') || '{}');
      return {
        bestScore: hs.bestScore || 0,
        fewestDeaths: hs.fewestDeaths ?? '∞',
        bestTime: hs.bestTime || 'N/A',
        gamesCompleted: hs.gamesCompleted || 0,
      };
    } catch(e) { return { bestScore: 0, fewestDeaths: '∞', bestTime: 'N/A', gamesCompleted: 0 }; }
  }

  _hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }

  _updateHUD() {
    let hearts = '';
    for (let i = 0; i < this.player.maxHealth; i++) {
      hearts += `<span class="heart ${i >= this.player.health ? 'lost' : ''}">❤️</span>`;
    }
    document.getElementById('hud-health').innerHTML = hearts;
    document.getElementById('hud-score').textContent = this.score;
    document.getElementById('hud-deaths').textContent = this.deaths;
    const m = Math.floor(this.totalTime / 60), s = Math.floor(this.totalTime % 60);
    document.getElementById('hud-timer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  _spawnParticles(x, y, count, color, type) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color, type));
  }

  _addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 1 });
  }

  /* ---------- RENDER ---------- */
  render() {
    const ctx = this.ctx;
    const W = this._logicalWidth || this.canvas.width;
    const H = this._logicalHeight || this.canvas.height;
    if (!this.lvl) return;

    ctx.save();
    this.camera.applyShake(ctx);

    // Elegant Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#040406');
    bgGrad.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = bgGrad; 
    ctx.fillRect(0, 0, W, H);
    
    // Subtle starfield/particles
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for(let i=0; i<100; i++) {
        const px = (i * 137 + this.camera.x * 0.1) % W;
        const py = (i * 223 - this.camera.y * 0.1) % H;
        const r = (i % 3 == 0) ? 2 : 1;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    }

    // Grid details
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=(this.camera.x * 0.2)%80; i<W; i+=80) { ctx.moveTo(i, 0); ctx.lineTo(i, H); }
    for(let i=(this.camera.y * 0.2)%80; i<H; i+=80) { ctx.moveTo(0, i); ctx.lineTo(W, i); }
    ctx.stroke();

    // Level backdrop text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.font = '900 180px var(--font-display, "JetBrains Mono", sans-serif)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText("LVL " + (this.currentLevel+1), W/2 - this.camera.x * 0.05, H/2 - this.camera.y * 0.05);

    // Tiles
    const startCol = Math.max(0, Math.floor(this.camera.x / TILE));
    const endCol = Math.min(this.mapW - 1, Math.ceil((this.camera.x + W) / TILE));
    const startRow = Math.max(0, Math.floor(this.camera.y / TILE));
    const endRow = Math.min(this.mapH - 1, Math.ceil((this.camera.y + H) / TILE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const t = this.map[r][c];
        const x = c * TILE - this.camera.x, y = r * TILE - this.camera.y;
        if (t === '#') {
          const isTop = r === 0 || this.map[r-1][c] !== '#';
          
          if (isTop) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+TILE, y); ctx.stroke();
            
            // Subtle top highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(x, y, TILE, 3);
          } else {
            ctx.fillStyle = 'rgba(10, 10, 12, 0.8)';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
            ctx.strokeRect(x, y, TILE, TILE);
          }
        } else if (t === '-') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(x, y, TILE, 6);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(x, y, TILE, 2);
        } else if (t === 'S') {
          const key = `${c},${r}`;
          if (!this.safeCollapsed.has(key)) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x, y, TILE, 6);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x, y, TILE, 2);
          }
        }
      }
    }

    // Spikes (Softened threat)
    this.spikes.forEach(sp => {
      const sx = sp.x - this.camera.x, sy = sp.y - this.camera.y;
      ctx.fillStyle = 'rgba(230, 57, 70, 0.8)';
      ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(230, 57, 70, 0.6)';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const tx = sx + 4 + i * 12;
        ctx.moveTo(tx, sy + TILE); ctx.lineTo(tx + 6, sy + 12); ctx.lineTo(tx + 12, sy + TILE);
      }
      ctx.fill(); 
      ctx.shadowBlur = 0;
    });

    // Health packs
    this.healthPacks.forEach(hp => {
      if (hp.used) return;
      const hx = hp.x - this.camera.x + TILE/2, hy = hp.y - this.camera.y + TILE/2;
      const bob = Math.sin(performance.now() / 400) * 3;
      
      ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(230, 57, 70, 0.8)';
      ctx.fillStyle = '#ff4466';
      ctx.font = '22px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('❤️', hx, hy + bob);
      ctx.shadowBlur = 0;
    });

    // Coins
    this.coins.forEach(coin => {
      if (coin.collected) return;
      const cx = coin.x - this.camera.x, cy = coin.y - this.camera.y;
      const bob = Math.sin(performance.now() / 350 + coin.idx) * 4;
      
      ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(255, 214, 0, 0.4)';
      ctx.fillStyle = 'rgba(255, 214, 0, 0.1)'; 
      ctx.strokeStyle = 'rgba(255, 214, 0, 0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', cx, cy + bob + 1);
      ctx.shadowBlur = 0;
    });

    // Teapots (Easter Egg)
    this.teapots.forEach(t => {
      if (t.collected) return;
      const tx = t.x - this.camera.x, ty = t.y - this.camera.y;
      const bob = Math.sin(performance.now() / 300) * 3;
      ctx.fillStyle = '#EADDCD';
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🫖', tx, ty + bob);
    });

    // Signs — Clean banners with good contrast
    this.signs.forEach(s => {
      const sx = s.tx * TILE - this.camera.x, sy = s.ty * TILE - this.camera.y;
      
      // Post
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(sx + TILE/2 - 2, sy - 8, 4, TILE + 8);
      
      // Board background
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const tw = ctx.measureText(s.text).width;
      const bw = Math.max(tw + 32, 80);
      const bh = 30;
      const bx = sx + TILE/2 - bw/2;
      const by = sy - 38;
      
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(bx + 2, by + 2, bw, bh);
      
      // Board panel
      ctx.fillStyle = 'rgba(8, 8, 12, 0.95)';
      ctx.fillRect(bx, by, bw, bh);
      
      // Accent border (top line uses sign color)
      ctx.fillStyle = s.color || 'rgba(255,255,255,0.5)';
      ctx.fillRect(bx, by, bw, 3);
      
      // Subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      
      // Text with glow
      ctx.shadowBlur = 6;
      ctx.shadowColor = s.color || 'rgba(255,255,255,0.3)';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.text, sx + TILE/2, by + bh/2 + 1);
      ctx.shadowBlur = 0;
    });

    // Doors — Subtle Exit
    this.doors.forEach(d => {
      if (d.x < -900) return;
      const dx = d.x - this.camera.x, dy = d.y - this.camera.y;
      ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; 
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
      ctx.fillRect(dx, dy, d.w, d.h);
      ctx.strokeRect(dx, dy, d.w, d.h);
      ctx.shadowBlur = 0;
      // Knob
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(dx + d.w - 12, dy + d.h/2 - 4, 4, 8);
      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.font = '600 10px "JetBrains Mono"'; ctx.textAlign = 'center';
      ctx.fillText('EXIT', dx + d.w/2, dy - 8);
    });

    // Button (level 3)
    if (this.lvl.isButtonLevel && this.state !== 'intro') {
      const bx = this.buttonX - this.camera.x, by = this.buttonY - this.camera.y;
      const pdist = Math.sqrt((this.player.x + this.player.w/2 - (this.buttonX + this.buttonW/2))**2 + (this.player.y + this.player.h/2 - (this.buttonY + this.buttonH/2))**2);
      const scared = pdist < 100;
      const wobble = scared ? Math.sin(performance.now() / 30) * 3 : 0;
      
      ctx.save();
      ctx.translate(bx + this.buttonW/2, by + this.buttonH/2);
      ctx.fillStyle = '#000'; ctx.strokeStyle = '#ff003c'; ctx.lineWidth = 4;
      ctx.fillRect(-this.buttonW/2 + wobble, -this.buttonH/2, this.buttonW, this.buttonH);
      ctx.strokeRect(-this.buttonW/2 + wobble, -this.buttonH/2, this.buttonW, this.buttonH);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(14, this.buttonW/4)}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(scared ? '!ERR!' : 'PRESS', wobble, 0);
      ctx.restore();
      
      // Phase message
      if (this.buttonMsg) {
        ctx.font = 'bold 22px "JetBrains Mono"';
        const msgW = ctx.measureText(this.buttonMsg).width + 60;
        const msgH = 60;
        const msgY = 80;
        ctx.fillStyle = '#000';
        ctx.fillRect(W/2 - msgW/2, msgY, msgW, msgH);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.strokeRect(W/2 - msgW/2, msgY, msgW, msgH);
        ctx.fillStyle = '#ff003c';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.buttonMsg, W/2, msgY + msgH/2);
      }
    }

    // Player
    if (this.player) this.player.draw(ctx, this.camera);

    // Particles
    this.particles.forEach(p => p.draw(ctx, this.camera));

    // Floating texts
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 13px "Outfit"'; ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x - this.camera.x, ft.y - this.camera.y);
      ctx.globalAlpha = 1;
    });

    ctx.restore();

    // HUD timer update
    if (this.state === 'playing' || this.state === 'button') {
      const m = Math.floor(this.totalTime / 60), s = Math.floor(this.totalTime % 60);
      document.getElementById('hud-timer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
  }
}

/* Expose globally */
window.Game = Game;