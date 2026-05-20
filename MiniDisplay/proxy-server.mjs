import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = 8787;
const SQUARE_VERSION = '2024-11-20';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function squareBase(environment) {
  return environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

function normalizeOrder(o) {
  const recipient = o.fulfillments?.[0]?.pickup_details?.recipient?.display_name;
  const ticketName = String(o.ticket_name || '').trim();
  const customerName = String(recipient || ticketName || 'Order').trim() || 'Order';

  return {
    id: String(o.id || ''),
    customerName,
    createdAt: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
    fulfillmentState: String(o.fulfillments?.[0]?.state || 'PROPOSED'),
  };
}

async function squareFetch(path, method, token, environment, body) {
  const resp = await fetch(squareBase(environment) + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await resp.json().catch(() => null);
  return { resp, data };
}

async function listLocations(token) {
  for (const environment of ['sandbox', 'production']) {
    const { resp, data } = await squareFetch('/v2/locations', 'GET', token, environment);
    if (resp.ok) {
      const locations = Array.isArray(data?.locations) ? data.locations : [];
      return {
        ok: true,
        environment,
        locations: locations.map((l) => ({
          id: String(l?.id || ''),
          name: String(l?.name || l?.business_name || 'Location'),
          status: String(l?.status || ''),
        })).filter((l) => l.id),
      };
    }

    const detail = data?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    if (resp.status !== 401 && resp.status !== 403) {
      return { ok: false, error: detail, environment };
    }
  }

  return { ok: false, error: 'Token rejected for both sandbox and production.' };
}

async function searchOrders(token, locationId, environment) {
  const body = {
    location_ids: [locationId],
    query: {
      filter: { state_filter: { states: ['OPEN'] } },
      sort: { sort_field: 'CREATED_AT', sort_order: 'ASC' },
    },
    limit: 50,
  };

  const { resp, data } = await squareFetch('/v2/orders/search', 'POST', token, environment, body);
  if (!resp.ok) {
    const detail = data?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    return { ok: false, error: detail };
  }

  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const normalized = orders
    .filter((o) => {
      const fulfillments = o.fulfillments ?? [];
      if (!fulfillments.length) return true;
      return !fulfillments.every((f) => ['COMPLETED', 'CANCELED', 'FAILED'].includes(String(f?.state || '')));
    })
    .map(normalizeOrder);

  return {
    ok: true,
    orders: normalized,
    avgWaitMs: normalized.length
      ? Math.round(normalized.reduce((sum, o) => sum + (Date.now() - o.createdAt), 0) / normalized.length)
      : null,
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && req.url === '/square/locations') {
    let body = '';
    req.on('data', (c) => { body += String(c); });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const accessToken = String(payload.accessToken || '').trim();
        if (!accessToken) {
          sendJson(res, 400, { ok: false, error: 'accessToken is required' });
          return;
        }
        const result = await listLocations(accessToken);
        sendJson(res, result.ok ? 200 : 500, result);
      } catch (error) {
        sendJson(res, 500, { ok: false, error: String(error) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/square/orders') {
    let body = '';
    req.on('data', (c) => { body += String(c); });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const accessToken = String(payload.accessToken || '').trim();
        const locationId = String(payload.locationId || '').trim();
        const environment = payload.environment === 'production' ? 'production' : 'sandbox';

        if (!accessToken || !locationId) {
          sendJson(res, 400, { ok: false, error: 'accessToken and locationId are required' });
          return;
        }

        const result = await searchOrders(accessToken, locationId, environment);
        sendJson(res, result.ok ? 200 : 500, result);
      } catch (error) {
        sendJson(res, 500, { ok: false, error: String(error) });
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, service: 'MiniDisplay Proxy', version: 1 });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[MiniDisplay Proxy] listening on http://${HOST}:${PORT}`);
});