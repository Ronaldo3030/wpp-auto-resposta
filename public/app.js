// ── Estado local ──────────────────────────────────────────────
const state = {
  connected: false,
  phone: null,
  conversations: {}, // jid → row
  selectedJid: null,
};

// ── WebSocket ─────────────────────────────────────────────────
const wsUrl = `ws://${location.host}`;
let ws;

function connectWs() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Buscar estado inicial ao (re)conectar
    fetchConversations();
    fetchAnalytics();
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    switch (msg.type) {
      case "connection":
        handleConnectionEvent(msg.data);
        break;
      case "qr":
        showQr(msg.data.qr);
        break;
      case "message":
        handleIncomingMessage(msg.data);
        fetchAnalytics();
        break;
      case "takeover":
        handleTakeoverEvent(msg.data);
        break;
    }
  };

  ws.onclose = () => setTimeout(connectWs, 2000);
}

// ── Eventos de conexão ────────────────────────────────────────
function handleConnectionEvent({ status, phone }) {
  state.connected = status === "open";
  state.phone = phone || null;

  const dot = document.getElementById("status-dot");
  const label = document.getElementById("status-label");
  const phoneEl = document.getElementById("phone-label");

  dot.className = state.connected ? "connected" : "disconnected";
  label.textContent = state.connected ? "Conectado" : status === "connecting" ? "Reconectando..." : "Desconectado";
  phoneEl.textContent = state.phone ? formatPhone(state.phone) : "";

  if (state.connected) {
    hideQr();
    fetchConversations();
    fetchAnalytics();
  } else if (status !== "connecting") {
    showQrPlaceholder();
  }
}

// ── QR Code ───────────────────────────────────────────────────
function showQr(dataUrl) {
  document.getElementById("qr-panel").style.display = "flex";
  document.getElementById("chat-panel").style.display = "none";
  document.getElementById("empty-state").style.display = "none";

  const placeholder = document.getElementById("qr-placeholder");
  const img = document.getElementById("qr-img");
  placeholder.style.display = "none";
  img.style.display = "block";
  img.src = dataUrl;
}

function showQrPlaceholder() {
  document.getElementById("qr-panel").style.display = "flex";
  document.getElementById("chat-panel").style.display = "none";
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("qr-placeholder").style.display = "flex";
  document.getElementById("qr-img").style.display = "none";
}

function hideQr() {
  document.getElementById("qr-panel").style.display = "none";
  if (!state.selectedJid) {
    document.getElementById("empty-state").style.display = "flex";
  }
}

// ── Conversas ─────────────────────────────────────────────────
async function fetchConversations() {
  try {
    const res = await fetch("/api/conversations");
    const rows = await res.json();
    state.conversations = {};
    rows.forEach((r) => { state.conversations[r.jid] = r; });
    renderConversationList();
  } catch {}
}

function renderConversationList() {
  const list = document.getElementById("conversation-list");
  list.innerHTML = "";

  const sorted = Object.values(state.conversations).sort(
    (a, b) => new Date(b.last_activity) - new Date(a.last_activity)
  );

  if (sorted.length === 0) {
    list.innerHTML = '<div style="padding:16px;color:#64748b;font-size:.8rem">Nenhuma conversa ainda</div>';
    return;
  }

  sorted.forEach((conv) => {
    const el = document.createElement("div");
    el.className = "conv-item" + (conv.jid === state.selectedJid ? " active" : "");
    el.dataset.jid = conv.jid;

    const isHuman = conv.human_takeover === 1;
    const time = timeAgo(conv.last_activity);

    el.innerHTML = `
      <div class="conv-jid">${formatPhone(conv.jid)}</div>
      <div class="conv-meta">
        <span class="badge ${isHuman ? "badge-human" : "badge-bot"}">${isHuman ? "Humano" : "Bot"}</span>
        <span class="conv-time">${time}</span>
      </div>
    `;

    el.addEventListener("click", () => selectConversation(conv.jid));
    list.appendChild(el);
  });
}

async function selectConversation(jid) {
  state.selectedJid = jid;
  renderConversationList();
  await renderChatPanel(jid);
}

