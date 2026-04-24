/**
 * STREAMS Affordable Housing Chatbot Widget — HousingLink Branded
 *
 * Supports two display modes:
 *
 * ── MODE 1: FLOATING BUTTON (default) ──────────────────────────────────────
 *
 *   <script
 *     src="https://your-host.com/housing-chatbot-widget.js"
 *     data-worker="https://housing-chatbot.yourname.workers.dev"
 *     data-title="Affordable Housing Assistant"
 *     data-theme="light">
 *   </script>
 *
 * ── MODE 2: INLINE EMBED ───────────────────────────────────────────────────
 *
 *   <div id="housing-chat" style="height: 600px;"></div>
 *
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
 *   data-mode     (optional) "inline" to embed in a div. Default: floating button
 *   data-target   (required when data-mode="inline") ID of the container div
 */
(function () {
  'use strict';

  const script = document.currentScript;
  const WORKER = (script.getAttribute('data-worker') || '').replace(/\/$/, '');
  const TITLE  = script.getAttribute('data-title')  || 'Affordable Housing Assistant';
  const THEME  = script.getAttribute('data-theme')  || 'light';
  const MODE   = script.getAttribute('data-mode')   || 'float';
  const TARGET = script.getAttribute('data-target') || '';

  if (!WORKER) { console.error('[HousingBot] data-worker is required.'); return; }
  if (MODE === 'inline' && !TARGET) { console.error('[HousingBot] data-target is required when data-mode="inline".'); return; }
  if (document.getElementById('hcb-root')) return;

  const INLINE = MODE === 'inline';

  // ── STYLES ──────────────────────────────────────────────────────────────────
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600&display=swap');

/* ── THEME VARIABLES ── */
#hcb-root[data-theme="light"] {
  --bg:          #ffffff;
  --surface:     #f2f9fa;
  --surface2:    #e0f0f2;
  --border:      #b8dde1;
  --accent:      #008c99;
  --accent-dark: #006d78;
  --accent2:     rgba(0,140,153,0.09);
  --accent-blue: #0073ae;
  --text:        #1a2e30;
  --muted:       #5a7a7d;
  --user-bg:     #008c99;
  --user-text:   #ffffff;
  --bot-bg:      #e8f5f6;
  --bot-text:    #1a2e30;
  --shadow:      0 12px 48px rgba(0,140,153,0.15), 0 2px 8px rgba(0,0,0,0.08);
  --header-grad: linear-gradient(135deg, #008c99 0%, #0073ae 100%);
}
#hcb-root[data-theme="dark"] {
  --bg:          #0d1e20;
  --surface:     #122628;
  --surface2:    #1a3335;
  --border:      #1f4044;
  --accent:      #00b8c8;
  --accent-dark: #008c99;
  --accent2:     rgba(0,184,200,0.1);
  --accent-blue: #2196c8;
  --text:        #d8f0f2;
  --muted:       #6a9a9d;
  --user-bg:     #006d78;
  --user-text:   #e8f8f9;
  --bot-bg:      #1a3335;
  --bot-text:    #d8f0f2;
  --shadow:      0 12px 48px rgba(0,0,0,0.5);
  --header-grad: linear-gradient(135deg, #006d78 0%, #005580 100%);
}

/* ── FAB BUTTON ── */
#hcb-fab {
  position: fixed; bottom: 24px; right: 24px;
  width: 58px; height: 58px; border-radius: 50%;
  background: var(--header-grad);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(0,140,153,0.5);
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
  z-index: 99998;
}
#hcb-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,140,153,0.6); }
#hcb-fab .i-chat  { display: block; }
#hcb-fab .i-close { display: none; }
#hcb-fab.open .i-chat  { display: none; }
#hcb-fab.open .i-close { display: block; }

/* ── FLOATING PANEL ── */
#hcb-root[data-mode="float"] #hcb-panel {
  position: fixed; bottom: 96px; right: 24px;
  width: 400px; max-width: calc(100vw - 32px);
  height: 580px; max-height: calc(100vh - 112px);
  border-radius: 20px;
  box-shadow: var(--shadow);
  transform: translateY(18px) scale(0.95);
  opacity: 0; pointer-events: none;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
  z-index: 99997;
}
#hcb-root[data-mode="float"] #hcb-panel.open {
  transform: translateY(0) scale(1);
  opacity: 1; pointer-events: all;
}

