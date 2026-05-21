(function () {
  const API_BASE = 'https://minidonauts-minidisplay-proxy.minidonauts.workers.dev';
  const MINI_SETTINGS_KEY = 'minidonauts.minidisplay.settings.v2';
  const KDS_STATE_KEY = 'minidonauts.kds.state.v1';
  const URGENT_MS = 10 * 60 * 1000;

  const root = document.querySelector('#kds-root');
  if (!root) return;

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'AstroSpace';
      src: url('https://minidonauts.com/AstroSpace-0Wl3o.otf') format('opentype');
    }

    :root {
      --gold: #fdba44;
      --gold-soft: #ffd889;
      --blue: #0d4f88;
      --ink: #071524;
      --slate: #1a2e40;
      --night: #060a0f;
      --orange: #ff6b35;
      --green: #93f59a;
      --red: #ffb3b3;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--gold);
      font-family: 'AstroSpace', 'Comfortaa', 'Helvetica Neue', Arial, sans-serif;
      background:
        linear-gradient(135deg, rgba(5, 20, 40, 0.94), rgba(11, 55, 96, 0.92)),
        url('https://minidonauts.com/images/space.png');
      background-size: cover;
      background-attachment: fixed;
    }

    .app {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .topbar {
      border-bottom: 3px solid var(--gold);
      background: rgba(4, 20, 39, 0.92);
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      border: 0;
      background: transparent;
      color: var(--gold);
      font: inherit;
      padding: 0;
    }

    .brand img {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      object-fit: cover;
    }

    .title {
      font-size: clamp(1.5rem, 3.2vw, 2.7rem);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }

    .pill {
      border: 2px solid var(--gold);
      border-radius: 999px;
      padding: 8px 14px;
      color: var(--gold-soft);
      background: rgba(5, 23, 43, 0.72);
      font-size: 1.05rem;
      white-space: nowrap;
    }

    .layout {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      padding: 16px;
    }

    .panel {
      border: 2px solid var(--gold);
      border-radius: 20px;
      background: rgba(4, 18, 36, 0.82);
      box-shadow: 0 14px 26px rgba(0, 0, 0, 0.33);
      overflow: hidden;
      min-height: 0;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 2px solid rgba(253, 186, 68, 0.35);
      background: rgba(9, 39, 70, 0.8);
      text-transform: uppercase;
      font-size: 1.2rem;
    }

    .board-sections {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 10px;
      max-height: calc(100vh - 170px);
      overflow: auto;
    }

    .section-title {
      font-size: 1.35rem;
      letter-spacing: 0.02em;
      margin: 8px 6px 2px;
      text-transform: uppercase;
    }

    .section-title.ready { color: var(--gold); }
    .section-title.open { color: #9fc7f2; }
    .section-title.not-here { color: var(--orange); }

    .card {
      border: 2px solid #15314f;
      border-radius: 14px;
      padding: 10px 12px;
      background: rgba(3, 12, 24, 0.74);
      display: grid;
      gap: 5px;
      cursor: pointer;
    }

    .card.ready { border-color: rgba(253, 186, 68, 0.5); }
    .card.not-here { border-color: rgba(255, 107, 53, 0.6); }
    .card.active { outline: 2px solid var(--gold); outline-offset: 1px; }

    .line-1 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .name {
      font-size: clamp(1.6rem, 3vw, 2.5rem);
      line-height: 1;
      color: #fff3cc;
      text-transform: uppercase;
    }

    .meta {
      font-size: 1.05rem;
      color: #a7c5e8;
    }

    .wait {
      font-size: clamp(1.25rem, 2.2vw, 1.8rem);
      color: var(--gold-soft);
      white-space: nowrap;
    }

    .wait.urgent { color: var(--orange); }

    .badge {
      border: 2px solid;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .b-ready { color: var(--gold); border-color: var(--gold); }
    .b-open { color: #8fb8e6; border-color: #385a7f; }
    .b-nh { color: var(--orange); border-color: var(--orange); }

    .detail {
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      min-height: calc(100vh - 170px);
    }

    .detail-head {
      padding: 14px;
      border-bottom: 2px solid rgba(253, 186, 68, 0.35);
      display: grid;
      gap: 8px;
    }

    .detail-name {
      font-size: clamp(2.9rem, 5.2vw, 4.4rem);
      color: #fff3cc;
      text-transform: uppercase;
    }

    .detail-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stat {
      border: 2px solid #315980;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 1rem;
      color: #c4def7;
      background: rgba(5, 20, 38, 0.8);
    }

    .detail-items {
      padding: 14px;
      overflow: auto;
      display: grid;
      gap: 7px;
      color: #f0f5ff;
      align-content: start;
    }

    .item { font-size: 2.05rem; line-height: 1.45; }
    .item.sub { color: #acc5e8; font-size: 1.7rem; padding-left: 24px; }
    .item.note {
      margin-top: 8px;
      border-left: 3px solid var(--gold);
      padding: 6px 0 6px 12px;
      color: var(--gold-soft);
    }

    .actions {
      border-top: 2px solid rgba(253, 186, 68, 0.35);
      padding: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    button.action {
      border: 2px solid var(--gold);
      border-radius: 999px;
      background: transparent;
      color: var(--gold);
      font: inherit;
      padding: 8px 14px;
      cursor: pointer;
      text-transform: uppercase;
      font-size: 1.05rem;
    }

    button.action.primary {
      background: var(--gold);
      color: var(--blue);
      font-weight: 700;
    }

    button.action.warn {
      border-color: var(--orange);
      color: var(--orange);
    }

    .hint {
      font-size: 1.45rem;
      color: #b7d0ee;
      padding: 12px 14px;
    }

    .status {
      font-size: 1rem;
      color: #c6dcf6;
      padding: 0 14px 12px;
      min-height: 1.2em;
    }

    .status.error { color: var(--red); }
    .status.ok { color: var(--green); }

    .empty-board {
      padding: 22px;
      color: #b9d2ee;
      text-align: center;
      font-size: 1.2rem;
    }

    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .board-sections, .detail { max-height: none; min-height: 0; }
      .name { font-size: clamp(1.4rem, 4.8vw, 2rem); }
      .wait { font-size: clamp(1.1rem, 4vw, 1.5rem); }
      .item { font-size: 1.75rem; }
      .item.sub { font-size: 1.45rem; }
    }
  `;
  document.head.appendChild(style);

  const state = {
    orders: [],
    selectedId: '',
    notHereAt: {},
    completedHistory: [],
    selectedHistoryId: '',
    view: 'board',
    status: '',
    statusClass: '',
    lastFetchAt: 0,
    avgWaitMs: null,
    environment: 'sandbox',
    locationId: '',
    pollingMs: 5000,
    pollHandle: null,
  };

  function readMiniSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MINI_SETTINGS_KEY) || '{}');
      return {
        locationId: String(parsed.locationId || '').trim(),
        environment: parsed.environment === 'production' ? 'production' : 'sandbox',
        defaultAvgWaitSec: Number.isFinite(parsed.defaultAvgWaitSec)
          ? Math.max(0, Math.floor(parsed.defaultAvgWaitSec))
          : 154
      };
    } catch (_e) {
      return { locationId: '', environment: 'sandbox', defaultAvgWaitSec: 154 };
    }
  }

  function readKdsState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KDS_STATE_KEY) || '{}');
      return {
        notHereAt: parsed && typeof parsed.notHereAt === 'object' ? parsed.notHereAt : {},
        completedHistory: Array.isArray(parsed?.completedHistory) ? parsed.completedHistory : []
      };
    } catch (_e) {
      return { notHereAt: {}, completedHistory: [] };
    }
  }

  function saveKdsState() {
    localStorage.setItem(KDS_STATE_KEY, JSON.stringify({
      notHereAt: state.notHereAt,
      completedHistory: state.completedHistory
    }));
  }

  function setStatus(text, cls) {
    state.status = text || '';
    state.statusClass = cls || '';
  }

  function fmtWait(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins + 'm ' + String(secs).padStart(2, '0') + 's';
  }

  function fmtAvgWait(ms) {
    if (ms == null || !Number.isFinite(ms)) return '--';
    const totalSecs = Math.max(0, Math.round(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return secs > 0 ? (mins + 'm ' + secs + 's') : (mins + 'm');
  }

  function isUrgent(order) {
    return Date.now() - (order.createdAt || Date.now()) > URGENT_MS;
  }

  function classify(order) {
    if (state.notHereAt[order.id]) return 'not-here';
    return order.fulfillmentState === 'PREPARED' ? 'not-here' : 'open';
  }

  function deriveOrderItems(order) {
    if (Array.isArray(order.itemLines) && order.itemLines.length) {
      return order.itemLines;
    }
    if (Array.isArray(order.line_items) && order.line_items.length) {
      const lines = [];
      order.line_items.forEach(function (item) {
        const qty = Number(item.quantity || 1);
        const name = String(item.name || 'Item').trim();
        lines.push(qty + 'x ' + name);
        (item.modifiers || []).forEach(function (m) {
          lines.push('  + ' + String(m.name || '').trim());
        });
        const note = String(item.note || '').trim();
        if (note) lines.push('  * ' + note);
      });
      return lines;
    }
    if (Array.isArray(order.lineItems) && order.lineItems.length) {
      const lines = [];
      order.lineItems.forEach(function (item) {
        const qty = Number(item.quantity || 1);
        const name = String(item.name || 'Item').trim();
        lines.push(qty + 'x ' + name);
        (item.modifiers || []).forEach(function (m) {
          lines.push('  + ' + String(m.name || '').trim());
        });
      });
      return lines;
    }
    return [];
  }

  function selectedOrder() {
    return state.orders.find(function (o) { return o.id === state.selectedId; }) || null;
  }

  function selectedHistoryOrder() {
    return state.completedHistory.find(function (o) { return o.id === state.selectedHistoryId; }) || null;
  }

  function sortOrders() {
    const notHere = [];
    const open = [];
    state.orders.forEach(function (o) {
      const kind = classify(o);
      if (kind === 'not-here') notHere.push(o);
      else open.push(o);
    });

    function byCreated(a, b) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }

    return {
      notHere: notHere.sort(byCreated),
      open: open.sort(byCreated)
    };
  }

  async function apiPost(path, payload) {
    const resp = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    const body = await resp.json().catch(function () { return null; });
    if (!resp.ok || !(body && body.ok)) {
      const detail = body && body.error ? body.error : ('HTTP ' + resp.status + ' at ' + path);
      throw new Error(detail);
    }
    return body;
  }

  async function fetchOrders() {
    const mini = readMiniSettings();
    state.locationId = mini.locationId;
    state.environment = mini.environment;
    const defaultAvgWaitMs = (mini.defaultAvgWaitSec || 154) * 1000;

    if (!state.locationId) {
      state.orders = [];
      setStatus('Set location in /MiniDisplay settings first.', 'error');
      render();
      return;
    }

    try {
      const body = await apiPost('/square/orders', {
        locationId: state.locationId,
        environment: state.environment
      });

      state.orders = Array.isArray(body.orders) ? body.orders : [];
      const liveAvgWaitMs = body.avgWaitMs != null ? body.avgWaitMs : defaultAvgWaitMs;
      state.avgWaitMs = state.orders.length
        ? Math.max(defaultAvgWaitMs, liveAvgWaitMs)
        : defaultAvgWaitMs;
      state.lastFetchAt = Date.now();

      const liveIds = new Set(state.orders.map(function (o) { return o.id; }));
      Object.keys(state.notHereAt).forEach(function (id) {
        if (!liveIds.has(id)) delete state.notHereAt[id];
      });
      saveKdsState();

      if (!state.selectedId || !liveIds.has(state.selectedId)) {
        state.selectedId = state.orders[0] ? state.orders[0].id : '';
      }

      setStatus('Live from ' + state.environment + ' | ' + state.orders.length + ' visible tickets', 'ok');
    } catch (error) {
      setStatus(error && error.message ? error.message : 'Failed to fetch orders', 'error');
      console.error('[KDS] fetchOrders failed', {
        error: error && error.message ? error.message : String(error),
        apiBase: API_BASE,
        locationId: state.locationId,
        environment: state.environment
      });
    }

    render();
  }

  async function markComplete(orderId) {
    const completedOrder = state.orders.find(function (o) { return o.id === orderId; }) || null;
    if (completedOrder) {
      const now = Date.now();
      state.completedHistory.unshift({
        id: completedOrder.id,
        customerName: completedOrder.customerName || 'Order',
        createdAt: completedOrder.createdAt || now,
        completedAt: now,
        fulfillmentState: completedOrder.fulfillmentState || '',
        itemLines: deriveOrderItems(completedOrder).slice(0, 8),
        noteLines: Array.isArray(completedOrder.noteLines) ? completedOrder.noteLines.slice(0, 4) : []
      });
      state.completedHistory = state.completedHistory.slice(0, 40);
      state.selectedHistoryId = state.completedHistory[0] ? state.completedHistory[0].id : '';
    }
    delete state.notHereAt[orderId];
    state.orders = state.orders.filter(function (o) { return o.id !== orderId; });
    if (state.selectedId === orderId) state.selectedId = state.orders[0] ? state.orders[0].id : '';
    setStatus('Ticket completed.', 'ok');
    saveKdsState();
    render();

    try {
      await apiPost('/square/orders/complete', { orderId: orderId, locationId: state.locationId, environment: state.environment });
    } catch (error) {
      setStatus('Complete API failed (removed locally): ' + (error && error.message ? error.message : String(error)), 'error');
      console.error('[KDS] complete failed', { orderId: orderId, error: String(error) });
    }
    render();
  }

  async function markNotHere(orderId) {
    state.notHereAt[orderId] = Date.now();
    saveKdsState();
    setStatus('Marked as Not Here.', 'ok');
    render();

    try {
      await apiPost('/square/orders/prepared', { orderId: orderId, locationId: state.locationId, environment: state.environment });
    } catch (error) {
      console.warn('[KDS] prepared endpoint unavailable or failed', { orderId: orderId, error: String(error) });
      setStatus('Marked local Not Here. (API prepared update failed)', 'error');
      render();
    }
  }

  async function undoComplete(orderId) {
    const idx = state.completedHistory.findIndex(function (o) { return o.id === orderId; });
    if (idx < 0) return;
    const historyOrder = state.completedHistory[idx];
    const restored = {
      id: historyOrder.id,
      customerName: historyOrder.customerName || 'Order',
      createdAt: historyOrder.createdAt || Date.now(),
      fulfillmentState: 'PROPOSED',
      itemLines: Array.isArray(historyOrder.itemLines) ? historyOrder.itemLines.slice() : [],
      noteLines: Array.isArray(historyOrder.noteLines) ? historyOrder.noteLines.slice() : [],
      line_items: []
    };

    state.completedHistory.splice(idx, 1);
    state.orders = [restored].concat(state.orders.filter(function (o) { return o.id !== orderId; }));
    state.selectedId = restored.id;
    state.view = 'board';
    setStatus('Undo complete: ticket restored to top.', 'ok');
    saveKdsState();
    render();

    try {
      await apiPost('/square/orders/reopen', { orderId: orderId, locationId: state.locationId, environment: state.environment });
    } catch (error) {
      setStatus('Undo API failed (restored locally): ' + (error && error.message ? error.message : String(error)), 'error');
      console.error('[KDS] undo complete failed', { orderId: orderId, error: String(error) });
      render();
    }
  }

  async function createTestOrder() {
    if (state.environment !== 'sandbox') return;
    if (!state.locationId) {
      setStatus('Set location in /MiniDisplay settings first.', 'error');
      render();
      return;
    }
    setStatus('Creating sandbox test order...', '');
    render();
    try {
      await apiPost('/square/create-test-order', { locationId: state.locationId, environment: state.environment });
      setStatus('Sandbox test order created.', 'ok');
      await fetchOrders();
    } catch (error) {
      setStatus('Create test order failed: ' + (error && error.message ? error.message : String(error)), 'error');
      console.error('[KDS] create test order failed', { error: String(error) });
      render();
    }
  }

  function markPickedUp(orderId) {
    delete state.notHereAt[orderId];
    saveKdsState();
    setStatus('Marked picked up (local).', 'ok');
    render();
  }

  function sectionHtml(title, cls, orders) {
    const cards = orders.map(function (o) {
      const waitMs = Date.now() - (o.createdAt || Date.now());
      const waitClass = isUrgent(o) ? 'wait urgent' : 'wait';
      const badgeClass = cls === 'not-here' ? 'b-nh' : 'b-open';
      const badgeText = cls === 'not-here' ? 'not here' : 'open';
      const active = state.selectedId === o.id ? ' active' : '';
      const nhWait = cls === 'not-here' && state.notHereAt[o.id]
        ? 'Pickup wait ' + fmtWait(Date.now() - state.notHereAt[o.id])
        : '';
      return `
        <article class="card ${cls}${active}" data-order-id="${o.id}">
          <div class="line-1">
            <div class="name">${o.customerName || 'Order'}</div>
            <div class="badge ${badgeClass}">${badgeText}</div>
          </div>
          <div class="line-1">
            <div class="meta">${nhWait}</div>
            <div class="${waitClass}">${fmtWait(waitMs)}</div>
          </div>
        </article>`;
    }).join('');

    return `
      <section>
        <h3 class="section-title ${cls}">${title} (${orders.length})</h3>
        ${cards || '<div class="empty-board">No tickets</div>'}
      </section>`;
  }

  function detailHtml(order) {
    if (!order) {
      return `
        <div class="detail">
          <div class="detail-head">
            <div class="detail-name">No Ticket Selected</div>
          </div>
          <div class="hint">Tap a ticket on the board to open details.</div>
          <div class="detail-items"></div>
          <div class="actions"></div>
        </div>`;
    }

    const kind = classify(order);
    const isNotHere = kind === 'not-here';
    const wait = fmtWait(Date.now() - (order.createdAt || Date.now()));
    const pickupWait = isNotHere && state.notHereAt[order.id] ? fmtWait(Date.now() - state.notHereAt[order.id]) : '';
    const items = deriveOrderItems(order);
    const notes = Array.isArray(order.noteLines) ? order.noteLines : [];

    const itemHtml = (items.length ? items : ['No item detail returned by API']).map(function (line) {
      const text = String(line || '');
      const sub = text.trim().startsWith('+') || text.trim().startsWith('*') || text.trim().startsWith('-') || text.startsWith('  ');
      return '<div class="item' + (sub ? ' sub' : '') + '">' + text + '</div>';
    }).join('');

    const notesHtml = notes.map(function (n) {
      return '<div class="item note">' + String(n || '') + '</div>';
    }).join('');

    return `
      <div class="detail">
        <div class="detail-head">
          <div class="detail-name">${order.customerName || 'Order'}</div>
        </div>
        <div class="hint">${isNotHere ? ('Pickup wait: ' + pickupWait) : ('Order wait: ' + wait)}</div>
        <div class="detail-items">${itemHtml}${notesHtml}</div>
        <div class="actions">
          <button class="action primary" data-action="complete" data-order-id="${order.id}">Complete Ticket</button>
          ${isNotHere
            ? '<button class="action warn" data-action="picked-up" data-order-id="' + order.id + '">Picked Up</button>'
            : '<button class="action warn" data-action="not-here" data-order-id="' + order.id + '">Not Here</button>'}
          <button class="action" data-action="refresh">Refresh</button>
        </div>
      </div>`;
  }

  function historyDetailHtml(order) {
    if (!order) {
      return `
        <div class="detail">
          <div class="detail-head"><div class="detail-name">No History Selected</div></div>
          <div class="hint">Select a completed order from the left list.</div>
          <div class="detail-items"></div>
          <div class="actions">
            <button class="action" data-action="back-live">Back to Live</button>
          </div>
        </div>`;
    }

    const orderWait = fmtWait((order.completedAt || Date.now()) - (order.createdAt || Date.now()));
    const completedAgo = fmtWait(Date.now() - (order.completedAt || Date.now()));
    const items = Array.isArray(order.itemLines) ? order.itemLines : [];
    const notes = Array.isArray(order.noteLines) ? order.noteLines : [];

    const itemHtml = (items.length ? items : ['No items captured']).map(function (line) {
      const text = String(line || '');
      const sub = text.trim().startsWith('+') || text.trim().startsWith('*') || text.trim().startsWith('-') || text.startsWith('  ');
      return '<div class="item' + (sub ? ' sub' : '') + '">' + text + '</div>';
    }).join('');

    const notesHtml = notes.map(function (n) {
      return '<div class="item note">' + String(n || '') + '</div>';
    }).join('');

    return `
      <div class="detail">
        <div class="detail-head">
          <div class="detail-name">${order.customerName || 'Order'}</div>
        </div>
        <div class="hint">Completed ${completedAgo} ago | Wait at completion: ${orderWait}</div>
        <div class="detail-items">${itemHtml}${notesHtml}</div>
        <div class="actions">
          <button class="action warn" data-action="undo-complete" data-order-id="${order.id}">Undo Complete</button>
          <button class="action" data-action="back-live">Back to Live</button>
        </div>
      </div>`;
  }

  function historyListHtml() {
    if (!state.completedHistory.length) {
      return '<div class="empty-board">No completed tickets yet.</div>';
    }
    return state.completedHistory.map(function (h) {
      const active = state.selectedHistoryId === h.id ? ' active' : '';
      const completedAgo = fmtWait(Date.now() - (h.completedAt || Date.now()));
      return `
        <article class="card ready${active}" data-order-id="${h.id}">
          <div class="line-1">
            <div class="name">${h.customerName || 'Order'}</div>
            <div class="badge b-ready">Completed</div>
          </div>
          <div class="line-1">
            <div class="meta"></div>
            <div class="wait">Done ${completedAgo} ago</div>
          </div>
        </article>`;
    }).join('');
  }

  function render() {
    const groups = sortOrders();
    const selected = selectedOrder();
    const selectedHistory = selectedHistoryOrder();
    const lastSyncAge = state.lastFetchAt ? Math.floor((Date.now() - state.lastFetchAt) / 1000) : null;

    root.innerHTML = `
      <div class="app">
        <header class="topbar">
          <button class="brand" id="open-minidisplay-settings" title="Open MiniDisplay settings">
            <img src="https://minidonauts.com/images/logo.jpg" alt="Mini Donauts" />
            <span class="title">Mini Donauts KDS</span>
          </button>
          <div style="display:flex; gap:10px; align-items:center;">
            ${state.environment === 'sandbox'
              ? '<button id="create-test-order" class="action" style="padding:6px 12px;">Create Test Order</button>'
              : ''}
            <button id="open-history" class="action" style="padding:6px 12px;">${state.view === 'history' ? 'Back to Live' : 'Order History'}</button>
            <span class="pill">${state.environment.toUpperCase()} | ${state.locationId || 'NO LOCATION'} | Sync ${lastSyncAge == null ? 'never' : (lastSyncAge + 's ago')}</span>
          </div>
        </header>

        <main class="layout">
          <section class="panel">
            <div class="panel-head">
              <span>${state.view === 'history' ? 'Completed Orders' : 'Ticket Board'}</span>
              <span>${state.view === 'history'
                ? (state.completedHistory.length + ' saved')
                : ('Avg Wait: ' + fmtAvgWait(state.avgWaitMs))}</span>
            </div>
            <div class="board-sections">
              ${state.view === 'history' ? '' : '<div class="meta" style="padding:0 6px 6px; color:#bcd7f6;">' + groups.open.length + ' Being Prepared | ' + groups.notHere.length + ' Not Here</div>'}
              ${state.view === 'history'
                ? historyListHtml()
                : (sectionHtml('Not Here', 'not-here', groups.notHere) + sectionHtml('Being Prepared', 'open', groups.open))}
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <span>${state.view === 'history' ? 'Order History' : 'Ticket Detail'}</span>
              <span>${state.view === 'history' ? (state.completedHistory.length + ' saved') : (selected ? (selected.customerName || 'Selected') : 'None')}</span>
            </div>
            ${state.view === 'history' ? historyDetailHtml(selectedHistory) : detailHtml(selected)}
            <div class="status ${state.statusClass}">${state.status}</div>
          </section>
        </main>
      </div>`;

    const openMiniBtn = document.querySelector('#open-minidisplay-settings');
    if (openMiniBtn) {
      openMiniBtn.addEventListener('click', function () {
        window.location.href = '/MiniDisplay/?settings=1';
      });
    }

    root.querySelectorAll('[data-order-id]').forEach(function (node) {
      if (node.classList.contains('card')) {
        node.addEventListener('click', function () {
          if (state.view === 'history') {
            state.selectedHistoryId = node.getAttribute('data-order-id') || '';
          } else {
            state.selectedId = node.getAttribute('data-order-id') || '';
          }
          render();
        });
      }
    });

    root.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const action = btn.getAttribute('data-action');
        const orderId = btn.getAttribute('data-order-id') || '';
        if (action === 'refresh') return void fetchOrders();
        if (action === 'history') {
          state.view = 'history';
          state.selectedHistoryId = state.completedHistory[0] ? state.completedHistory[0].id : '';
          return void render();
        }
        if (action === 'back-live') { state.view = 'board'; return void render(); }
        if (action === 'undo-complete') return void undoComplete(orderId);
        if (!orderId) return;
        if (action === 'complete') return void markComplete(orderId);
        if (action === 'not-here') return void markNotHere(orderId);
        if (action === 'picked-up') return void markPickedUp(orderId);
      });
    });

    const historyButton = document.querySelector('#open-history');
    if (historyButton) {
      historyButton.addEventListener('click', function () {
        state.view = state.view === 'history' ? 'board' : 'history';
        if (state.view === 'history') {
          state.selectedHistoryId = state.completedHistory[0] ? state.completedHistory[0].id : '';
        } else {
          state.selectedId = state.orders[0] ? state.orders[0].id : '';
        }
        render();
      });
    }

    const createTestOrderBtn = document.querySelector('#create-test-order');
    if (createTestOrderBtn) {
      createTestOrderBtn.addEventListener('click', function () {
        void createTestOrder();
      });
    }
  }

  function startPolling() {
    if (state.pollHandle) clearInterval(state.pollHandle);
    state.pollHandle = setInterval(function () {
      void fetchOrders();
    }, state.pollingMs);
  }

  function init() {
    const persisted = readKdsState();
    state.notHereAt = persisted.notHereAt;
    state.completedHistory = persisted.completedHistory;
    state.selectedHistoryId = state.completedHistory[0] ? state.completedHistory[0].id : '';
    setStatus('Loading tickets...', '');
    render();

    void fetchOrders();
    startPolling();

    setInterval(function () {
      render();
    }, 1000);
  }

  init();
})();
