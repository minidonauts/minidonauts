export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, service: "minidisplay-proxy", now: new Date().toISOString() }),
        { headers: corsHeaders }
      );
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "POST required" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    let body = {};
    try { body = await request.json(); } catch {}

    const token = String(env.SQUARE_ACCESS_TOKEN || "").trim();
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "MISSING_SQUARE_ACCESS_TOKEN_SECRET" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const squareVersion = "2024-11-20";

    function squareBase(environment) {
      return environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
    }

    function getEnvFromBody() {
      return body?.environment === "production" ? "production" : "sandbox";
    }

    async function squareFetch(base, path, method, payload) {
      const resp = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Square-Version": squareVersion,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await resp.json().catch(() => null);
      return { resp, data };
    }

    function normalizeOrder(o) {
      const ticketName = String(o?.ticket_name || "").trim();
      const recipient = o?.fulfillments?.[0]?.pickup_details?.recipient?.display_name;
      const customerName = String(recipient || ticketName || "Order").trim() || "Order";

      const itemLines = [];
      for (const item of o?.line_items || []) {
        const qty = parseInt(item?.quantity || "1", 10);
        const name = String(item?.name || "Item").trim();
        itemLines.push(`${qty}x ${name}`);

        for (const mod of item?.modifiers || []) {
          const modName = String(mod?.name || "").trim();
          if (modName) itemLines.push(`   +${modName}`);
        }

        const itemNote = String(item?.note || "").trim();
        if (itemNote) itemLines.push(`   *${itemNote}`);
      }

      const noteLines = [];
      const pickupNote = String(o?.fulfillments?.[0]?.pickup_details?.note || "").trim();
      const metaNote = String(o?.metadata?.note || "").trim();
      const orderNote = pickupNote || metaNote;
      if (orderNote) noteLines.push(`NOTE: ${orderNote}`);

      return {
        id: String(o?.id || ""),
        customerName,
        createdAt: o?.created_at ? new Date(o.created_at).getTime() : Date.now(),
        fulfillmentState: String(o?.fulfillments?.[0]?.state || "PROPOSED"),
        itemLines,
        noteLines,
        line_items: Array.isArray(o?.line_items) ? o.line_items : []
      };
    }

    async function getOrder(base, orderId) {
      return squareFetch(base, `/v2/orders/${orderId}`, "GET");
    }

    async function updateOrder(base, orderId, orderPayload) {
      return squareFetch(base, `/v2/orders/${orderId}`, "PUT", {
        idempotency_key: crypto.randomUUID(),
        order: orderPayload,
      });
    }

    function pickTestName() {
      const names = [
        "Emma", "Liam", "Olivia", "Noah", "Ava", "Elijah", "Sophia", "James",
        "Isabella", "Oliver", "Mia", "William", "Charlotte", "Benjamin", "Amelia",
        "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Luna", "Mason",
        "Camila", "Ethan", "Penelope", "Daniel", "Riley", "Jacob", "Nora", "Logan"
      ];
      return names[Math.floor(Math.random() * names.length)];
    }

    if (url.pathname === "/square/locations") {
      const requestedEnv =
        body?.environment === "sandbox" || body?.environment === "production"
          ? body.environment
          : null;

      let environment = requestedEnv || "sandbox";
      let { resp, data } = await squareFetch(squareBase(environment), "/v2/locations", "GET");

      if (!resp.ok && !requestedEnv) {
        environment = "production";
        const retry = await squareFetch(squareBase(environment), "/v2/locations", "GET");
        resp = retry.resp;
        data = retry.data;
      }

      if (!resp.ok) {
        const detail = data?.errors?.[0]?.detail || `Square locations failed (${resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: detail, environment }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const locations = Array.isArray(data?.locations) ? data.locations : [];
      const normalized = locations
        .map((l) => ({
          id: String(l?.id || ""),
          name: String(l?.name || l?.business_name || "Location"),
          status: String(l?.status || ""),
        }))
        .filter((l) => l.id);

      return new Response(JSON.stringify({ ok: true, environment, locations: normalized }), {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/square/orders") {
      const locationId = String(body?.locationId || "").trim();
      const environment = getEnvFromBody();

      if (!locationId) {
        return new Response(JSON.stringify({ ok: false, error: "locationId required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const base = squareBase(environment);
      const allOrders = [];
      let cursor = null;
      let pages = 0;

      do {
        const searchPayload = {
          location_ids: [locationId],
          query: {
            filter: { state_filter: { states: ["OPEN"] } },
            sort: { sort_field: "CREATED_AT", sort_order: "ASC" },
          },
          limit: 100,
          ...(cursor ? { cursor } : {}),
        };

        const { resp, data } = await squareFetch(base, "/v2/orders/search", "POST", searchPayload);
        if (!resp.ok) {
          const detail = data?.errors?.[0]?.detail || `Square orders failed (${resp.status})`;
          return new Response(JSON.stringify({ ok: false, error: detail }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        const pageOrders = Array.isArray(data?.orders) ? data.orders : [];
        allOrders.push(...pageOrders);
        cursor = data?.cursor || null;
        pages += 1;
        if (pages >= 30) break;
      } while (cursor);

      const filtered = allOrders.filter((o) => {
        const fulfillments = o?.fulfillments ?? [];
        if (!fulfillments.length) return true;
        return !fulfillments.every((f) =>
          ["COMPLETED", "CANCELED", "FAILED"].includes(String(f?.state || ""))
        );
      });

      const orders = filtered.map(normalizeOrder);

      const activePrepOrders = orders.filter((o) => String(o.fulfillmentState || "") !== "PREPARED");
      const avgWaitMs =
        activePrepOrders.length > 0
          ? Math.round(
              activePrepOrders.reduce((sum, o) => sum + Math.max(0, Date.now() - o.createdAt), 0) / activePrepOrders.length
            )
          : null;

      return new Response(
        JSON.stringify({
          ok: true,
          environment,
          locationId,
          pagesScanned: pages,
          orderCountRaw: allOrders.length,
          orderCountFiltered: filtered.length,
          orderCountShown: orders.length,
          orderCountActivePrep: activePrepOrders.length,
          orders,
          avgWaitMs,
        }),
        { headers: corsHeaders }
      );
    }

    if (url.pathname === "/square/orders/complete") {
      const orderId = String(body?.orderId || "").trim();
      const locationId = String(body?.locationId || "").trim();
      const environment = getEnvFromBody();

      if (!orderId || !locationId) {
        return new Response(JSON.stringify({ ok: false, error: "orderId and locationId required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const base = squareBase(environment);
      const getResult = await getOrder(base, orderId);
      if (!getResult.resp.ok) {
        const detail = getResult.data?.errors?.[0]?.detail || `Could not fetch order (${getResult.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: detail }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const liveVersion = Number(getResult.data?.order?.version ?? 0);
      const fulfillmentUid = getResult.data?.order?.fulfillments?.[0]?.uid ?? null;

      const orderUpdate = fulfillmentUid
        ? {
            location_id: locationId,
            version: liveVersion,
            fulfillments: [{ uid: fulfillmentUid, state: "COMPLETED" }],
          }
        : {
            location_id: locationId,
            version: liveVersion,
            state: "COMPLETED",
          };

      const putResult = await updateOrder(base, orderId, orderUpdate);
      if (!putResult.resp.ok) {
        const detail =
          putResult.data?.errors?.[0]?.detail ||
          putResult.data?.errors?.[0]?.code ||
          `Complete failed (${putResult.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: String(detail) }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true, orderId, action: "COMPLETED" }), {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/square/orders/prepared") {
      const orderId = String(body?.orderId || "").trim();
      const locationId = String(body?.locationId || "").trim();
      const environment = getEnvFromBody();

      if (!orderId || !locationId) {
        return new Response(JSON.stringify({ ok: false, error: "orderId and locationId required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const base = squareBase(environment);
      const getResult = await getOrder(base, orderId);
      if (!getResult.resp.ok) {
        const detail = getResult.data?.errors?.[0]?.detail || `Could not fetch order (${getResult.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: detail }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const liveVersion = Number(getResult.data?.order?.version ?? 0);
      const fulfillmentUid = getResult.data?.order?.fulfillments?.[0]?.uid ?? null;
      if (!fulfillmentUid) {
        return new Response(JSON.stringify({ ok: false, error: "No fulfillment on order" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const putResult = await updateOrder(base, orderId, {
        location_id: locationId,
        version: liveVersion,
        fulfillments: [{ uid: fulfillmentUid, state: "PREPARED" }],
      });

      if (!putResult.resp.ok) {
        const detail =
          putResult.data?.errors?.[0]?.detail ||
          putResult.data?.errors?.[0]?.code ||
          `Prepared failed (${putResult.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: String(detail) }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true, orderId, action: "PREPARED" }), {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/square/orders/reopen") {
      const orderId = String(body?.orderId || "").trim();
      const locationId = String(body?.locationId || "").trim();
      const environment = getEnvFromBody();

      if (!orderId || !locationId) {
        return new Response(JSON.stringify({ ok: false, error: "orderId and locationId required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const base = squareBase(environment);
      const getResult = await getOrder(base, orderId);
      if (!getResult.resp.ok) {
        const detail = getResult.data?.errors?.[0]?.detail || `Could not fetch order (${getResult.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: detail }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const liveVersion = Number(getResult.data?.order?.version ?? 0);
      const fulfillmentUid = getResult.data?.order?.fulfillments?.[0]?.uid ?? null;
      if (!fulfillmentUid) {
        return new Response(JSON.stringify({ ok: false, error: "No fulfillment on order" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const putResult = await updateOrder(base, orderId, {
        location_id: locationId,
        version: liveVersion,
        fulfillments: [{ uid: fulfillmentUid, state: "PROPOSED" }],
      });

      if (!putResult.resp.ok) {
        const detail =
          putResult.data?.errors?.[0]?.detail ||
          putResult.data?.errors?.[0]?.code ||
          `Reopen failed (${putResult.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: String(detail) }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true, orderId, action: "PROPOSED" }), {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/square/create-test-order") {
      const locationId = String(body?.locationId || "").trim();
      const environment = getEnvFromBody();
      if (environment !== "sandbox") {
        return new Response(JSON.stringify({ ok: false, error: "create-test-order is sandbox only" }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      if (!locationId) {
        return new Response(JSON.stringify({ ok: false, error: "locationId required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const base = squareBase(environment);
      const customerName = pickTestName();
      const lineItems = [
        {
          name: "Mini Donuts",
          quantity: String(Math.floor(Math.random() * 2) + 1),
          base_price_money: { amount: 600, currency: "USD" },
          note: ["glazed", "cinnamon sugar", "powdered sugar", "chocolate"][Math.floor(Math.random() * 4)],
        }
      ];
      const totalAmount = lineItems.reduce((sum, li) => {
        return sum + Number(li.base_price_money?.amount || 0) * Number(li.quantity || 1);
      }, 0);

      const createOrder = await squareFetch(base, "/v2/orders", "POST", {
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          ticket_name: customerName,
          line_items: lineItems,
          fulfillments: [{
            type: "PICKUP",
            state: "PROPOSED",
            pickup_details: {
              recipient: { display_name: customerName },
              schedule_type: "ASAP",
            },
          }],
        },
      });

      if (!createOrder.resp.ok) {
        const detail = createOrder.data?.errors?.[0]?.detail || `Create order failed (${createOrder.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: detail }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const orderId = String(createOrder.data?.order?.id || "").trim();
      if (!orderId) {
        return new Response(JSON.stringify({ ok: false, error: "Order created but missing order ID" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const createPayment = await squareFetch(base, "/v2/payments", "POST", {
        idempotency_key: crypto.randomUUID(),
        source_id: "CASH",
        amount_money: { amount: totalAmount, currency: "USD" },
        cash_details: { buyer_supplied_money: { amount: totalAmount, currency: "USD" } },
        order_id: orderId,
        location_id: locationId,
      });

      if (!createPayment.resp.ok) {
        const detail = createPayment.data?.errors?.[0]?.detail || `Payment failed (${createPayment.resp.status})`;
        return new Response(JSON.stringify({ ok: false, error: detail, orderId }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true, orderId, customerName }), {
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },
};