/* ── INLINE PANEL ── */
#hcb-root[data-mode="inline"] {
  display: flex; flex-direction: column;
  height: 100%; min-height: 400px;
}
#hcb-root[data-mode="inline"] #hcb-panel {
  position: relative; width: 100%; height: 100%;
  border-radius: 16px; box-shadow: var(--shadow);
  transform: none; opacity: 1; pointer-events: all; flex: 1;
}

/* ── SHARED PANEL ── */
#hcb-panel {
  background: var(--surface); border: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden;
}

/* ── HEADER ── */
#hcb-header {
  background: var(--header-grad);
  padding: 1rem 1.1rem;
  display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
  position: relative;
}
#hcb-header::after {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}
.hcb-av {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(255,255,255,0.22);
  border: 1px solid rgba(255,255,255,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; flex-shrink: 0;
  position: relative; z-index: 1;
}
.hcb-header-text { position: relative; z-index: 1; }
.hcb-title {
  font-family: 'Montserrat', sans-serif;
  color: #fff; font-size: 0.9375rem; font-weight: 700;
  letter-spacing: 0.01em;
}
.hcb-sub {
  color: rgba(255,255,255,0.78);
  font-family: 'Open Sans', sans-serif;
  font-size: 0.72rem; margin-top: 0.1rem;
}
.hcb-xbtn {
  margin-left: auto; background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px; width: 30px; height: 30px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0; transition: background 0.15s;
  position: relative; z-index: 1;
}
.hcb-xbtn:hover { background: rgba(255,255,255,0.28); }
#hcb-root[data-mode="inline"] .hcb-xbtn { display: none; }

/* ── MESSAGES ── */
#hcb-msgs {
  flex: 1; overflow-y: auto; padding: 1rem 0.9rem;
  display: flex; flex-direction: column; gap: 0.7rem;
  background: var(--surface);
  min-height: 0;
}
#hcb-msgs::-webkit-scrollbar { width: 4px; }
#hcb-msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

.hcb-msg { display: flex; gap: 0.55rem; max-width: 90%; animation: hcbIn 0.2s ease; }
@keyframes hcbIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
.hcb-msg.user { align-self: flex-end; flex-direction: row-reverse; }
.hcb-msg.bot  { align-self: flex-start; }

.hcb-mav {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; margin-top: 3px;
}
.hcb-msg.bot  .hcb-mav { background: var(--accent); color: #fff; }
.hcb-msg.user .hcb-mav { background: var(--surface2); color: var(--muted); }

.hcb-bub {
  padding: 0.6rem 0.9rem; border-radius: 14px;
  font-family: 'Open Sans', sans-serif; font-size: 0.875rem; line-height: 1.6;
  white-space: pre-wrap; word-break: break-word;
}
.hcb-msg.bot  .hcb-bub {
  background: var(--bot-bg); color: var(--bot-text);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border);
}
.hcb-msg.bot .hcb-bub a {
  color: var(--accent); text-decoration: underline;
  word-break: break-all;
}
.hcb-msg.bot .hcb-bub a:hover { opacity: 0.8; }
.hcb-feedback { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding-left: 36px; }
.hcb-feedback button {
  background: none; border: 1px solid var(--border); border-radius: 4px;
  cursor: pointer; font-size: 14px; padding: 2px 7px; color: var(--muted);
  transition: all 0.15s;
}
.hcb-feedback button:hover { border-color: var(--accent); color: var(--accent); }
.hcb-feedback button.selected-up { background: #e6f4ea; border-color: #2e7d32; color: #2e7d32; }
.hcb-feedback button.selected-down { background: #fdecea; border-color: #c62828; color: #c62828; }
.hcb-feedback button:disabled { cursor: default; opacity: 0.5; }
.hcb-feedback-note { font-size: 11px; color: var(--muted); margin-left: 4px; }
.hcb-feedback-comment { margin-top: 6px; padding-left: 36px; display: flex; gap: 6px; }
.hcb-feedback-comment textarea {
  flex: 1; font-size: 12px; border: 1px solid var(--border); border-radius: 4px;
  padding: 4px 7px; resize: none; font-family: inherit; color: var(--text);
  background: var(--bg);
}
.hcb-feedback-comment button {
  background: var(--accent); color: #fff; border: none; border-radius: 4px;
  padding: 4px 10px; cursor: pointer; font-size: 12px; white-space: nowrap;
}
.hcb-feedback-comment button:hover { opacity: 0.85; }
.hcb-msg.user .hcb-bub {
  background: var(--user-bg); color: var(--user-text);
  border-bottom-right-radius: 4px;
}

/* ── TYPING INDICATOR ── */
.hcb-typing { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
.hcb-typing span {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent); opacity: 0.6;
  animation: hcbBounce 1.2s ease infinite;
}
.hcb-typing span:nth-child(2) { animation-delay: 0.18s; }
.hcb-typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes hcbBounce { 0%,60%,100% { transform:translateY(0); opacity:0.6; } 30% { transform:translateY(-6px); opacity:1; } }

/* ── SUGGESTION CHIPS ── */
#hcb-chips-bar {
  display: flex; gap: 0.4rem; flex-wrap: wrap;
  padding: 0.4rem 0.9rem 0.7rem;
  background: var(--surface);
  flex-shrink: 0;
}
.hcb-chip {
  background: var(--bg); border: 1px solid var(--accent);
  border-radius: 99px; padding: 0.28rem 0.75rem;
  font-family: 'Open Sans', sans-serif; font-size: 0.72rem; font-weight: 500;
  color: var(--accent); cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.hcb-chip:hover { background: var(--accent); color: #fff; }

/* ── INPUT ROW ── */
#hcb-input-row {
  display: flex; gap: 0.45rem; padding: 0.5rem 0.9rem 0.25rem;
  background: var(--surface); flex-shrink: 0;
}
#hcb-input {
  flex: 1; background: var(--bg); border: 1px solid var(--border);
  border-radius: 12px; color: var(--text);
  font-family: 'Open Sans', sans-serif; font-size: 0.875rem;
  padding: 0.55rem 0.85rem; outline: none; resize: none;
  min-height: 60px; max-height: 240px; line-height: 1.45; transition: border-color 0.15s, box-shadow 0.15s;
}
#hcb-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0,140,153,0.12);
}
#hcb-input::placeholder { color: var(--muted); }
#hcb-send {
  background: var(--header-grad); border: none; border-radius: 12px;
  width: 40px; height: 40px; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; align-self: flex-end; margin-bottom: 2px;
  transition: opacity 0.15s, transform 0.15s;
}
#hcb-send:hover   { opacity: 0.88; transform: scale(1.05); }
#hcb-send:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

