/**
 * STREAMS Affordable Housing Chatbot Widget
 *
 * Supports two display modes:
 *
 * ── MODE 1: FLOATING BUTTON (default) ──────────────────────────────────────
 * A green button appears in the bottom-right corner. Clicking it opens the
 * chat panel as a pop-up overlay.
 *
 *   <script
 *     src="https://your-host.com/housing-chatbot-widget.js"
 *     data-worker="https://housing-chatbot.yourname.workers.dev"
 *     data-title="Affordable Housing Assistant"
 *     data-theme="light">
 *   </script>
 *
 * ── MODE 2: INLINE EMBED ───────────────────────────────────────────────────
 * The chat interface renders directly inside a <div> you place on the page.
 * No floating button. The chatbot is always visible and open.
 *
 *   <!-- 1. Place this div wherever you want the chat to appear -->
 *   <div id="housing-chat" style="height: 600px;"></div>
 *
 *   <!-- 2. Add the script tag (anywhere on the page) -->
 *   <script
 *     src="https://your-host.com/housing-chatbot-widget.js"
 *     data-worker="https://housing-chatbot.yourname.workers.dev"
 *     data-title="Affordable Housing Assistant"
 *     data-theme="light"
 *     data-mode="inline"
 *     data-target="housing-chat">
 *   </script>
 *
 * ── ALL ATTRIBUTES ─────────────────────────────────────────────────────────
 *   data-worker   (required) URL of your deployed Cloudflare Worker
 *   data-title    (optional) Header title. Default: "Affordable Housing Assistant"
 *   data-theme    (optional) "light" (default) or "dark"
 *   data-mode     (optional) "inline" to embed directly in a div. Default: floating button
 *   data-target   (required when data-mode="inline") ID of the container div
 */
(function () {
  'use strict';

  const script = document.currentScript;
  const WORKER = (script.getAttribute('data-worker') || '').replace(/\/$/, '');
  const TITLE  = script.getAttribute('data-title')  || 'Affordable Housing Assistant';
  const THEME  = script.getAttribute('data-theme')  || 'light';
  const MODE   = script.getAttribute('data-mode')   || 'float';   // 'float' | 'inline'
  const TARGET = script.getAttribute('data-target') || '';

  if (!WORKER) { console.error('[HousingBot] data-worker is required.'); return; }
  if (MODE === 'inline' && !TARGET) { console.error('[HousingBot] data-target is required when data-mode="inline".'); return; }
  if (document.getElementById('hcb-root')) return; // prevent double-init

  const INLINE = MODE === 'inline';

  // ── STYLES ──────────────────────────────────────────────────────────────────
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Source+Sans+3:wght@300;400;500;600&display=swap');

/* ── THEME VARIABLES ── */
#hcb-root[data-theme="light"] {
  --bg:        #ffffff;
  --surface:   #f7f6f2;
  --surface2:  #edece7;
  --border:    #dddbd3;
  --accent:    #1a5c3a;
  --accent2:   rgba(26,92,58,0.09);
  --text:      #1b1a17;
  --muted:     #7a7870;
  --user-bg:   #1a5c3a;
  --user-text: #ffffff;
  --bot-bg:    #f0efe9;
  --bot-text:  #1b1a17;
  --shadow:    0 12px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
}
#hcb-root[data-theme="dark"] {
  --bg:        #141610;
  --surface:   #1c1f19;
  --surface2:  #242720;
  --border:    #333629;
  --accent:    #5aaf7a;
  --accent2:   rgba(90,175,122,0.1);
  --text:      #e5e3db;
  --muted:     #7a7870;
  --user-bg:   #2d6b47;
  --user-text: #f0ede4;
  --bot-bg:    #242720;
  --bot-text:  #e5e3db;
  --shadow:    0 12px 48px rgba(0,0,0,0.5);
}

