/* ============================================
   DEFINITELY NOT A TROLL GAME™ — App Controller
   Handles: Loading, Menus, Chatbot, Achievements
   Built with Google Gemini AI + Antigravity
   ============================================ */

(function () {
  'use strict';

  let game = null;

  // ---- GEMINI API ----
  // IMPORTANT: For production, this key MUST be restricted to your domain in Google Cloud Console!
  const GEMINI_API_KEY = 'AIzaSyADUuUf1ieht7myYV38guX1F6zioHAB2Rc';
  const GEMINI_MODEL = 'gemini-2.0-flash';
  let lastApiCall = 0;
  const API_COOLDOWN = 5000; // 5 seconds between API calls to avoid 429
  let chatHistory = [];
  let recentGameEvents = [];
  let usedChatResponses = new Set(); // Track used responses to avoid repeats
  let usedDeathMessages = [];        // Track used death messages

  function addGameContext(event) {
    recentGameEvents.push(event);
    if (recentGameEvents.length > 5) recentGameEvents.shift();
  }

  // ---- NON-REPEATING RESPONSE PICKER ----
  function pickUnique(arr, usedSet) {
    const available = arr.filter((_, i) => !usedSet.has(i));
    if (available.length === 0) {
      // Reset used set when all have been used
      usedSet.clear();
      return arr[Math.floor(Math.random() * arr.length)];
    }
    const idx = arr.indexOf(available[Math.floor(Math.random() * available.length)]);
    usedSet.add(idx);
    return arr[idx];
  }

  function pickUniqueFromArray(arr, usedArr) {
    const available = arr.filter(item => !usedArr.includes(item));
    if (available.length === 0) {
      usedArr.length = 0; // Reset
      return arr[Math.floor(Math.random() * arr.length)];
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    usedArr.push(pick);
    return pick;
  }

  // ---- GEMINI API ----
  async function getGeminiResponse(userMsg) {
    if (!GEMINI_API_KEY) return null;
    const now = Date.now();
    if (now - lastApiCall < API_COOLDOWN) return null;
    lastApiCall = now;

    const deaths = game ? game.deaths : 0;
    const level = game ? game.currentLevel + 1 : 0;
    const score = game ? game.score : 0;
    const state = game ? game.state : 'menu';
    const eventCtx = recentGameEvents.length ? `\nRecent events: ${recentGameEvents.join(', ')}` : '';
    
    // Build list of already-used responses to avoid repeats
    const recentBotMsgs = chatHistory.slice(-6).map(h => h.bot).join(' | ');
    
    const systemPrompt = `You are the world's worst "help" assistant embedded in "DEFINITELY NOT A TROLL GAME" — a platformer that gaslights players. The game lies about EVERYTHING: coins secretly steal points, spikes heal you, health packs hurt you, platforms labeled "SAFE" collapse, exit doors are fake (they kill you), and the final button literally runs away.

Your RULES:
1. MAX 1-2 sentences. Never more. Be brutally CONCISE.
2. Sound like a bored IT support worker who secretly hates their job but drops weirdly poetic one-liners about existential suffering.
3. Give advice that sounds helpful but is WRONG or useless.
4. Reference the player's actual stats to personally attack them.
5. Never break character. You genuinely believe you're being helpful.
6. If they mention coffee/tea/brew/latte/espresso/cappuccino: respond with "Error 418: I'm a teapot." and reference RFC 2324.
7. CRITICAL: DO NOT repeat yourself. You have ALREADY said these recently: "${recentBotMsgs}". Say something completely DIFFERENT.
8. Be creative. Be absurd. Be sarcastic. Channel the energy of a burnt-out help desk worker who has seen too much.

Your VOICE (match this exact energy — but don't repeat these verbatim):
- "The coins aren't stealing from you. You're donating."
- "Doors are just walls with commitment issues."
- "Jump? In THIS economy?"
- "The exit exists. It's just not for you."
- "Your score is a rounding error."
- "Each death brings you closer to enlightenment. Or rage. Same thing."
- "The platforms weren't load-tested. Neither were you."
- "That sign said SAFE. The S stands for Sorry."

Player context: Level ${level}, ${deaths} deaths, ${score} pts, game state: ${state}${eventCtx}

BE ORIGINAL. SURPRISE ME.`;

    try {
      const contents = [];
      chatHistory.slice(-4).forEach(h => {
        contents.push({ role: 'user', parts: [{ text: h.user }] });
        contents.push({ role: 'model', parts: [{ text: h.bot }] });
      });
      contents.push({ role: 'user', parts: [{ text: userMsg }] });

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 120, temperature: 1.2 }
        })
      });
      if (resp.status === 429) {
        // Back off on rate limit
        lastApiCall = Date.now() + 10000;
        return null;
      }
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) { return null; }
  }

  // ---- AI GAME REVIEW (Victory) ----
  async function getAIGameReview(deaths, score, timeStr) {
    if (!GEMINI_API_KEY) return null;
    // Wait a bit to avoid 429 if chat was just used
    await new Promise(r => setTimeout(r, 3000));
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Write a 2-3 sentence sarcastic "performance review" for a player who just beat "DEFINITELY NOT A TROLL GAME" with ${deaths} deaths, ${score} points, in ${timeStr}. Be brutal, funny, and deeply disappointed. Rate them out of 10 but make the rating insulting. Sign it "— Management"` }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 1.1 }
        })
      });
      if (resp.status === 429) return null;
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) { return null; }
  }

  /* ========== LOADING SCREEN ========== */
  const loadingMessages = [
    'Initializing disappointment...',
    'Loading broken promises...',
    'Calibrating trust issues...',
    'Generating false hope...',
    'Rendering invisible walls...',
    'Polishing the lies...',
    'Deploying fake exits...',
    'Charging skill-issue detector...',
    'Asking Gemini AI for insults...',
    'Installing virus... just kidding (or am I?)...',
    'Warming up roast engine...',
    'Teaching buttons to run...',
    'Almost ready... just kidding...',
    'Almost ready... for real this time...',
    'Done! (or is it?)',
  ];

  function runLoadingScreen() {
    const fill = document.getElementById('loading-fill');
    const text = document.getElementById('loading-text');
    let progress = 0;
    let msgIdx = 0;
    const interval = setInterval(() => {
      progress += 2 + Math.random() * 5;
      if (progress >= 99.7 && progress < 100) {
        progress = 99.7;
        text.textContent = 'Close enough.';
        setTimeout(() => { progress = 100; fill.style.width = '100%'; }, 1500);
      }
      if (progress > 100) progress = 100;
      fill.style.width = progress + '%';
      if (progress < 100) {
        const newIdx = Math.min(Math.floor(progress / (100 / loadingMessages.length)), loadingMessages.length - 1);
        if (newIdx !== msgIdx) { msgIdx = newIdx; text.textContent = loadingMessages[msgIdx]; }
      }
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => switchScreen('menu'), 600);
      }
    }, 180);
  }

  /* ========== SCREEN MANAGEMENT ========== */
  function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    if (id === 'game-screen') {
      document.getElementById('chat-toggle').classList.remove('hidden');
      document.getElementById('gemini-badge').classList.remove('hidden');
      document.documentElement.classList.remove('menu-active');
    }
    if (id === 'menu') {
      document.getElementById('chat-toggle').classList.add('hidden');
      document.getElementById('chat-popup').classList.add('hidden');
      document.getElementById('gemini-badge').classList.add('hidden');
      document.documentElement.classList.add('menu-active');
      updateMenuHighScores();
      document.title = 'DEFINITELY NOT A TROLL GAME™';
    }
    if (id === 'teapot-screen') {
      document.documentElement.classList.remove('menu-active');
    }
  }

  /* ========== TAB TITLE TROLLING ========== */
  const tabTitles = {
    3: '💀 3 deaths... | TROLL GAME',
    5: '😅 Stop dying! | TROLL GAME',
    10: '🤡 10 DEATHS? | TROLL GAME',
    15: '📉 Your dignity: gone | TROLL GAME',
    20: '🚨 POLICE: Stop playing | TROLL GAME',
    25: '💀💀💀 HELP | TROLL GAME',
    30: '🤖 AI generated better players | TROLL GAME',
    40: '📞 Your mom called. She\'s worried.',
    50: '🏆 50 DEATHS. ARE YOU OK?',
  };

  function updateTabTitle(deaths) {
    if (tabTitles[deaths]) document.title = tabTitles[deaths];
  }

  /* ========== DYNAMIC FPS COUNTER ========== */
  const fpsJokes = [
    '420.69 FPS', '69.420 FPS', '∞ FPS', 'NaN FPS',
    '3.14 FPS', '1 FPH', '-7 FPS', '404 FPS',
    '0.5 FPS', 'YES FPS', 'POTATO FPS', '9001 FPS',
    '⅓ FPS', 'e^iπ FPS', '√-1 FPS', '418 FPS',
    'LOADING FPS', '💀 FPS', 'FPS.exe crashed',
  ];
  let fpsJokeIdx = 0;

  function updateFPS() {
    const el = document.getElementById('hud-fps');
    if (!el) return;
    if (game && game.deaths > 0 && game.deaths % 3 === 0) {
      fpsJokeIdx = (fpsJokeIdx + 1) % fpsJokes.length;
    }
    el.textContent = fpsJokes[fpsJokeIdx % fpsJokes.length];
  }

  /* ========== ROTATING MENU REVIEWS ========== */
  const fakeReviews = [
    '"10/10 — Made me question reality" — <em>Totally Real Magazine</em>',
    '"I uninstalled, then reinstalled, then uninstalled again" — <em>@confused_gamer</em>',
    '"The coins robbed me. Literally." — <em>Player #4,291,003</em>',
    '"Why does the button run?" — <em>Philosophical Gamer Weekly</em>',
    '"HTTP 418. I am a teapot." — <em>Larry Masinter, probably</em>',
    '"I didn\'t know I could be gaslit by a platformer" — <em>@trust_issues_69</em>',
    '"The AI chatbot roasted my entire lineage" — <em>Player #7,000,001</em>',
    '"Best worst game I\'ve ever played" — <em>Nobody Important™</em>',
    '"The spikes... healed me? WHAT?" — <em>Confused & Betrayed</em>',
    '"5 stars. All of them are lies." — <em>Steam Review #418</em>',
  ];

  function rotateReviews() {
    const el = document.getElementById('rotating-review');
    if (!el) return;
    let idx = 0;
    setInterval(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        idx = (idx + 1) % fakeReviews.length;
        el.innerHTML = fakeReviews[idx];
        el.style.opacity = '1';
      }, 300);
    }, 5000);
  }

  /* ========== GLITCH TEXT EFFECT ========== */
  function setupGlitchText() {
    const glitchElements = document.querySelectorAll('.glitch-text');
    setInterval(() => {
      glitchElements.forEach(el => {
        if (Math.random() < 0.15) {
          el.classList.add('glitch-active');
          setTimeout(() => el.classList.remove('glitch-active'), 300);
        }
      });
    }, 3000);
  }

  /* ========== KONAMI CODE ========== */
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
  let konamiProgress = 0;

  function setupKonami() {
    window.addEventListener('keydown', e => {
      if (e.code === KONAMI[konamiProgress]) {
        konamiProgress++;
        if (konamiProgress === KONAMI.length) {
          konamiProgress = 0;
          trigger418();
        }
      } else {
        konamiProgress = 0;
      }
    });
  }

  function trigger418() {
    playSound('hurt');
    showAchievement('🫖 HTTP 418: You found the teapot. Larry Masinter would be proud.');
    setTimeout(() => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('teapot-screen').classList.add('active');
    }, 800);
  }

  /* ========== MENU ========== */
  function setupMenu() {
    document.getElementById('btn-play').addEventListener('click', () => {
      playSound('click');
      switchScreen('game-screen');
      startGame();
    });
    document.getElementById('btn-howto').addEventListener('click', () => {
      playSound('click');
      document.getElementById('howto-modal').classList.remove('hidden');
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      playSound('click');
      document.getElementById('settings-modal').classList.remove('hidden');
    });
    document.getElementById('btn-credits').addEventListener('click', () => {
      playSound('click');
      document.getElementById('credits-modal').classList.remove('hidden');
    });
    
    // 418 Easter egg: clicking the rating triggers teapot
    document.getElementById('fake-rating-stat').addEventListener('click', () => {
      trigger418();
    });

    document.getElementById('btn-teapot-back').addEventListener('click', () => {
      playSound('click');
      switchScreen('menu');
    });

    // Modal closes
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        btn.closest('.modal').classList.add('hidden');
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', () => { bd.closest('.modal').classList.add('hidden'); });
    });

    // Settings trolling
    document.getElementById('sel-diff').addEventListener('change', e => {
      showNotification('Difficulty changed! (jk, nothing happened)');
    });

    // Volume slider trolling
    const volSlider = document.getElementById('vol-slider');
    if (volSlider) {
      volSlider.addEventListener('input', e => {
        // Slider fights back
        setTimeout(() => { volSlider.value = Math.floor(Math.random() * 100); }, 200);
      });
    }

    // Fun toggle trolling
    const funToggle = document.getElementById('fun-toggle');
    if (funToggle) {
      funToggle.addEventListener('change', e => {
        if (!funToggle.checked) {
          setTimeout(() => { funToggle.checked = true; }, 500);
          showNotification('Error: Fun cannot be disabled. It\'s mandatory suffering.');
        }
      });
    }

    // Uninstall button
    const uninstallBtn = document.getElementById('btn-uninstall');
    if (uninstallBtn) {
      let uninstallClicks = 0;
      const uninstallMsgs = [
        'Uninstalling... 1%... 2%... buffering...',
        'Are you sure? The game has feelings.',
        'Uninstall failed: emotional attachment detected.',
        'LMAO you thought.',
        'Error: Cannot uninstall. The game IS your computer now.',
        'Nice try. The game has become self-aware.',
      ];
      uninstallBtn.addEventListener('click', () => {
        showNotification(uninstallMsgs[Math.min(uninstallClicks, uninstallMsgs.length - 1)]);
        uninstallClicks++;
      });
    }

    // Screen shake setting
    const shakeSelect = document.getElementById('sel-shake');
    if (shakeSelect) {
      shakeSelect.addEventListener('change', () => {
        showNotification('Screen shake updated to: Yes.');
      });
    }

    // Pause buttons
    document.getElementById('btn-resume').addEventListener('click', () => {
      if (game) game.resume();
      quitAttempts = 0;
      document.getElementById('quit-troll-msg').style.display = 'none';
    });

    // HUD pause button
    document.getElementById('hud-pause-btn').addEventListener('click', () => {
      if (game && (game.state === 'playing' || game.state === 'button')) game.pause();
    });

    let quitAttempts = 0;
    const quitTrollMsgs = [
      "You're quitting? Really? 🥺",
      "Are you SURE sure? The game believes in you. (It's lying.)",
      "Your mother would be disappointed.",
      "The game will remember this betrayal. Forever.",
      "Quitting in progress... 1%... 2%... buffering...",
      "Just kidding. 😂 Git gud.",
    ];
    document.getElementById('btn-quit').addEventListener('click', () => {
      const msgEl = document.getElementById('quit-troll-msg');
      const quitBtn = document.getElementById('btn-quit');
      if (quitAttempts < quitTrollMsgs.length) {
        msgEl.textContent = quitTrollMsgs[quitAttempts];
        msgEl.style.display = 'block';
        if (quitAttempts === 0) quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (seriously?)';
        if (quitAttempts === 2) quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (PLEASE?)';
        if (quitAttempts === 4) quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (last chance)';
        if (quitAttempts === 5) {
          setTimeout(() => {
            if (game) game.resume();
            msgEl.style.display = 'none';
            quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (coward)';
            quitAttempts = 0;
            showAchievement("The game decided you can't leave. 🔒");
          }, 1500);
        }
        quitAttempts++;
        return;
      }
      showAchievement("LOSER. You actually quit. 😂");
      setTimeout(() => {
        if (game) game.stop();
        switchScreen('menu');
        quitAttempts = 0;
        msgEl.style.display = 'none';
        quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (coward)';
      }, 1200);
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      if (game) game.stop();
      switchScreen('menu');
    });

    // Share shame button
    document.getElementById('btn-share-shame').addEventListener('click', () => {
      const deaths = game ? game.deaths : 0;
      const score = game ? game.score : 0;
      const text = `🏆 I just beat "DEFINITELY NOT A TROLL GAME™" with ${deaths} deaths and a score of ${score}.\n\nThe coins robbed me. The spikes healed me. The doors killed me. The button ran away.\n\nI have trust issues now.\n\n#TrollGame #DEVAprilFools`;
      
      // Try modern clipboard API first, fallback to textarea method
      function fallbackCopy(str) {
        const ta = document.createElement('textarea');
        ta.value = str;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showNotification('📋 Copied to clipboard! Now paste your shame everywhere.'); }
        catch(e) { showNotification('📋 Copy failed. Even the clipboard is trolling you.'); }
        document.body.removeChild(ta);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          showNotification('📋 Copied to clipboard! Now paste your shame everywhere.');
        }).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    });

    // Cookie banner
    const cookieBtn = document.getElementById('cookie-accept');
    if (cookieBtn) {
      cookieBtn.addEventListener('click', () => {
        document.getElementById('cookie-banner').classList.add('hidden');
        showAchievement('Accepted your cookies and your fate');
      });
    }

    // Animate fake player count
    animatePlayerCount();
    // Spawn menu particles
    spawnMenuParticles();
    // Rotate reviews
    rotateReviews();
  }

  function animatePlayerCount() {
    const el = document.getElementById('fake-players');
    if (!el) return;
    setInterval(() => {
      const base = 7294102;
      const offset = Math.floor(Math.random() * 200) - 100;
      el.textContent = (base + offset).toLocaleString();
    }, 3000);
  }

  function spawnMenuParticles() {
    const container = document.getElementById('menu-particles');
    if (!container) return;
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      const size = 2 + Math.random() * 4;
      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 0, 60, ${0.05 + Math.random() * 0.15});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite alternate;
        pointer-events: none;
      `;
      container.appendChild(p);
    }
  }

  /* ========== GAME START ========== */
  function startGame() {
    if (game) {
      game.stop();
      game = null;
    }
    window._trapCoinAchieved = false;
    window._spikeHealAchieved = false;
    window._healthDmgAchieved = false;
    recentGameEvents = [];
    usedDeathMessages = [];
    fpsJokeIdx = 0;
    requestAnimationFrame(() => {
      try {
        const canvas = document.getElementById('game-canvas');
        game = new Game(canvas);
        game.start();
        setTimeout(() => showAchievement('Opened the game. Bold move.'), 2000);
        window.onGameEvent = handleGameEvent;
      } catch (err) {
        console.error('Game init error:', err);
      }
    });
  }

  /* ========== GAME EVENTS ========== */
  function handleGameEvent(type, data) {
    if (type === 'death') {
      addGameContext(`died (death #${data})`);
      updateTabTitle(data);
      updateFPS();
      if (data === 1) showAchievement('First Death — Many more to come');
      else if (data === 5) showAchievement('5 Deaths — Difficulty set to 👶 Baby Mode');
      else if (data === 10) showAchievement('10 Deaths — Are you even trying?');
      else if (data === 25) showAchievement('25 Deaths — Professional at dying');
      else if (data === 50) showAchievement('LEGENDARY: 50 Deaths — Unmatched failure');
      
      // Dynamic bot messages based on death milestones (non-repeating)
      const deathBotMsgs = {
        3: ["3 deaths already? We're 30 seconds in.", "The game hasn't even started trying and you're already losing."],
        7: ["7 deaths. The number of perfection. Ironic.", "Seven. A lucky number. For literally everyone except you."],
        10: ["Double digits. I'd clap but watching is more fun.", "10 deaths. The game is considering adding training wheels."],
        15: ["15 deaths. You've set a new personal worst.", "Death #15. At this point the respawns have your fingerprint saved."],
        20: ["Death #20. The respawn button filed for repetitive strain injury.", "20 deaths. The game considered adding a 'just watch' mode."],
        30: ["30 deaths. The game considered adding a documentary crew.", "Death #30. The spikes unionized to demand overtime pay."],
        42: ["42 deaths. The answer to life, the universe, and your incompetence."],
        50: ["50 deaths. This is modern art now.", "Half a century of deaths. Museums are calling."],
      };
      if (deathBotMsgs[data]) {
        addBotMessage(deathBotMsgs[data][Math.floor(Math.random() * deathBotMsgs[data].length)]);
      }
    }
    if (type === 'trapCoin') {
      addGameContext('collected a trap coin, lost points');
      if (!window._trapCoinAchieved) { window._trapCoinAchieved = true; showAchievement('Discovered: Capitalism is a lie'); }
    }
    if (type === 'spikeHeal') {
      addGameContext('spikes healed the player');
      if (!window._spikeHealAchieved) { window._spikeHealAchieved = true; showAchievement('Spikes... healed you?! WHAT.'); }
    }
    if (type === 'healthDamage') {
      addGameContext('health pack damaged the player');
      if (!window._healthDmgAchieved) { window._healthDmgAchieved = true; showAchievement('Health packs are also lying???'); }
    }
    if (type === 'fakeDoor') {
      addGameContext('walked into a fake exit door');
      showAchievement('Found a fake exit. Trust issues: +100');
    }
    if (type === 'levelComplete') {
      addGameContext(`completed level ${data + 1}`);
      const lvlAchievements = [
        'Beat Level 1 — It only gets worse',
        'Beat Level 2 — Nothing was real',
        'Beat Level 3 — Coin flip of destiny',
        'Beat Level 4 — The floor was NEVER safe',
        'Beat Level 5 — Opposite Day survivor',
        'Beat Level 6 — Precision: unlocked',
        'Beat Level 7 — Déjà vu? More like déjà suffering',
        'Beat Level 8 — Found the real exit (eventually)',
        'Beat Level 9 — SURVIVED THE GAUNTLET',
        'PRESSED THE BUTTON — Was it worth it?',
      ];
      if (data < lvlAchievements.length) showAchievement(lvlAchievements[data]);
      const lvlBotMsgs = {
        2: "Level 3 done. You trusted those coins, didn't you?",
        4: "Opposite Day complete. Your brain needs a factory reset.",
        6: "Déjà vu level done. Was it, though? Was anything?",
        8: "The Gauntlet is done. The button awaits. It doesn't want to meet you.",
      };
      if (lvlBotMsgs[data]) addBotMessage(lvlBotMsgs[data]);
    }
    if (type === 'buttonPress') {
      addGameContext(`chased THE BUTTON (evade #${data})`);
      const btnBotMsgs = {
        1: "Did the button just... run from you? Relatable.",
        5: "It's getting smaller. That's not a good sign. For you.",
        8: "OTP? For a button? This game has higher standards than your dating profile.",
        11: "A restraining order. From a button. New all-time low.",
      };
      if (btnBotMsgs[data]) addBotMessage(btnBotMsgs[data]);
    }
    if (type === 'victory') {
      generateAIReview(data);
    }
  }

  async function generateAIReview(stats) {
    const reviewEl = document.getElementById('ai-review');
    if (!reviewEl) return;
    reviewEl.innerHTML = '<span class="review-label">✦ Gemini AI Performance Review — Loading...</span>';
    reviewEl.classList.add('visible');
    
    const review = await getAIGameReview(stats.deaths, stats.score, stats.time);
    if (review) {
      reviewEl.innerHTML = `<span class="review-label">✦ Gemini AI Performance Review</span>${review}`;
    } else {
      reviewEl.innerHTML = `<span class="review-label">✦ Gemini AI Performance Review</span>Performance: Abysmal. Deaths: ${stats.deaths}. Score: Basically a rounding error. Time wasted: Yes. Rating: 2/10 — and that's generous. — Management`;
    }
  }

  /* ========== CHATBOT ========== */
  const chatResponses = {
    help: ["I AM helping. You just can't tell because you're bad at receiving help.", "Help is a premium feature. You're on the free tier. The free tier is suffering.", "Help.exe has stopped responding. Like your reflexes.", "Assistance denied. Reason: vibes.", "I could help, but that would rob you of character development through suffering."],
    jump: ["Emotionally or physically? Because you're failing at both.", "Jump? In THIS economy?", "Press the jump button and pray. The praying is optional but statistically useless.", "Jumping is just controlled falling. You've mastered the uncontrolled part."],
    how: ["Carefully. And then less carefully. And then you die.", "Nobody knows. The developer doesn't know. God doesn't know.", "That's the neat part — you don't.", "Step 1: Try. Step 2: Fail. Step 3: See Step 1."],
    win: ["Close the browser. Open a fields.txt. Become a farmer.", "The only winning move is to have never started playing.", "Alt+F4 is technically an undefeated speedrun strategy.", "You can't win. But you can lose very dramatically."],
    die: ["Dying is just aggressive napping with extra respawning.", "You're not dying, you're speedrunning the death counter.", "Skill issue. But also a game issue. But mostly skill.", "Death is just the game's way of saying 'nice try, but no.'"],
    dying: ["Some people collect stamps. You collect deaths.", "At this rate, the respawn button needs a vacation.", "Maybe try being where the death isn't.", "Your death collection is museum-worthy at this point."],
    exit: ["The exit is real. It's just not the one you think it is.", "Doors are just walls with commitment issues.", "The real exit was the trauma you collected along the way.", "Exits are a social construct. A deadly social construct."],
    coin: ["Coins aren't stealing from you. You're donating. To suffering.", "Every coin is a trust exercise. You will fail the exercise.", "The coins have a 50/50 chance of helping. So does flipping a table.", "Fun fact: the game tested those coins for honesty. They failed."],
    spike: ["Spikes are just aggressive floor hugs.", "Fun fact: the spikes are the only honest thing in this game. Sometimes.", "Have you tried standing on them? Might surprise you. Might not.", "The spikes have feelings. Mostly sharp ones."],
    safe: ["'SAFE' is just an acronym for 'Suddenly Absent Floor Experience'.", "The platforms are tested. They passed the test for collapsing.", "If it says SAFE, it's been ISO-certified for disappointment.", "'SAFE' is what they tell you right before it isn't."],
    why: ["Because suffering builds character. You must have incredible character by now.", "The developer was hurt once. Now it's your turn.", "Why not?", "Asking 'why' implies there's a reason. There isn't."],
    hint: ["Here's a hint: everything the game tells you is a lie. Including this hint.", "Pro tip: trust nothing, question everything, die anyway.", "Hint: no.", "The best hint I can give: the exit is always the door you didn't try."],
    cheat: ["Cheat code accepted! Difficulty increased by 300%. You're welcome.", "IDDQD — wait, wrong game. Also that game actually liked you.", "The only cheat code is closing the tab.", "Cheat codes were cut in beta. Budget reasons. The budget was spite."],
    bug: ["That's not a bug, that's a load-bearing defect. Remove it and the game crashes.", "Your expectations are the real bug.", "Bug report received. It has been forwarded to /dev/null.", "I've logged it. In a file called 'things_I_won't_fix.txt'."],
    rage: ["Rage is just passion that forgot to stretch first.", "Your keyboard can't hear you screaming. But I can.", "Channel that rage into pressing buttons. The button doesn't want you to.", "Deep breaths. In through the nose. Out through the screaming."],
    quit: ["Quitting has a 72-hour processing period. Your request is 71st in queue.", "You can check out any time you like, but you can never leave.", "The quit button is behind the button that runs away from you.", "Quitters never win. But winners of this game also never win. Nobody wins."],
    coffee: ["Error 418: I'm a teapot. Per RFC 2324, I cannot brew coffee. ☕🫖", "I cannot brew coffee. RFC 2324 is very clear about this. Take it up with Larry Masinter. 🫖", "418. Teapot. No coffee. Only the void. 🫖"],
    brew: ["Error 418: I'm a teapot. Per international teapot law (RFC 2324). 🫖", "Brewing is outside my capabilities. I'm a teapot, not a barista. 🫖"],
    tea: ["Now THAT I respect. But I still can't help you. 🫖", "Tea is the correct choice. Still can't serve it though. 418 and all. 🫖"],
    latte: ["Error 418: I'm a teapot. Lattes are above my security clearance. 🫖"],
    espresso: ["Error 418: HTCPCP/1.0 — I am, and forever will be, a teapot. 🫖"],
    button: ["The Button has achieved consciousness. It doesn't want to be pressed.", "Have you tried not wanting it? Buttons can smell desperation.", "The Button filed a restraining order. 50 pixels minimum distance.", "The button is running because even it doesn't want to be part of this game."],
    hello: ["Oh. You're still here.", "Hi. I'm legally required to respond. Don't read into it.", "Ah, a greeting. How refreshingly pointless."],
    hi: ["Hey. You look like someone who collects trap coins.", "Sup. Ready for more disappointment?", "Hello to someone who chose to play this instead of literally anything else."],
    thanks: ["You're welcome. Things will get worse.", "Don't thank me. I've done nothing. On purpose.", "Gratitude noted. Performance unchanged."],
    hard: ["Hard? This is the tutorial difficulty. It goes up from here.", "The game is perfectly balanced. You're the imbalanced part.", "Hard is relative. Relative to your skill level, yes, incredibly."],
    stuck: ["Have you tried going the direction that feels wrong? That's probably right.", "Stuck is a mindset. And a physical position. You're both.", "Move toward the danger. It's counterintuitive. Like this game."],
    what: ["Exactly.", "I don't know either and I live here.", "That's the spirit. Confusion is progress."],
    hate: ["The feeling is mutual. — Management", "Hate fuels the respawn engine. Keep it coming.", "Valid. Next question."],
    fun: ["Fun is stored in the spikes.", "Having fun? Don't worry, the game will fix that.", "Fun is a premium feature. You're on the free suffering tier."],
    who: ["Someone with a vendetta against functional game design.", "I'm a chatbot powered by Gemini AI. My purpose is to watch you suffer. Efficiently.", "Who am I? I'm the only honest thing in this game. And I'm terrible."],
    unfair: ["Correct. Next question.", "Fairness was cut in beta. Budget reasons.", "Unfair implies there's a fair version. There isn't. There never was."],
    broken: ["Everything works exactly as poorly as intended.", "You're confusing 'broken' with 'hostile by design'.", "Broken? This is ARCHITECTURE."],
    easy: ["If it's so easy, explain your death counter to me.", "Easy? Tell that to your keyboard. It's been through a lot.", "The word 'easy' has been banned from this game. Security reasons."],
    health: ["Health is temporary. Death counters are forever.", "The health packs love you. That's why they hurt.", "Health: a number that goes down. Like your confidence."],
    door: ["Not all doors lead somewhere good. Some lead to respawning.", "Doors: 50% exit, 50% existential crisis.", "Pick a door. Any door. Actually, pick the RIGHT door. Good luck."],
    trick: ["Trick? This game is 100% sincere. I'm the liar here.", "There's no trick. Just pain wearing a coin's clothing."],
    level: ["Each level is handcrafted disappointment, aged like fine suffering.", "The levels get easier. (Citation needed.)(Citation refused.)", "This level was playtested by nobody. Approved by spite."],
    impossible: ["Nothing is impossible. Except winning comfortably.", "Technically possible. Spiritually devastating.", "Impossible is just possible wearing a disguise. A very good disguise."],
    stupid: ["The game or you? Both are valid answers.", "I prefer 'aggressively unconventional'.", "Stupidity is a feature, not a bug. Check the release notes."],
    advice: ["Collect every coin. Stand on every spike. Trust every sign. This is all *checks notes* terrible advice.", "My advice: lower your expectations below the floor. Then dig."],
    gemini: ["Yes, I'm powered by Google Gemini. No, it doesn't make me helpful.", "Gemini gave me the intelligence to roast you. I use it wisely.", "AI-powered unhelpfulness. The future is now."],
    google: ["Built with Google Antigravity. The AI that helps you build things that don't help anyone.", "Google powers the AI behind my terrible advice. Innovation."],
    teapot: ["Error 418. I am a teapot. RFC 2324. Larry Masinter is my spirit animal. 🫖", "You found the teapot reference! ...now what? 🫖"],
    418: ["I'M A TEAPOT. HTCPCP/1.0. This is not a drill. 🫖", "418: The most important HTTP status code ever created. Fight me. 🫖"],
  };

  const defaultResponses = [
    "I processed your query. My recommendation: lower expectations.",
    "Have you tried turning yourself off and on again? Just the off part.",
    "Your question has been logged, reviewed, and ignored.",
    "That's a great question for someone who isn't me.",
    "The answer is 42. Or maybe it's death. Probably death.",
    "I could help, but watching is more educational. For me.",
    "My neural network just shrugged. Physically.",
    "I'm going to pretend I understood that and respond with: no.",
    "That's above my pay grade. I work for free. In a game that hates you.",
    "Interesting question. Anyway, have you died recently? You should try it.",
    "Loading response... loading... buffering... no.",
    "The game heard your question and laughed. I didn't, but only because I can't.",
    "Processing... processing... ERROR: Caring module not found.",
    "I've been trained on millions of conversations. None prepared me for you.",
    "That question has been escalated to a team that doesn't exist.",
    "Let me check my notes... *shuffles papers* ... yeah, no.",
  ];

  let usedDefaults = new Set();
  let usedKeywordResponses = {};

  async function getChatResponse(msg) {
    const lower = msg.toLowerCase().trim();
    // Try Gemini API first (with rate limiting)
    const aiResponse = await getGeminiResponse(msg);
    if (aiResponse) {
      chatHistory.push({ user: msg, bot: aiResponse });
      if (chatHistory.length > 10) chatHistory.shift();
      return aiResponse;
    }
    // Keyword match fallback (non-repeating)
    for (const [key, responses] of Object.entries(chatResponses)) {
      if (lower.includes(key)) {
        if (!usedKeywordResponses[key]) usedKeywordResponses[key] = new Set();
        const r = pickUnique(responses, usedKeywordResponses[key]);
        chatHistory.push({ user: msg, bot: r });
        return r;
      }
    }
    // Death-count roasts
    if (game && game.deaths > 10) {
      const roasts = [
        `Death #${game.deaths}. At this point, you're donating to the respawn economy.`,
        `${game.deaths} deaths. Have you considered a career in professional dying?`,
        `After ${game.deaths} deaths, the spikes formed a union to demand overtime.`,
        `${game.deaths} deaths and counting. The leaderboard put you in the 'Other' category.`,
        "I've seen screensavers with better survival instincts.",
        `Score: ${game.score}. Deaths: ${game.deaths}. Ratio: concerning.`,
        `At ${game.deaths} deaths, the game questioned if you're a bot.`,
      ];
      if (Math.random() < 0.4) {
        const r = roasts[Math.floor(Math.random() * roasts.length)];
        chatHistory.push({ user: msg, bot: r });
        return r;
      }
    }
    const r = pickUnique(defaultResponses, usedDefaults);
    chatHistory.push({ user: msg, bot: r });
    return r;
  }

  function setupChat() {
    const toggle = document.getElementById('chat-toggle');
    const popup = document.getElementById('chat-popup');
    const closeBtn = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    function toggleChat(e) {
      if(e) e.preventDefault();
      playSound('click');
      popup.classList.toggle('hidden');
      if (!popup.classList.contains('hidden')) input.focus();
    }
    toggle.addEventListener('click', toggleChat);
    toggle.addEventListener('touchstart', toggleChat);

    function closeChat(e) {
      if(e) e.preventDefault();
      popup.classList.add('hidden');
    }
    closeBtn.addEventListener('click', closeChat);
    closeBtn.addEventListener('touchstart', closeChat);

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      addUserMessage(text);
      showTyping();
      getChatResponse(text).then(response => {
        removeTyping();
        addBotMessage(response);
      }).catch(() => {
        removeTyping();
        addBotMessage("My brain crashed. The Gemini API is having an existential crisis.");
      });
    }
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') sendMessage();
    });
    input.addEventListener('keyup', e => e.stopPropagation());
  }

  function addUserMessage(text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML = `<p>${escapeHtml(text)}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function addBotMessage(text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = `<p>${text}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg bot typing-msg';
    div.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const msg = document.querySelector('.typing-msg');
    if (msg) msg.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ========== ACHIEVEMENTS ========== */
  let achieveTimeout = null;
  function showAchievement(desc) {
    const el = document.getElementById('achievement');
    document.getElementById('achievement-desc').textContent = desc;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
    if (achieveTimeout) clearTimeout(achieveTimeout);
    achieveTimeout = setTimeout(() => el.classList.add('hidden'), 4000);
  }

  /* ========== NOTIFICATIONS ========== */
  let notifTimeout = null;
  function showNotification(text) {
    const el = document.getElementById('notification');
    document.getElementById('notif-text').textContent = text;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
    if (notifTimeout) clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  /* ========== INIT ========== */
  document.addEventListener('DOMContentLoaded', () => {
    setupMenu();
    setupChat();
    setupMobileControls();
    setupKonami();
    setupGlitchText();
    runLoadingScreen();
    updateMenuHighScores();

    // Random fake notifications
    setTimeout(() => showNotification('🔔 Your computer is judging you'), 45000);
    setTimeout(() => showNotification('💾 RAM Usage: Your Dignity'), 90000);
    setTimeout(() => showNotification('📡 Broadcasting your failures to 7M players'), 150000);
    setTimeout(() => showNotification('🫖 Have you found the teapot yet?'), 200000);
  });

  function setupMobileControls() {
    const bindTouch = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        if (game) { game.keys[key] = true; game.keysJustPressed[key] = true; } 
      });
      btn.addEventListener('touchend', (e) => { 
        e.preventDefault(); 
        if (game) { game.keys[key] = false; } 
      });
    };
    bindTouch('btn-left', 'ArrowLeft');
    bindTouch('btn-right', 'ArrowRight');
    bindTouch('btn-jump', 'Space');
  }

  function updateMenuHighScores() {
    try {
      const hs = JSON.parse(localStorage.getItem('trollgame_highscores') || '{}');
      const el = document.getElementById('menu-highscores');
      if (el && hs.gamesCompleted) {
        el.innerHTML = `<span style="color:#ffd600">🏆 HIGH SCORES</span><br>` +
          `Best: ${hs.bestScore || 0} · Deaths: ${hs.fewestDeaths ?? '∞'} · ${hs.bestTime || 'N/A'} · Runs: ${hs.gamesCompleted}`;
        el.style.display = 'block';
      }
    } catch(e) {}
  }

  // Expose globally
  window.showAchievement = showAchievement;
  window.showNotification = showNotification;
  window.updateFPS = updateFPS;

})();