/* ── FOOTER ── */
#hcb-footer {
  padding: 0.4rem 0.9rem 0.5rem; text-align: center;
  font-family: 'Open Sans', sans-serif; font-size: 0.67rem;
  color: var(--muted); background: var(--surface);
  border-top: 1px solid var(--border);
}
#hcb-footer a { color: var(--accent); text-decoration: none; }
#hcb-footer a:hover { text-decoration: underline; }

/* ── MOBILE RESPONSIVE ── */
@media (max-width: 480px) {
  #hcb-root[data-mode="float"] #hcb-panel {
    width: calc(100vw - 16px) !important;
    height: calc(100vh - 96px) !important;
    right: 8px !important;
    bottom: 74px !important;
    border-radius: 16px !important;
  }
  #hcb-fab {
    bottom: 16px !important;
    right: 16px !important;
    width: 52px !important;
    height: 52px !important;
  }
  .hcb-chips-row {
    padding: 4px 0 2px 0 !important;
  }
  .hcb-chip {
    font-size: 0.7rem !important;
    padding: 0.25rem 0.6rem !important;
  }
  #hcb-input-row {
    padding: 0.6rem 0.7rem !important;
  }
  #hcb-input {
    font-size: 16px !important; /* prevents iOS zoom on focus */
  }
  .hcb-bub {
    font-size: 0.85rem !important;
  }
  #hcb-msgs {
    padding: 0.75rem 0.7rem !important;
  }
}
`;

  // ── CONTENT ──────────────────────────────────────────────────────────────────
 const WELCOME = `Hello! I can help you understand the stock of affordable housing in Minnesota from HousingLink's Streams database. Streams tracks physical properties with long-term affordability commitments, including:

• Low Income Housing Tax Credit (LIHTC)
• Project Based Section 8 
• Public Housing, RH 515, HOME, Section 202, and 4D

