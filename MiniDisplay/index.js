(function () {
  const DEFAULT_PROXY_URL = 'https://minidonauts-minidisplay-proxy.minidonauts.workers.dev';
  const LS_KEY = 'minidonauts.minidisplay.settings.v2';
  const display = document.querySelector('#display');

  if (!display) return;

  const style = document.createElement('style');
  style.textContent = `
  @font-face {
    font-family: 'AstroSpace';
    src: url('https://minidonauts.com/AstroSpace-0Wl3o.otf') format('opentype');
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #1f74dc;
    font-family: 'AstroSpace', 'Comfortaa', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  #display {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .header {
    background: #0d4f88;
    border-bottom: 3px solid #fdba44;
    padding: 22px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .header-logo {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fdba44;
  }

  .header-site, .header-title {
    color: #fdba44;
    font-weight: 700;
    text-transform: uppercase;
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  }

  .header-site { font-size: 2rem; }
  .header-title { font-size: 2.4rem; }

  .section { padding: 28px 40px 0; }

  .section-label {
    font-size: 2.5rem;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .section-label.ready { color: #fdba44; }
  .section-label.waiting { color: #fdba44; }

  .order-list { display: flex; flex-direction: column; gap: 12px; }

  .order-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px;
    border-radius: 999px;
  }

  .order-row.ready { background: #0d4f88; border: 2px solid #fdba44; }
  .order-row.waiting {
    background: linear-gradient(135deg, #071524, #0a0a0a);
    border: 2px solid #355b85;
    box-shadow: inset 0 0 0 1px rgba(120, 172, 230, 0.2);
  }

  .order-name { font-size: 4.2rem; line-height: 1; }
  .order-row.ready .order-name { color: #fdba44; }
  .order-row.waiting .order-name { color: #4a7ab5; }

  .order-badge {
    font-size: 2rem;
    text-transform: uppercase;
    padding: 8px 22px;
    border-radius: 999px;
    background: #fdba44;
    color: #0d4f88;
    border: 2px solid #ffd889;
  }

  .order-badge.up-next {
    background: linear-gradient(135deg, #0d4f88, #153f6a);
    color: #fdba44;
    border-color: #fdba44;
    box-shadow: 0 0 0 2px rgba(253, 186, 68, 0.15);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding-left: 12px;
  }

  .up-next-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45));
  }

  .order-wait { font-size: 3rem; white-space: nowrap; }
  .order-row.ready .order-wait { color: #ffd889; }
  .order-row.waiting .order-wait { color: #2a4a6a; }

  .left, .right { display: flex; align-items: center; gap: 20px; }

  .empty {
    color: #fdba44;
    font-size: clamp(2rem, 5vw, 3.2rem);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-shadow: -2px -2px 0 #0d4f88, 2px -2px 0 #0d4f88, -2px 2px 0 #0d4f88, 2px 2px 0 #0d4f88, 0 0 18px rgba(0, 0, 0, 0.35);
    background: rgba(13, 79, 136, 0.58);
    border: 2px solid #fdba44;
    border-radius: 999px;
    width: min(92vw, 760px);
    margin: 80px auto 0;
    padding: 18px 24px;
    text-align: center;
  }
  .divider { height: 2px; background: #0d4f88; margin: 28px 40px 0; }

  .urgent .order-name, .urgent .order-wait { color: #ff6b35 !important; }

  .settings-wrap { display: flex; justify-content: center; padding: 36px 20px; }

  .settings-card {
    width: min(960px, 95vw);
    background: rgba(13, 79, 136, 0.92);
    border: 2px solid #fdba44;
    border-radius: 24px;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
    padding: 24px;
    color: #fdba44;
  }

  .settings-title { font-size: 2rem; margin-bottom: 12px; text-transform: uppercase; }

  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .field.full { grid-column: 1 / -1; }
  .field label { font-size: 1rem; color: #ffd889; }

  .field input, .field select {
    border: 2px solid #fdba44;
    border-radius: 12px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.35);
    color: #fff3cc;
    font-size: 1rem;
    font-family: inherit;
  }

  .actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }

  .btn {
    border: 2px solid #ffd889;
    border-radius: 999px;
    padding: 10px 18px;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
  }

  .btn.primary { background: #fdba44; color: #0d4f88; }
  .btn.secondary { background: transparent; color: #fdba44; border-color: #fdba44; }

  .status { margin-top: 12px; font-size: 1rem; min-height: 1.2em; }
  .status.ok { color: #adffad; }
  .status.error { color: #ffb3b3; }

  @media (max-width: 900px) {
    .settings-grid { grid-template-columns: 1fr; }
    .header-site { display: none; }
    .header-title { font-size: 1.8rem; }
    .order-name { font-size: 2.3rem; }
    .order-wait { font-size: 1.7rem; }
  }
  `;
  document.head.appendChild(style);

  let showingSettings = false;
  let settingsStatus = '';
  let settingsStatusClass = '';
  let lastOrders = [];
  let lastAvgWaitMs = null;
  let pollTimerId = null;
  let tickTimerId = null;
  let pollIntervalMs = 3000;
  let lastPollErrorKey = '';

  function readSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {
        locationId: '',
        environment: 'sandbox',
        defaultAvgWaitSec: 154
      };
      const parsed = JSON.parse(raw);
      return {
        locationId: String(parsed.locationId || '').trim(),
        environment: parsed.environment === 'production' ? 'production' : 'sandbox',
        defaultAvgWaitSec: Number.isFinite(parsed.defaultAvgWaitSec)
          ? Math.max(0, Math.floor(parsed.defaultAvgWaitSec))
          : 154
      };
    } catch (_e) {
      return {
        locationId: '',
        environment: 'sandbox',
        defaultAvgWaitSec: 154
      };
    }
  }

  function writeSettings(next) {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }

  function settingsHeaderHtml() {
    return `
      <div class="header">
        <span class="header-title">Mini Display Settings</span>
        <button class="header-brand" id="back-to-display" type="button" title="Back to display">
          <span class="header-site">Back to Orders</span>
          <img src="https://minidonauts.com/images/logo.jpg" class="header-logo" alt="Mini Donauts" />
        </button>
      </div>`;
  }

  async function proxyPost(path, payload) {
    const base = DEFAULT_PROXY_URL.replace(/\/$/, '');
    const url = base + path;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await resp.json().catch(function () { return null; });
    if (!resp.ok || !(body && body.ok)) {
      const detail = body && body.error ? body.error : ('HTTP ' + resp.status + ' at ' + url);
      throw new Error(detail);
    }
    return body;
  }

  async function fetchLocations() {
    return proxyPost('/square/locations', {});
  }

  async function fetchOrdersFromSquare() {
    const s = readSettings();
    const env = s.environment === 'production' ? 'production' : 'sandbox';
    if (!s.locationId) return { orders: [], avgWaitMs: s.defaultAvgWaitSec * 1000 };

    const body = await proxyPost('/square/orders', {
      locationId: s.locationId,
      environment: env
    });

    const defaultAvgWaitMs = s.defaultAvgWaitSec * 1000;
    const liveAvgWaitMs = body.avgWaitMs != null ? body.avgWaitMs : defaultAvgWaitMs;
    const flooredAvgWaitMs = Math.max(defaultAvgWaitMs, liveAvgWaitMs);

    return {
      orders: Array.isArray(body.orders) ? body.orders : [],
      avgWaitMs: flooredAvgWaitMs
    };
  }

  async function renderSettings() {
    showingSettings = true;
    const s = readSettings();

    display.innerHTML = `
      ${settingsHeaderHtml()}
      <div class="settings-wrap">
        <div class="settings-card">
          <div class="settings-title">Square Configuration</div>
          <div class="settings-grid">
            <div class="field full">
              <label for="square-location-id">Location</label>
              <select id="square-location-id">
                <option value="${s.locationId}">
                  ${s.locationId ? ('Saved: ' + s.locationId) : 'Load locations first'}
                </option>
              </select>
            </div>
            <div class="field">
              <label for="default-wait-seconds">Default Avg Wait (seconds)</label>
              <input id="default-wait-seconds" type="number" min="0" step="1" value="${s.defaultAvgWaitSec}" />
            </div>
          </div>
          <div class="actions">
            <button id="load-locations" class="btn secondary" type="button">Load Locations</button>
            <button id="save-settings" class="btn primary" type="button">Save Settings</button>
            <button id="cancel-settings" class="btn secondary" type="button">Cancel</button>
          </div>
          <div class="status ${settingsStatusClass}" id="settings-status">${settingsStatus}</div>
        </div>
      </div>
    `;

    const statusEl = document.querySelector('#settings-status');
    const locationEl = document.querySelector('#square-location-id');
    const loadBtn = document.querySelector('#load-locations');

    function setStatus(message, klass) {
      settingsStatus = message || '';
      settingsStatusClass = klass || '';
      if (statusEl) {
        statusEl.textContent = settingsStatus;
        statusEl.className = 'status ' + settingsStatusClass;
      }
    }

    function updateSettingsPartial(patch) {
      const current = readSettings();
      writeSettings(Object.assign({}, current, patch));
    }

    function renderLocationOptions(locations, selectedId) {
      if (!locationEl) return;
      if (!locations.length) {
        locationEl.innerHTML = '<option value="">No locations found</option>';
        return;
      }
      locationEl.innerHTML = locations.map(function (loc) {
        const id = String(loc.id || '');
        const name = String(loc.name || id || 'Location');
        const selected = id === selectedId ? ' selected' : '';
        return '<option value="' + id + '"' + selected + '>' + name + ' (' + id + ')</option>';
      }).join('');
    }

    async function loadLocationsAction() {
      if (loadBtn) loadBtn.disabled = true;
      setStatus('Loading locations...', '');

      try {
        const result = await fetchLocations();
        const locations = Array.isArray(result.locations) ? result.locations : [];
        const env = result.environment === 'production' ? 'production' : 'sandbox';

        if (!locations.length) {
          renderLocationOptions([], '');
          setStatus('No locations found for this token.', 'error');
          return;
        }

        const current = readSettings();
        const selectedId = locations.some(function (l) { return l.id === current.locationId; })
          ? current.locationId
          : locations[0].id;

        renderLocationOptions(locations, selectedId);
        updateSettingsPartial({ locationId: selectedId, environment: env });
        setStatus('Locations loaded (' + env + ').', 'ok');
      } catch (error) {
        console.error('[MiniDisplay] Failed loading locations', {
          error: error && error.message ? error.message : String(error),
          workerUrl: DEFAULT_PROXY_URL,
          hint: 'Verify Cloudflare Worker secret and retry.'
        });
        setStatus(error && error.message ? error.message : 'Failed to load locations', 'error');
      } finally {
        if (loadBtn) loadBtn.disabled = false;
      }
    }

    const backBtn = document.querySelector('#back-to-display');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        showingSettings = false;
        settingsStatus = '';
        settingsStatusClass = '';
        tick();
      });
    }

    const cancelBtn = document.querySelector('#cancel-settings');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        showingSettings = false;
        settingsStatus = '';
        settingsStatusClass = '';
        tick();
      });
    }

    if (loadBtn) loadBtn.addEventListener('click', function () { void loadLocationsAction(); });

    if (locationEl) {
      locationEl.addEventListener('change', function () {
        const id = String(locationEl.value || '').trim();
        updateSettingsPartial({ locationId: id });
      });
    }

    const saveBtn = document.querySelector('#save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        const locationId = String((locationEl && locationEl.value) || '').trim();
        const defaultAvgWaitSec = Math.max(0, Math.floor(Number((document.querySelector('#default-wait-seconds') || {}).value || 0)));
        if (!locationId) {
          setStatus('Select a location first.', 'error');
          return;
        }

        const current = readSettings();
        writeSettings({
          locationId: locationId,
          environment: current.environment === 'production' ? 'production' : 'sandbox',
          defaultAvgWaitSec: defaultAvgWaitSec
        });

        setStatus('Saved. Returning to display...', 'ok');
        setTimeout(function () {
          showingSettings = false;
          settingsStatus = '';
          settingsStatusClass = '';
          tick();
        }, 500);
      });
    }
  }

  function formatWait(createdAt) {
    const ms = Date.now() - createdAt;
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins + 'm ' + String(secs).padStart(2, '0') + 's';
  }

  function formatAvgWait(ms) {
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return secs > 0 ? mins + 'm ' + secs + 's' : mins + 'm';
  }

  function renderOrders(orders, avgWaitMs) {
    const ready = orders.filter(function (o) { return o.fulfillmentState === 'PREPARED'; });
    const waiting = orders.filter(function (o) { return o.fulfillmentState !== 'PREPARED'; });
    const now = Date.now();
    const urgentMs = 10 * 60 * 1000;

    function rowHTML(order, type, upNext) {
      const urgent = (now - order.createdAt) > urgentMs;
      const urgentClass = urgent ? ' urgent' : '';
      const badge = type === 'ready'
        ? '<span class="order-badge">Ready</span>'
        : (upNext
          ? '<span class="order-badge up-next"><img class="up-next-icon" src="https://minidonauts.com/images/shipman.png" alt="Up Next" />Up Next</span>'
          : '');
      return `
        <div class="order-row ${type}${urgentClass}">
          <span class="left">${badge}<span class="order-name">${order.customerName || 'Order'}</span></span>
          <span class="right"><span class="order-wait">${formatWait(order.createdAt || Date.now())}</span></span>
        </div>`;
    }

    const avgLabel = avgWaitMs != null ? 'Avg wait: ' + formatAvgWait(avgWaitMs) : '';
    let html = `
      <div class="header">
        <span class="header-title">Orders (${avgLabel})</span>
        <button class="header-brand" id="open-settings" type="button" title="Open settings">
          <span class="header-site">MiniDonauts.com</span>
          <img src="https://minidonauts.com/images/logo.jpg" class="header-logo" alt="Mini Donauts" />
        </button>
      </div>`;

    if (ready.length) {
      html += `
      <div class="section">
        <div class="section-label ready">Ready for Pickup</div>
        <div class="order-list">${ready.map(function (o) { return rowHTML(o, 'ready', false); }).join('')}</div>
      </div>`;
    }

    if (waiting.length) {
      if (ready.length) html += '<div class="divider"></div>';
      html += `
      <div class="section">
        <div class="section-label waiting">Being Prepared</div>
        <div class="order-list">${waiting.map(function (o, i) { return rowHTML(o, 'waiting', i === 0); }).join('')}</div>
      </div>`;
    }

    if (!orders.length) {
      html += '<div class="empty">No Open Orders</div>';
    }

    display.innerHTML = html;
    const settingsBtn = document.querySelector('#open-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', function () { void renderSettings(); });
  }

  async function fetchOrders() {
    try {
      const result = await fetchOrdersFromSquare();
      lastOrders = result.orders;
      const settings = readSettings();
      const defaultAvgWaitMs = settings.defaultAvgWaitSec * 1000;
      if (!lastOrders.length) {
        lastAvgWaitMs = defaultAvgWaitMs;
      } else {
        const liveAvgWaitMs = result.avgWaitMs != null ? result.avgWaitMs : defaultAvgWaitMs;
        lastAvgWaitMs = Math.max(defaultAvgWaitMs, liveAvgWaitMs);
      }
      pollIntervalMs = 3000;
      lastPollErrorKey = '';
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const key = err.message || 'unknown';
      if (key !== lastPollErrorKey) {
        const s = readSettings();
        console.error('[MiniDisplay] Failed to fetch orders', {
          error: err.message,
          workerUrl: DEFAULT_PROXY_URL,
          environment: s.environment,
          locationId: s.locationId,
          hint: 'Verify Cloudflare secret token and selected location.'
        });
        lastPollErrorKey = key;
      }
      pollIntervalMs = Math.min(pollIntervalMs * 2, 30000);
    }
  }

  function schedulePolling() {
    if (pollTimerId) clearTimeout(pollTimerId);
    pollTimerId = setTimeout(async function runPoll() {
      await fetchOrders();
      schedulePolling();
    }, pollIntervalMs);
  }

  function tick() {
    if (showingSettings) return;
    renderOrders(lastOrders, lastAvgWaitMs);
  }

  void fetchOrders().finally(schedulePolling);
  tickTimerId = setInterval(tick, 1000);

  const openSettingsOnLoad = new URLSearchParams(window.location.search).get('settings') === '1';
  if (openSettingsOnLoad) {
    void renderSettings();
  }
})();