/* ── FLOATING MODE: FAB BUTTON ── */
#hcb-fab {
  position: fixed; bottom: 24px; right: 24px;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--accent); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(26,92,58,0.45);
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
  z-index: 99998;
}
#hcb-fab:hover { transform: scale(1.1); }
#hcb-fab .i-chat  { display: block; }
#hcb-fab .i-close { display: none; }
#hcb-fab.open .i-chat  { display: none; }
#hcb-fab.open .i-close { display: block; }

/* ── FLOATING MODE: PANEL ── */
#hcb-root[data-mode="float"] #hcb-panel {
  position: fixed; bottom: 96px; right: 24px;
  width: 390px; max-width: calc(100vw - 32px);
  height: 560px; max-height: calc(100vh - 112px);
  border-radius: 20px;
  box-shadow: var(--shadow);
  transform: translateY(18px) scale(0.95);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
  z-index: 99997;
}
#hcb-root[data-mode="float"] #hcb-panel.open {
  transform: translateY(0) scale(1);
  opacity: 1;
  pointer-events: all;
}

/* ── INLINE MODE: PANEL fills its container ── */
#hcb-root[data-mode="inline"] {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}
#hcb-root[data-mode="inline"] #hcb-panel {
  position: relative;
  width: 100%; height: 100%;
  border-radius: 16px;
  box-shadow: var(--shadow);
  transform: none;
  opacity: 1;
  pointer-events: all;
  flex: 1;
}

/* ── SHARED PANEL STYLES ── */
#hcb-panel {
  background: var(--bg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── HEADER ── */
#hcb-header {
  background: var(--accent); padding: 0.9rem 1.1rem;
  display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
}
.hcb-av {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; flex-shrink: 0;
}
#hcb-header .hcb-title { font-family: 'Lora',serif; color:#fff; font-size:0.9375rem; font-weight:600; }
#hcb-header .hcb-sub   { color:rgba(255,255,255,0.7); font-family:'Source Sans 3',sans-serif; font-size:0.72rem; margin-top:0.1rem; }

/* Close button — hidden in inline mode */
.hcb-xbtn {
  margin-left: auto; background: rgba(255,255,255,0.14);
  border: none; border-radius: 7px; width: 28px; height: 28px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0; transition: background 0.15s;
}
.hcb-xbtn:hover { background: rgba(255,255,255,0.28); }
#hcb-root[data-mode="inline"] .hcb-xbtn { display: none; }

/* ── MESSAGES ── */
#hcb-msgs {
  flex: 1; overflow-y: auto; padding: 1rem 0.85rem;
  display: flex; flex-direction: column; gap: 0.65rem;
  background: var(--surface);
}
#hcb-msgs::-webkit-scrollbar { width: 4px; }
#hcb-msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

.hcb-msg { display: flex; gap: 0.55rem; max-width: 88%; animation: hcbIn 0.2s ease; }
@keyframes hcbIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
.hcb-msg.user { align-self: flex-end; flex-direction: row-reverse; }
.hcb-msg.bot  { align-self: flex-start; }

.hcb-mav {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; margin-top: 3px;
}
.hcb-msg.bot  .hcb-mav { background: var(--accent); color: #fff; }
.hcb-msg.user .hcb-mav { background: var(--surface2); color: var(--muted); }

.hcb-bub {
  padding: 0.55rem 0.85rem; border-radius: 14px;
  font-family: 'Source Sans 3',sans-serif; font-size: 0.875rem; line-height: 1.55;
  white-space: pre-wrap; word-break: break-word;
}
.hcb-msg.bot  .hcb-bub { background: var(--bot-bg);  color: var(--bot-text);  border-bottom-left-radius:  4px; }
.hcb-msg.user .hcb-bub { background: var(--user-bg); color: var(--user-text); border-bottom-right-radius: 4px; }

/* ── TYPING INDICATOR ── */
.hcb-typing { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
.hcb-typing span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--muted);
  animation: hcbBounce 1.2s ease infinite;
}
.hcb-typing span:nth-child(2) { animation-delay: 0.18s; }
.hcb-typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes hcbBounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }

