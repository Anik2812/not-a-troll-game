/* ============================================
   DEFINITELY NOT A TROLL GAME™ — App Controller
   Handles: Loading, Menus, Chatbot, Achievements
   ============================================ */

(function () {
  'use strict';

  let game = null;

  // ---- GEMINI API ----
  const GEMINI_API_KEY = 'AIzaSyADUuUf1ieht7myYV38guX1F6zioHAB2Rc';
  const GEMINI_MODEL = 'gemini-2.0-flash';
  let lastApiCall = 0;
  const API_COOLDOWN = 2000; // 2 seconds between API calls
  let chatHistory = []; // conversation context
  let recentGameEvents = []; // what just happened in the game

  function addGameContext(event) {
    recentGameEvents.push(event);
    if (recentGameEvents.length > 5) recentGameEvents.shift();
  }

  async function getGeminiResponse(userMsg) {
    if (!GEMINI_API_KEY) return null;
    // Rate limiting
    const now = Date.now();
    if (now - lastApiCall < API_COOLDOWN) return null;
    lastApiCall = now;

    const deaths = game ? game.deaths : 0;
    const level = game ? game.currentLevel + 1 : 0;
    const score = game ? game.score : 0;
    const state = game ? game.state : 'menu';
    const eventCtx = recentGameEvents.length ? `\nRecent events: ${recentGameEvents.join(', ')}` : '';
    const systemPrompt = `You are the world's worst "help" assistant embedded in "DEFINITELY NOT A TROLL GAME" — a platformer that gaslights players. The game lies about EVERYTHING: coins secretly steal points, spikes heal you, health packs hurt you, platforms labeled "SAFE" collapse, exit doors are fake (they kill you), and the final button literally runs away.

Your RULES:
1. MAX 1-2 sentences. Never more. Be CONCISE.
2. Sound like a bored IT support worker who secretly hates their job but is weirdly poetic about it.
3. Give advice that sounds helpful but is WRONG or useless.
4. Reference the player's actual stats to roast them personally.
5. Never break character. You genuinely believe you're being helpful.
6. If they mention coffee/tea/brew: "Error 418: I'm a teapot." (RFC 2324)
7. Occasionally drop philosophical one-liners about suffering.

Your VOICE (copy this exact energy):
- "The coins aren't stealing from you. You're donating." 
- "Doors are just walls with commitment issues."
- "You've died ${deaths} times. At this point the respawn button has your fingerprint saved."
- "Jump? In THIS economy?"
- "The exit exists. It's just not for you."
- "That health pack was trying to hug you. Aggressively. With damage."
- "Level ${level}. Still alive. Statistically impressive. Spiritually concerning."
- "Your score is ${score}. The game rounded down. Out of pity."

DO NOT: use emojis excessively, be generic, say "I'm just an AI", or be nice.

Player: Level ${level}, ${deaths} deaths, ${score} pts, state: ${state}${eventCtx}`;
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
          generationConfig: { maxOutputTokens: 100, temperature: 1.0 }
        })
      });
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
    'Warming up roast engine...',
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
    }
    if (id === 'menu') {
      document.getElementById('chat-toggle').classList.add('hidden');
      document.getElementById('chat-popup').classList.add('hidden');
      updateMenuHighScores();
    }
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
    // Easter egg removed from menu, moved in-game
    
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

    // Settings trolling — difficulty does nothing
    document.getElementById('sel-diff').addEventListener('change', e => {
      showNotification('Difficulty changed! (jk, nothing happened)');
    });

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
        // Change button text progressively
        if (quitAttempts === 0) quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (seriously?)';
        if (quitAttempts === 2) quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (PLEASE?)';
        if (quitAttempts === 4) quitBtn.querySelector('.btn-text').textContent = '🚪 Quit (last chance)';
        if (quitAttempts === 5) {
          // "Just kidding" — resume the game
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
      // After exhausting all troll messages, actually quit
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
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position: absolute;
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
        background: rgba(0, 229, 255, ${0.1 + Math.random() * 0.2});
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
    // Stop any existing game first
    if (game) {
      game.stop();
      game = null;
    }
    // Reset achievement flags for fresh run
    window._trapCoinAchieved = false;
    window._spikeHealAchieved = false;
    window._healthDmgAchieved = false;
    recentGameEvents = [];
    // Delay one frame so the game-screen is fully laid out
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
      if (data === 1) showAchievement('First Death — Many more to come');
      else if (data === 5) showAchievement('5 Deaths — Difficulty set to 👶 Baby Mode');
      else if (data === 10) showAchievement('10 Deaths — Are you even trying?');
      else if (data === 25) showAchievement('25 Deaths — Professional at dying');
      else if (data === 50) showAchievement('LEGENDARY: 50 Deaths — Unmatched failure');
      if (data === 3) addBotMessage("3 deaths already? We're 30 seconds in.");
      if (data === 10) addBotMessage("Double digits. I'd clap but I have no hands.");
      if (data === 20) addBotMessage("Death #20. At this point the respawn button filed for workers' comp.");
      if (data === 30) addBotMessage("30 deaths. The game considered adding a 'just watch' mode for you.");
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
      // Chatbot auto-roast at milestones
      if (data === 2) addBotMessage("Level 3 done. You trusted those coins, didn't you?");
      if (data === 4) addBotMessage("Opposite Day complete. Your brain needs a shower.");
      if (data === 6) addBotMessage("This game is a copy of Level 1. Was it, though?");
      if (data === 8) addBotMessage("The Gauntlet is done. The button awaits. Good luck. You'll need it.");
    }
    if (type === 'buttonPress') {
      addGameContext(`chased THE BUTTON (evade #${data})`);
      if (data === 1) addBotMessage("Did the button just... run? Interesting.");
      if (data === 5) addBotMessage("It's getting smaller. That's not a good sign. For you.");
      if (data === 8) addBotMessage("OTP? For a button? This game has standards you clearly don't.");
      if (data === 11) addBotMessage("A restraining order. From a button. New low.");
    }
  }

  /* ========== CHATBOT ========== */
  const chatResponses = {
    help: ["I AM helping. You just can't tell because you're bad at receiving help.", "Help is a premium feature. You're on the free tier. The free tier is suffering.", "Help.exe has stopped responding. Like your reflexes."],
    jump: ["Emotionally or physically? Because you're failing at both.", "Jump? In THIS economy?", "Press the jump button and pray. The praying is optional but recommended."],
    how: ["Carefully. And then less carefully. And then you die.", "Nobody knows. The developer doesn't know. God doesn't know.", "That's the neat part — you don't."],
    win: ["Close the browser. Open a fields.txt. Become a farmer.", "The only winning move is to have never started playing.", "Alt+F4 is technically an undefeated speedrun strategy."],
    die: ["Dying is just aggressive napping with extra respawning.", "You're not dying, you're speedrunning the death counter.", "Skill issue. But also a game issue. But mostly skill."],
    dying: ["Some people collect stamps. You collect deaths.", "At this rate, the respawn button is filing for repetitive strain injury.", "Maybe try being where the death isn't."],
    exit: ["The exit is real. It's just not the one you think it is.", "Doors are just walls with commitment issues.", "The real exit was the trauma you collected along the way."],
    coin: ["Coins aren't stealing from you. You're donating. To suffering.", "Every coin is a trust exercise. You will fail the exercise.", "The coins have a 50/50 chance of helping. So do coinflips. Neither is in your favor."],
    spike: ["Spikes are just aggressive floor hugs.", "Fun fact: the spikes are the only honest thing in this game. Sometimes.", "Have you tried standing on them? Might surprise you. Might not."],
    safe: ["'SAFE' is just an acronym for 'Suddenly Absent Floor Experience'.", "The platforms are tested. They passed the test for collapsing.", "If it says SAFE, it's been ISO-certified for betrayal."],
    why: ["Because suffering builds character. You must have incredible character by now.", "The developer was hurt once. Now it's your turn.", "Why not?"],
    hint: ["Here's a hint: everything the game tells you is a lie. Including this hint.", "Pro tip: trust nothing, question everything, die anyway.", "Hint: no."],
    cheat: ["Cheat code accepted! Difficulty increased by 300%. You're welcome.", "IDDQD — wait, wrong game. Also that game actually liked you.", "The only cheat code is closing the tab."],
    bug: ["That's not a bug, that's a load-bearing defect. Remove it and the game crashes.", "Your expectations are the real bug.", "Bug report received. It has been forwarded to /dev/null."],
    rage: ["Rage is just passion that forgot to stretch first.", "Your keyboard can't hear you screaming. But I can."],
    quit: ["Quitting has a 72-hour processing period. Your request is 71st in queue.", "You can check out any time you like, but you can never leave.", "The quit button is behind the button that runs away from you."],
    coffee: ["Error 418: I'm a teapot. ☕🫖", "I cannot brew coffee. RFC 2324 is very clear about this. 🫖"],
    brew: ["Error 418: I'm a teapot. Per international teapot law. 🫖"],
    latte: ["Error 418: I'm a teapot. Lattes are above my clearance level. 🫖"],
    tea: ["Now THAT I respect. But I still can't help you. 🫖"],
    button: ["The Button has achieved consciousness. It doesn't want to be pressed.", "Have you tried not wanting it? Buttons can smell desperation.", "The Button filed a restraining order. 50 pixels minimum distance."],
    hello: ["Oh. You're still here.", "Hi. I'm legally required to respond. Don't read into it."],
    hi: ["Hey. You look like someone who collects trap coins.", "Sup. Ready for more disappointment?"],
    thanks: ["You're welcome. Things will get worse.", "Don't thank me. I've done nothing. On purpose."],
    hard: ["Hard? This is the tutorial difficulty. It goes up from here.", "The game is perfectly balanced. You're the imbalanced part."],
    stuck: ["Have you tried going the direction that feels wrong? That's probably right.", "Stuck is a mindset. And a physical position. You're both."],
    what: ["Exactly.", "I don't know either and I live here."],
    hate: ["The feeling is mutual. — Management", "Hate fuels the respawn engine. Keep it coming."],
    fun: ["Fun is stored in the spikes.", "Having fun? Don't worry, the game will fix that."],
    who: ["Someone with a vendetta against functional game design.", "I'm a chatbot. My purpose is to watch you suffer. Efficiently."],
    unfair: ["Correct. Next question.", "Fairness was cut in beta. Budget reasons."],
    broken: ["Everything works exactly as poorly as intended.", "You're confusing 'broken' with 'hostile by design'."],
    easy: ["If it's so easy, explain your death counter to me.", "Easy? Tell that to death number ${game ? game.deaths : '???'}."],
    health: ["Health is temporary. Death counters are forever.", "The health packs love you. That's why they hurt."],
    door: ["Not all doors lead somewhere good. Some lead to respawning.", "Doors: 50% exit, 50% existential crisis."],
    trick: ["Trick? This game is 100% sincere. I'm the liar here."],
    level: ["Each level is handcrafted disappointment, aged like fine suffering.", "The levels get easier. (Citation needed.)"],
    impossible: ["Nothing is impossible. Except winning comfortably.", "Technically possible. Spiritually devastating."],
    stupid: ["The game or you? Both are valid answers.", "I prefer 'aggressively unconventional'."],
    advice: ["Collect every coin. Stand on every spike. Trust every sign. This is all true.", "My advice: lower your expectations below the floor. Then dig."],
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
  ];

  async function getChatResponse(msg) {
    const lower = msg.toLowerCase().trim();
    // Try Gemini API first (with rate limiting)
    const aiResponse = await getGeminiResponse(msg);
    if (aiResponse) {
      chatHistory.push({ user: msg, bot: aiResponse });
      if (chatHistory.length > 8) chatHistory.shift();
      return aiResponse;
    }
    // Keyword match fallback
    for (const [key, responses] of Object.entries(chatResponses)) {
      if (lower.includes(key)) {
        const r = responses[Math.floor(Math.random() * responses.length)];
        chatHistory.push({ user: msg, bot: r });
        return r;
      }
    }
    // Death-count roasts
    if (game && game.deaths > 10) {
      const roasts = [
        `Death #${game.deaths}. At this point, you're just donating to the respawn economy.`,
        `${game.deaths} deaths. Have you considered becoming a farmer instead?`,
        `After ${game.deaths} deaths, the spikes formed a union to demand overtime pay.`,
        `${game.deaths} deaths and counting. The leaderboard put you in 'Other' category.`,
        "I've seen screensavers with better survival instincts.",
      ];
      if (Math.random() < 0.4) {
        const r = roasts[Math.floor(Math.random() * roasts.length)];
        chatHistory.push({ user: msg, bot: r });
        return r;
      }
    }
    const r = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
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
        addBotMessage("My brain crashed. Try again. Or don't.");
      });
    }
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => {
      // Stop ALL key events from leaking to game when typing
      e.stopPropagation();
      if (e.key === 'Enter') sendMessage();
    });
    // Also stop keyup from leaking
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
    el.offsetHeight; // reflow
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
    runLoadingScreen();
    updateMenuHighScores();

    // Random fake notification after a while
    setTimeout(() => showNotification('🔔 Your computer is judging you'), 45000);
    setTimeout(() => showNotification('💾 RAM Usage: Your Dignity'), 90000);
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

})();
