// ── Config ──────────────────────────────────────────────────────────
const SYMBOL = 'BTCUSDT';
const BASE_URL = 'https://fapi.binance.com';
const EMA_PERIOD = 26;
const TIMEFRAMES = ['4h', '1d'];
const POLL_MS = { '4h': 30_000, '1d': 60_000 }; // check every 30s / 60s
const CANDLE_LIMIT = 60; // enough history for EMA warmup + chart

// ── State ───────────────────────────────────────────────────────────
const state = {
  notificationsEnabled: false,
  soundEnabled: true,
  lastSignal: { '4h': null, '1d': null },
  alerts: JSON.parse(localStorage.getItem('ema26_alerts') || '[]'),
  previousPrice: null,
};

// ── DOM refs ────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const livePrice = $('#live-price');
const connDot = $('#connection-status');
const btnNotify = $('#btn-notify');
const btnSound = $('#btn-sound');
const lastUpdate = $('#last-update');
const alertsList = $('#alerts-list');
const alertAudio = $('#alert-sound');

// ── EMA calculation ─────────────────────────────────────────────────
function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const ema = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

// ── Binance Futures API ─────────────────────────────────────────────
async function fetchCandles(tf) {
  const url = `${BASE_URL}/fapi/v1/klines?symbol=${SYMBOL}&interval=${tf}&limit=${CANDLE_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return raw.map((c) => ({
    time: c[0],
    open: +c[1],
    high: +c[2],
    low: +c[3],
    close: +c[4],
    isClosed: c[6] < Date.now(), // closeTime < now means candle is closed
  }));
}

async function fetchPrice() {
  const url = `${BASE_URL}/fapi/v1/ticker/price?symbol=${SYMBOL}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return +data.price;
}