Want info on a specific property? Sharing the address is most reliable. (Note: I am an AI in training and can make mistakes.)`;

  const CHIPS = [
    'What is the funding of Westminster Place in St Paul?',
    'How many units are affordable at 30% AMI in Minneapolis?',
    'Compare affordable housing in Minneapolis and St Paul',
    'Which properties in Duluth have affordability expiring in the next 2 years?',
    'Provide an overview of affordable housing in Bloomington.',
    'How much affordable housing is in Minneapolis Ward 4?',
  ];

  // ── INJECT STYLES ─────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── BUILD ROOT ────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'hcb-root';
  root.setAttribute('data-theme', THEME);
  root.setAttribute('data-mode', INLINE ? 'inline' : 'float');

  const panelHTML = `
    <div id="hcb-panel" role="${INLINE ? 'region' : 'dialog'}" aria-label="${TITLE}">
      <div id="hcb-header">
        <div class="hcb-av">🏠</div>
        <div class="hcb-header-text">
          <div class="hcb-title">${TITLE}</div>
          <div class="hcb-sub">HousingLink Streams Data</div>
        </div>
        <button class="hcb-xbtn" aria-label="Close">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div id="hcb-msgs"></div>
      <div id="hcb-input-row">
        <textarea id="hcb-input" rows="3"
          placeholder="Ask about affordable housing in Minnesota…"
          aria-label="Your message"></textarea>
        <button id="hcb-send" aria-label="Send">
          <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
          </svg>
        </button>
      </div>
      <div id="hcb-chips-bar"></div>
      <div id="hcb-footer">
        Powered by <a href="https://housinglink.org" target="_blank">HousingLink</a> Streams data &bull; AI-assisted &bull; Questions? <a href="mailto:jdye@housinglink.org">jdye@housinglink.org</a>
      </div>
    </div>`;

  if (INLINE) {
    root.innerHTML = panelHTML;
    root.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
    const container = document.getElementById(TARGET);
    if (!container) { console.error(`[HousingBot] Target element #${TARGET} not found.`); return; }
    container.appendChild(root);
  } else {
    root.innerHTML = `
      <button id="hcb-fab" aria-label="Open housing chatbot">
        <svg class="i-chat" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2">
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

  // ── ELEMENT REFS ──────────────────────────────────────────────────────────
  const panel = document.getElementById('hcb-panel');
  const msgs  = document.getElementById('hcb-msgs');
  const input = document.getElementById('hcb-input');
  const send  = document.getElementById('hcb-send');

  // ── STATE ─────────────────────────────────────────────────────────────────
  let isOpen     = INLINE;
  let isLoading  = false;
  let history    = [];
  let chipsShown = false;
  let chipsRow   = null;

  // ── PANEL AUTO-RESIZE — shrink to content, expand as conversation grows ─────
  function resizePanel() {
    if (INLINE) {
      // For inline mode: set msgs max-height so panel doesn't overflow container
      const panelEl = document.getElementById('hcb-panel');
      const inputRow = document.getElementById('hcb-input-row');
      const chipsBarEl = document.getElementById('hcb-chips-bar');
      const footer = document.getElementById('hcb-footer');
      const header = document.getElementById('hcb-header');
      if (!panelEl || !inputRow || !chipsBarEl || !footer || !header) return;
      const fixedHeight = header.offsetHeight + inputRow.offsetHeight + chipsBarEl.offsetHeight + footer.offsetHeight;
      const containerHeight = panelEl.parentElement ? panelEl.parentElement.offsetHeight : window.innerHeight;
      const maxMsgsHeight = containerHeight - fixedHeight - 8;
      msgs.style.maxHeight = maxMsgsHeight + 'px';
    }
  }

  // ── MOBILE SIZING — applied via JS so it overrides any host-page CSS ────────
  function applyMobileStyles() {
    if (INLINE) return;
    const fab = document.getElementById('hcb-fab');
    const isMobile = window.innerWidth <= 480;
    if (isMobile) {
      const margin = 8;
      const w = window.innerWidth - margin * 2;
      const h = window.innerHeight - 90;
      panel.style.width  = w + 'px';
      panel.style.height = h + 'px';
      panel.style.right  = margin + 'px';
      panel.style.bottom = '74px';
      panel.style.borderRadius = '16px';
      if (fab) {
        fab.style.bottom = '16px';
        fab.style.right  = '16px';
        fab.style.width  = '52px';
        fab.style.height = '52px';
      }
      input.style.fontSize = '16px'; // prevents iOS zoom
    } else {
      panel.style.width  = '';
      panel.style.height = '';
      panel.style.right  = '';
      panel.style.bottom = '';
      panel.style.borderRadius = '';
      if (fab) {
        fab.style.bottom = '';
        fab.style.right  = '';
        fab.style.width  = '';
        fab.style.height = '';
      }
      input.style.fontSize = '';
    }
  }
  applyMobileStyles();
  resizePanel();
  window.addEventListener('resize', () => { applyMobileStyles(); resizePanel(); });

  // ── FLOAT: OPEN / CLOSE ───────────────────────────────────────────────────
  // ── CHIPS — rendered in persistent bar below input ───────────────────────
  const chipsBar = document.getElementById('hcb-chips-bar');

  function showChips() {
    if (chipsShown) return;
    chipsShown = true;
    CHIPS.forEach(q => {
      const c = document.createElement('button');
      c.className = 'hcb-chip';
      c.textContent = q;
      c.addEventListener('click', () => { sendMsg(q); });
      chipsBar.appendChild(c);
    });
  }

  function removeChips() {
    // Chips persist — do nothing
  }

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
    addMsg('bot', WELCOME);
    showChips();
    resizePanel();
    root.querySelector('.hcb-xbtn').addEventListener('click', () => {});
  }

  // ── FORMAT TEXT ───────────────────────────────────────────────────────────
  function formatText(text) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(
        /(https?:\/\/[^\s<>"]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;">$1</a>'
      );
  }

  // ── MESSAGES ──────────────────────────────────────────────────────────────
  function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `hcb-msg ${role}`;
    const av = document.createElement('div');
    av.className = 'hcb-mav';
    av.textContent = role === 'bot' ? '🏠' : '👤';
    const bub = document.createElement('div');
    bub.className = 'hcb-bub';
    if (role === 'bot') {
      bub.innerHTML = formatText(text);
    } else {
      bub.textContent = text;
    }
    wrap.appendChild(av);
    wrap.appendChild(bub);
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    resizePanel();
    return wrap;
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'hcb-msg bot'; wrap.id = 'hcb-typing';
    wrap.innerHTML = `<div class="hcb-mav">🏠</div>
      <div class="hcb-bub" style="border:1px solid var(--border)">
        <div class="hcb-typing"><span></span><span></span><span></span></div>
      </div>`;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() { document.getElementById('hcb-typing')?.remove(); }

  // ── FEEDBACK ──────────────────────────────────────────────────────────────
  function addFeedback(question, answer) {
    const wrap = document.createElement('div');
    wrap.className = 'hcb-feedback';
    const upBtn = document.createElement('button');
    upBtn.textContent = '👍'; upBtn.title = 'Helpful';
    const downBtn = document.createElement('button');
    downBtn.textContent = '👎'; downBtn.title = 'Not helpful';
    const note = document.createElement('span');
    note.className = 'hcb-feedback-note';
    note.textContent = 'Was this helpful?';
    wrap.appendChild(upBtn);
    wrap.appendChild(downBtn);
    wrap.appendChild(note);
    msgs.appendChild(wrap);

    async function submitFeedback(rating, comment) {
      try {
        await fetch(`${WORKER}/chat/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, answer, rating, comment: comment || '', timestamp: new Date().toISOString() }),
        });
      } catch (e) { /* silent fail */ }
    }

    upBtn.addEventListener('click', () => {
      upBtn.classList.add('selected-up');
      downBtn.disabled = true; upBtn.disabled = true;
      note.textContent = 'Thanks for your feedback!';
      submitFeedback('thumbs_up', '');
    });

    downBtn.addEventListener('click', () => {
      downBtn.classList.add('selected-down');
      upBtn.disabled = true; downBtn.disabled = true;
      note.textContent = 'Sorry to hear that. Care to tell us more? (optional)';
      const commentWrap = document.createElement('div');
      commentWrap.className = 'hcb-feedback-comment';
      const ta = document.createElement('textarea');
      ta.rows = 2; ta.placeholder = 'What went wrong? (optional)';
      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Send';
      commentWrap.appendChild(ta); commentWrap.appendChild(submitBtn);
      wrap.insertAdjacentElement('afterend', commentWrap);
      msgs.scrollTop = msgs.scrollHeight;
      ta.focus();
      submitBtn.addEventListener('click', () => {
        submitFeedback('thumbs_down', ta.value.trim());
        commentWrap.remove();
        note.textContent = 'Thanks for your feedback!';
      });
    });
  }

  // ── SEND ──────────────────────────────────────────────────────────────────
  async function sendMsg(text) {
    text = text.trim();
    if (!text || isLoading) return;
    addMsg('user', text);
    input.value = '';
    input.style.height = 'auto';
    history.push({ role: 'user', content: text });
    isLoading = true; send.disabled = true;
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
      addFeedback(text, reply);
    } catch (e) {
      removeTyping();
      addMsg('bot', "I'm having trouble connecting right now. Please try again in a moment.");
    } finally {
      isLoading = false; send.disabled = false; input.focus();
    }
  }

  // ── INPUT EVENTS ──────────────────────────────────────────────────────────
  send.addEventListener('click', () => sendMsg(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input.value); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.max(60, Math.min(input.scrollHeight, 240)) + 'px';
  });

})();