/* ── SUGGESTION CHIPS ── */
#hcb-chips {
  padding: 0 0.85rem 0.6rem; background: var(--surface);
  display: flex; gap: 0.45rem; flex-wrap: wrap;
}
.hcb-chip {
  background: var(--bg); border: 1px solid var(--border); border-radius: 99px;
  padding: 0.25rem 0.7rem; font-family: 'Source Sans 3',sans-serif; font-size: 0.73rem;
  color: var(--accent); cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.hcb-chip:hover { background: var(--accent2); border-color: var(--accent); }

/* ── INPUT ROW ── */
#hcb-input-row {
  display: flex; gap: 0.45rem; padding: 0.75rem 0.85rem;
  background: var(--bg); border-top: 1px solid var(--border); flex-shrink: 0;
}
#hcb-input {
  flex: 1; background: var(--surface); border: 1px solid var(--border);
  border-radius: 11px; color: var(--text);
  font-family: 'Source Sans 3',sans-serif; font-size: 0.875rem;
  padding: 0.55rem 0.8rem; outline: none; resize: none;
  max-height: 120px; line-height: 1.45; transition: border-color 0.15s;
}
#hcb-input:focus { border-color: var(--accent); }
#hcb-input::placeholder { color: var(--muted); }
#hcb-send {
  background: var(--accent); border: none; border-radius: 11px;
  width: 38px; height: 38px; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; align-self: flex-end;
  transition: opacity 0.15s;
}
#hcb-send:hover   { opacity: 0.85; }
#hcb-send:disabled { opacity: 0.38; cursor: not-allowed; }