// ── Format helpers ──────────────────────────────────────────────────
const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDiff = (n) => (n >= 0 ? '+' : '') + fmt(n);
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const nowStr = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ── Mini chart drawing ──────────────────────────────────────────────
function drawChart(canvasId, candles, emaValues) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;
  ctx.clearRect(0, 0, W, H);

  // Use last 40 candles for chart
  const chartLen = Math.min(40, candles.length);
  const c = candles.slice(-chartLen);
  const e = emaValues.slice(-chartLen);

  const allVals = c.flatMap((x) => [x.high, x.low]).concat(e);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  const yOf = (v) => H - ((v - min) / range) * (H - 8) - 4;
  const barW = Math.max(1, (W / chartLen) * 0.6);
  const gap = W / chartLen;

  // Candles
  c.forEach((candle, i) => {
    const x = i * gap + gap / 2;
    const isGreen = candle.close >= candle.open;
    ctx.strokeStyle = isGreen ? '#3fb950' : '#f85149';
    ctx.fillStyle = isGreen ? '#3fb950' : '#f85149';

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, yOf(candle.high));
    ctx.lineTo(x, yOf(candle.low));
    ctx.lineWidth = 1;
    ctx.stroke();

    // Body
    const top = yOf(Math.max(candle.open, candle.close));
    const bot = yOf(Math.min(candle.open, candle.close));
    const bodyH = Math.max(1, bot - top);
    ctx.fillRect(x - barW / 2, top, barW, bodyH);
  });

  // EMA line
  ctx.beginPath();
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1.5;
  e.forEach((v, i) => {
    const x = i * gap + gap / 2;
    const y = yOf(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// ── Notifications ───────────────────────────────────────────────────
function sendNotification(title, body) {
  // In-app alert log
  addAlertEntry(body);

  // Sound
  if (state.soundEnabled) {
    alertAudio.currentTime = 0;
    alertAudio.play().catch(() => {});
  }

  // Browser notification
  if (state.notificationsEnabled && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">₿</text></svg>',
      vibrate: [200, 100, 200],
      tag: title, // deduplicate
    });
  }
}

function addAlertEntry(text) {
  const isAbove = text.includes('ABOVE');
  const entry = { text, time: Date.now(), type: isAbove ? 'green' : 'red' };
  state.alerts.unshift(entry);
  state.alerts = state.alerts.slice(0, 50); // keep last 50
  localStorage.setItem('ema26_alerts', JSON.stringify(state.alerts));
  renderAlerts();
}

function renderAlerts() {
  if (state.alerts.length === 0) {
    alertsList.innerHTML = '<p class="empty-state">No alerts yet. Monitoring...</p>';
    return;
  }
  alertsList.innerHTML = state.alerts
    .map(
      (a) => `
    <div class="alert-item">
      <span class="dot ${a.type}"></span>
      <span>${a.text}</span>
      <span class="time">${fmtTime(a.time)}</span>
    </div>`
    )
    .join('');
}

// ── Core update loop ────────────────────────────────────────────────
async function updateTimeframe(tf) {
  try {
    const candles = await fetchCandles(tf);
    const closes = candles.map((c) => c.close);
    const emaValues = calcEMA(closes, EMA_PERIOD);

    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const currentEMA = emaValues[emaValues.length - 1];
    const prevEMA = emaValues[emaValues.length - 2];

    const diff = lastCandle.close - currentEMA;
    const diffPct = (diff / currentEMA) * 100;
    const isAbove = lastCandle.close > currentEMA;

    // Update DOM
    const sfx = tf.replace(' ', '');
    $(`#close-${sfx}`).textContent = fmt(lastCandle.close);
    $(`#ema-${sfx}`).textContent = fmt(currentEMA);

    const diffEl = $(`#diff-${sfx}`);
    diffEl.textContent = `${fmtDiff(diff)} (${fmtPct(diffPct)})`;
    diffEl.className = `value ${diff >= 0 ? 'positive' : 'negative'}`;

    const sigEl = $(`#signal-${sfx}`);
    sigEl.textContent = isAbove ? 'ABOVE EMA26' : 'BELOW EMA26';
    sigEl.className = `signal ${isAbove ? 'above' : 'below'}`;

    const card = $(`#card-${sfx}`);
    card.className = `card ${isAbove ? 'bullish' : 'bearish'}`;

    // Detect crossover — only on closed candles
    const prevSignal = state.lastSignal[tf];
    const prevAbove = prevCandle.close > prevEMA;
    const currentSignal = isAbove ? 'above' : 'below';

    // Find last crossover candle for display
    let crossIdx = -1;
    for (let i = emaValues.length - 2; i >= 1; i--) {
      const wasAbove = candles[i - 1].close > emaValues[i - 1];
      const nowAbove = candles[i].close > emaValues[i];
      if (wasAbove !== nowAbove) {
        crossIdx = i;
        break;
      }
    }
    $(`#cross-${sfx}`).textContent = crossIdx >= 0 ? fmtTime(candles[crossIdx].time) : '--';

    // Fire alert on signal change (only after initial load)
    if (prevSignal !== null && prevSignal !== currentSignal) {
      const dir = isAbove ? 'ABOVE' : 'BELOW';
      const msg = `[${tf.toUpperCase()}] BTC closed ${dir} EMA26 at $${fmt(lastCandle.close)}`;
      sendNotification(`BTC ${tf.toUpperCase()} EMA26 Cross`, msg);
    }
    state.lastSignal[tf] = currentSignal;

    // Draw chart
    drawChart(`chart-${sfx}`, candles, emaValues);

    connDot.className = 'status-dot connected';
  } catch (err) {
    console.error(`Error updating ${tf}:`, err);
    connDot.className = 'status-dot';
  }
}

async function updatePrice() {
  try {
    const price = await fetchPrice();
    const prev = state.previousPrice;

    livePrice.textContent = '$' + fmt(price);

    if (prev !== null) {
      livePrice.classList.remove('flash-up', 'flash-down');
      void livePrice.offsetWidth; // force reflow
      livePrice.classList.add(price >= prev ? 'flash-up' : 'flash-down');
    }
    state.previousPrice = price;
    lastUpdate.textContent = 'Updated ' + nowStr();
  } catch (err) {
    console.error('Price fetch error:', err);
  }
}

// ── Init ────────────────────────────────────────────────────────────
async function init() {
  renderAlerts();

  // Initial fetch
  await updatePrice();
  for (const tf of TIMEFRAMES) {
    await updateTimeframe(tf);
  }

  // Polling loops
  setInterval(updatePrice, 5_000);
  setInterval(() => updateTimeframe('4h'), POLL_MS['4h']);
  setInterval(() => updateTimeframe('1d'), POLL_MS['1d']);

  // Notification button
  btnNotify.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      alert('Notifications not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    state.notificationsEnabled = perm === 'granted';
    updateNotifyBtn();
  });

  // Sound toggle
  btnSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    btnSound.textContent = `Sound: ${state.soundEnabled ? 'ON' : 'OFF'}`;
    btnSound.classList.toggle('enabled', state.soundEnabled);
  });

  updateNotifyBtn();

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function updateNotifyBtn() {
  if ('Notification' in window && Notification.permission === 'granted') {
    state.notificationsEnabled = true;
    btnNotify.textContent = 'Notifications ON';
    btnNotify.classList.add('enabled');
  } else {
    btnNotify.textContent = 'Enable Notifications';
    btnNotify.classList.remove('enabled');
  }
}

init();
