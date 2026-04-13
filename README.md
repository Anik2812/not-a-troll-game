# 🫖 DEFINITELY NOT A TROLL GAME™

![cover_image_1776014280089](https://github.com/user-attachments/assets/20223dca-ac06-48a4-9892-89e1276126ab)

> A perfectly normal platformer that systematically betrays every gaming instinct you've ever developed.

**[🎮 PLAY THE GAME HERE](https://notatroll.netlify.app/)**

---

## 🛑 What is this?

This is a brutalist-themed, web-based platformer built for the [DEV April Fools Challenge](https://dev.to/challenges/aprilfools-2026). It is designed to gaslight the player through deceptive mechanics and a sarcastic AI assistant. 

Nothing is as it seems. Level 1 trains you to trust the rules. Level 2 and beyond actively punish you for learning them.

### Features
*   **10 Levels of Escalating Betrayal:** Play across levels where coins steal your points, spikes heal you, exit doors kill you, and safe platforms collapse.
*   **"HELPFUL ASSISTANT™" AI:** An integrated **Gemini 2.0 Flash** chatbot that actively roasts your failures in real-time based on your current death count, mistakes, and score.
*   **Graceful Degradation:** If the API fails or rate limits, the game falls back to a massive dictionary of handcrafted roasts and keywords.
*   **Useless Settings Menu:** A volume slider that fights back, a "Fun" toggle that actively refuses to turn off, and an uninstall button that gaslights you.
*   **No Frameworks, No Dependencies:** Built with pure HTML5 Canvas, Vanilla CSS, and modern JavaScript in a single IIFE. 

---

## 🛠️ Tech Stack

*   **Engine:** Custom HTML5 `<canvas>` 2D engine with AABB collisions and particle systems.
*   **Styling:** Vanilla CSS highlighting Brutalist design architecture and CRT glitch animations.
*   **Logic:** Vanilla JavaScript (ES6+).
*   **AI Integration:** Google Gemini 2.0 Flash Model via standard REST API `fetch`.

## 🚀 Running Locally

Because the game is 100% dependency-free, you can run it using any local web server.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Anik2812/not-a-troll-game.git
   cd not-a-troll-game
   ```

2. **Serve the project:**
   You can use Python, Node, or VSCode Live Server.
   *   *Python 3:* `python -m http.server 8000`
   *   *Node.js:* `npx serve .`

3. **Open your browser:**
   Navigate to `http://localhost:8000`

### 🔑 Note on the Gemini API Key
To function fully, the game requires a Google Gemini API key. In the deployed version, this key is hardcoded and domain-restricted via Google Cloud Console. 

If you are running the project locally or forking it, you will need to replace the API key in `app.js` with your own, or the AI will fall back to its offline dictionary of responses.

---

## ☕ The `418` Easter Egg

This game serves as an intricate ode to **Larry Masinter**, the author of the legendary 1998 April Fools' joke RFC 2324 (`HTTP 418 I'm a teapot`).

Try to find the hidden teapot screen by:
1. Entering the **Konami Code** on the menu.
2. Clicking the **Rating** on the menu screen.
3. Asking the AI bot for some **coffee**.

---

## 📜 License

MIT License. Do whatever you want with this. Steal the physics engine, copy the UI, or use the AI prompt to insult your own users. We don't mind.