/* ── FOOTER ── */
#hcb-footer {
  padding: 0.4rem 0.85rem 0.5rem; text-align: center;
  font-family: 'Source Sans 3',sans-serif; font-size: 0.68rem;
  color: var(--muted); background: var(--bg); border-top: 1px solid var(--border);
}
`;

  const CHIPS = [
    'How many units are affordable at 30% AMI in Minneapolis?',
    'Which county has the most affordable housing?',
    'How many senior housing properties are in Minnesota?',
    'What funding programs support affordable housing here?',
    'Which properties have affordability expiring soon?',
  ];

  const WELCOME = `Hello! I can help you explore Minnesota's affordable housing data.\n\nYou can ask me things like:\n• How many units are affordable at 30% AMI in Minneapolis?\n• Which county has the most affordable housing?\n• Are there properties expiring soon in Hennepin County?\n\nWhat would you like to know?`;

  // ── INJECT STYLES ──────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── BUILD ROOT ─────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'hcb-root';
  root.setAttribute('data-theme', THEME);
  root.setAttribute('data-mode', INLINE ? 'inline' : 'float');

  // Shared panel HTML (same for both modes)
  const panelHTML = `
    <div id="hcb-panel" role="${INLINE ? 'region' : 'dialog'}" aria-label="${TITLE}">
      <div id="hcb-header">
        <div class="hcb-av">🏠</div>
        <div>
          <div class="hcb-title">${TITLE}</div>
          <div class="hcb-sub">Minnesota affordable housing data</div>
        </div>
        <button class="hcb-xbtn" aria-label="Close">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div id="hcb-msgs"></div>
      <div id="hcb-chips"></div>
      <div id="hcb-input-row">
        <textarea id="hcb-input" rows="1"
          placeholder="Ask about affordable housing in Minnesota…"
          aria-label="Your message"></textarea>
        <button id="hcb-send" aria-label="Send">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
          </svg>
        </button>
      </div>
      <div id="hcb-footer">Data provided by your organization &bull; Powered by AI</div>
    </div>`;

  if (INLINE) {
    // ── INLINE MODE: mount root inside the target div ──────────────────────
    const container = document.getElementById(TARGET);
    if (!container) {
      console.error(`[HousingBot] Target element #${TARGET} not found.`);
      return;
    }
    root.innerHTML = panelHTML;
    // Root fills the container completely
    root.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
    container.appendChild(root);
  } else {
    // ── FLOAT MODE: FAB + panel appended to body ───────────────────────────
    root.innerHTML = `
      <button id="hcb-fab" aria-label="Open housing chatbot">
        <svg class="i-chat" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <svg class="i-close" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      ${panelHTML}`;
    document.body.appendChild(root);
  }

  // ── ELEMENT REFS ───────────────────────────────────────────────────────────
  const panel = document.getElementById('hcb-panel');
  const msgs  = document.getElementById('hcb-msgs');
  const chips = document.getElementById('hcb-chips');
  const input = document.getElementById('hcb-input');
  const send  = document.getElementById('hcb-send');

  // ── STATE ──────────────────────────────────────────────────────────────────
  let isOpen     = INLINE; // inline starts open; float starts closed
  let isLoading  = false;
  let history    = [];
  let chipsShown = false;

  // ── FLOAT MODE: OPEN / CLOSE ───────────────────────────────────────────────
  if (!INLINE) {
    const fab = document.getElementById('hcb-fab');

    function toggle() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      fab.classList.toggle('open', isOpen);
      if (isOpen) {
        input.focus();
        if (msgs.children.length === 0) { addMsg('bot', WELCOME); showChips(); }
      }
    }

    fab.addEventListener('click', toggle);
    root.querySelector('.hcb-xbtn').addEventListener('click', toggle);
  } else {
    // ── INLINE MODE: show welcome immediately ────────────────────────────────
    addMsg('bot', WELCOME);
    showChips();
    // Close button is hidden via CSS, but wire it anyway as a no-op
    root.querySelector('.hcb-xbtn').addEventListener('click', () => {});
  }

  // ── CHIPS ──────────────────────────────────────────────────────────────────
  function showChips() {
    if (chipsShown) return;
    chipsShown = true;
    CHIPS.forEach(q => {
      const c = document.createElement('button');
      c.className = 'hcb-chip';
      c.textContent = q;
      c.addEventListener('click', () => { chips.innerHTML = ''; sendMsg(q); });
      chips.appendChild(c);
    });
  }

  // ── MESSAGES ───────────────────────────────────────────────────────────────
  function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `hcb-msg ${role}`;
    const bub = document.createElement('div');
    bub.className = 'hcb-bub';
    bub.textContent = text;
    const av = document.createElement('div');
    av.className = 'hcb-mav';
    av.textContent = role === 'bot' ? '🏠' : '👤';
    wrap.appendChild(av);
    wrap.appendChild(bub);
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    return wrap;
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'hcb-msg bot';
    wrap.id = 'hcb-typing';
    wrap.innerHTML = `<div class="hcb-mav">🏠</div>
      <div class="hcb-bub"><div class="hcb-typing"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() { document.getElementById('hcb-typing')?.remove(); }

  // ── SEND ───────────────────────────────────────────────────────────────────
  async function sendMsg(text) {
    text = text.trim();
    if (!text || isLoading) return;

    chips.innerHTML = '';
    addMsg('user', text);
    input.value = '';
    input.style.height = 'auto';
    history.push({ role: 'user', content: text });

    isLoading = true;
    send.disabled = true;
    addTyping();

    try {
      const res = await fetch(`${WORKER}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-12) }),
      });
      const data = await res.json();
      removeTyping();
      const reply = data.reply || 'Sorry, I had trouble generating a response. Please try again.';
      addMsg('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (e) {
      removeTyping();
      addMsg('bot', "I'm having trouble connecting right now. Please try again in a moment.");
    } finally {
      isLoading = false;
      send.disabled = false;
      input.focus();
    }
  }

  // ── INPUT EVENTS ───────────────────────────────────────────────────────────
  send.addEventListener('click', () => sendMsg(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input.value); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

})();