async function renderChatPanel(jid) {
  const conv = state.conversations[jid];
  if (!conv) return;

  document.getElementById("qr-panel").style.display = "none";
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("chat-panel").style.display = "flex";
  document.getElementById("chat-panel").style.flexDirection = "column";

  document.getElementById("chat-jid").textContent = formatPhone(jid);

  const isHuman = conv.human_takeover === 1;
  const badge = document.getElementById("chat-badge");
  badge.textContent = isHuman ? "Humano" : "Bot";
  badge.className = "badge " + (isHuman ? "badge-human" : "badge-bot");

  const btn = document.getElementById("takeover-btn");
  updateTakeoverBtn(isHuman);

  // Carregar histórico
  await loadMessages(jid);
}

function updateTakeoverBtn(isHuman) {
  const btn = document.getElementById("takeover-btn");
  if (isHuman) {
    btn.textContent = "Devolver ao Bot";
    btn.className = "bot";
  } else {
    btn.textContent = "Assumir Atendimento";
    btn.className = "human";
  }
}

// ── Mensagens ─────────────────────────────────────────────────
async function loadMessages(jid) {
  try {
    const res = await fetch(`/api/conversations/${encodeURIComponent(jid)}/messages?limit=50`);
    const msgs = await res.json();
    const container = document.getElementById("messages");
    container.innerHTML = "";
    // API retorna DESC; reverter para ASC na tela
    msgs.reverse().forEach((m) => appendMessage(m, false));
    container.scrollTop = container.scrollHeight;
  } catch {}
}

function appendMessage({ direction, body, created_at }, scroll = true) {
  const container = document.getElementById("messages");
  const el = document.createElement("div");
  el.className = "msg " + (direction === "in" ? "msg-in" : "msg-out");
  el.innerHTML = `${escapeHtml(body)}<div class="msg-time">${formatTime(created_at)}</div>`;
  container.appendChild(el);
  if (scroll) container.scrollTop = container.scrollHeight;
}

function handleIncomingMessage(data) {
  if (!state.selectedJid || data.jid !== state.selectedJid) {
    // Só atualiza lista
    fetchConversations();
    return;
  }
  appendMessage(data);
  fetchConversations();
}

// ── Takeover ──────────────────────────────────────────────────
document.getElementById("takeover-btn").addEventListener("click", async () => {
  const jid = state.selectedJid;
  if (!jid) return;
  const conv = state.conversations[jid];
  if (!conv) return;
  const newActive = conv.human_takeover !== 1;

  await fetch(`/api/conversations/${encodeURIComponent(jid)}/takeover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: newActive }),
  });

  conv.human_takeover = newActive ? 1 : 0;
  updateTakeoverBtn(newActive);
  const badge = document.getElementById("chat-badge");
  badge.textContent = newActive ? "Humano" : "Bot";
  badge.className = "badge " + (newActive ? "badge-human" : "badge-bot");
  renderConversationList();
});

function handleTakeoverEvent({ jid, active }) {
  if (state.conversations[jid]) {
    state.conversations[jid].human_takeover = active ? 1 : 0;
  }
  if (state.selectedJid === jid) {
    updateTakeoverBtn(active);
    const badge = document.getElementById("chat-badge");
    badge.textContent = active ? "Humano" : "Bot";
    badge.className = "badge " + (active ? "badge-human" : "badge-bot");
  }
  renderConversationList();
}

// ── Envio de mensagem ─────────────────────────────────────────
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("send-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

async function sendMessage() {
  const jid = state.selectedJid;
  const input = document.getElementById("send-input");
  const text = input.value.trim();
  if (!jid || !text) return;

  input.value = "";
  try {
    await fetch(`/api/conversations/${encodeURIComponent(jid)}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {}
}

// ── Analytics ─────────────────────────────────────────────────
async function fetchAnalytics() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();
    document.getElementById("stat-total").textContent = data.totalConversations;
    document.getElementById("stat-human").textContent = data.humanTakeover;
    document.getElementById("stat-today").textContent = data.messagesToday;
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────
function formatPhone(jid) {
  if (!jid) return "";
  return "+" + jid.replace(/@.+$/, "").replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "$1 ($2) $3-$4");
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Init ──────────────────────────────────────────────────────
connectWs();

// Polling analytics a cada 30s
setInterval(fetchAnalytics, 30000);
// Polling conversas a cada 15s (garante sincronismo)
setInterval(fetchConversations, 15000);
