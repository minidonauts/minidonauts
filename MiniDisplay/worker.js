export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    try {
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

      function ensureKv() {
        if (!env.KDS_QUEUE) {
          throw new Error("MISSING_KDS_QUEUE_BINDING");
        }
        return env.KDS_QUEUE;
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

        const preparedAtMeta = String(o?.metadata?.kds_prepared_at || "").trim();
        const completedAtMeta = String(o?.metadata?.kds_completed_at || "").trim();
        const preparedAtTs = preparedAtMeta ? Date.parse(preparedAtMeta) : NaN;
        const completedAtTs = completedAtMeta ? Date.parse(completedAtMeta) : NaN;

        return {
          id: String(o?.id || ""),
          sourceOrderId: String(o?.id || ""),
          queueId: String(o?.id || ""),
          sourceType: "square_open_order",
          status: String(o?.fulfillments?.[0]?.state || "PROPOSED") === "PREPARED" ? "NOT_HERE" : "PREPARING",
          customerName,
          createdAt: o?.created_at ? new Date(o.created_at).getTime() : Date.now(),
          closedAt: o?.closed_at ? new Date(o.closed_at).getTime() : null,
          updatedAt: o?.updated_at ? new Date(o.updated_at).getTime() : null,
          preparedAt: Number.isFinite(preparedAtTs) ? preparedAtTs : null,
          completedAt: Number.isFinite(completedAtTs) ? completedAtTs : null,
          orderState: String(o?.state || "OPEN"),
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

      function firstSquareError(data) {
        const e = data?.errors?.[0];
        if (!e) return null;
        return {
          code: String(e.code || ""),
          category: String(e.category || ""),
          detail: String(e.detail || ""),
          field: String(e.field || ""),
        };
      }

      function kvKey(environment, locationId, queueId) {
        return `kds:${environment}:${locationId}:${queueId}`;
      }
      function doneKey(environment, locationId, sourceOrderId) {
        return `kdsdone:${environment}:${locationId}:${sourceOrderId}`;
      }

      function normalizeQueueItem(raw, fallbackEnvironment, fallbackLocationId) {
        const o = raw && typeof raw === "object" ? raw : {};
        const status = String(o.status || "PREPARING").toUpperCase() === "NOT_HERE" ? "NOT_HERE" : "PREPARING";
        const createdAt = Number(o.createdAt || Date.now());
        const preparedAt = Number.isFinite(Number(o.preparedAt)) ? Number(o.preparedAt) : null;
        const completedAt = Number.isFinite(Number(o.completedAt)) ? Number(o.completedAt) : null;

        return {
          queueId: String(o.queueId || o.sourceOrderId || crypto.randomUUID()),
          sourceOrderId: String(o.sourceOrderId || ""),
          locationId: String(o.locationId || fallbackLocationId || ""),
          environment: String(o.environment || fallbackEnvironment || "sandbox"),
          customerName: String(o.customerName || "Order"),
          itemLines: Array.isArray(o.itemLines) ? o.itemLines.map((x) => String(x || "")) : [],
          noteLines: Array.isArray(o.noteLines) ? o.noteLines.map((x) => String(x || "")) : [],
          status,
          insertedAt: Number(o.insertedAt || Date.now()),
          createdAt,
          preparedAt,
          completedAt,
          sourceType: String(o.sourceType || "square_terminal_recall"),
          id: String(o.sourceOrderId || o.queueId || ""),
          fulfillmentState: status === "NOT_HERE" ? "PREPARED" : "PROPOSED",
          orderState: "OPEN",
          line_items: Array.isArray(o.line_items) ? o.line_items : []
        };
      }

      async function listQueueItems(environment, locationId) {
        const kv = ensureKv();
        const prefix = `kds:${environment}:${locationId}:`;
        const out = [];
        let cursor = undefined;

        for (let i = 0; i < 20; i += 1) {
          const page = await kv.list({ prefix, cursor, limit: 1000 });
          for (const keyMeta of page.keys || []) {
            const raw = await kv.get(keyMeta.name, "json");
            if (!raw) continue;
            out.push(normalizeQueueItem(raw, environment, locationId));
          }
          if (!page.list_complete && page.cursor) {
            cursor = page.cursor;
            continue;
          }
          break;
        }

        return out.sort((a, b) => Number(a.insertedAt || 0) - Number(b.insertedAt || 0));
      }

      async function isDoneOrder(environment, locationId, sourceOrderId) {
        if (!sourceOrderId) return false;
        const kv = ensureKv();
        const v = await kv.get(doneKey(environment, locationId, sourceOrderId));
        return v != null;
      }

      async function setFulfillmentState(base, orderId, locationId, targetState) {
        const getResult = await getOrder(base, orderId);
        if (!getResult.resp.ok) {
          return {
            ok: false,
            stage: "get-order",
            status: getResult.resp.status,
            error: getResult.data?.errors?.[0]?.detail || `Could not fetch order (${getResult.resp.status})`,
            squareError: firstSquareError(getResult.data),
          };
        }

        const liveOrder = getResult.data?.order || {};
        const liveVersion = Number(liveOrder?.version ?? 0);
        const fulfillmentUid = liveOrder?.fulfillments?.[0]?.uid ?? null;
        const currentState = String(liveOrder?.fulfillments?.[0]?.state || "");
        const liveMetadataRaw = (liveOrder && typeof liveOrder.metadata === "object" && liveOrder.metadata) ? liveOrder.metadata : {};
        const liveMetadata = Object.fromEntries(
          Object.entries(liveMetadataRaw).filter(([k, v]) => {
            if (!k) return false;
            const s = String(v ?? "").trim();
            return s.length > 0;
          })
        );
        const nowIso = new Date().toISOString();
        const nextMetadata = {
          ...liveMetadata,
          ...(targetState === "PREPARED" ? { kds_prepared_at: nowIso } : {}),
          ...(targetState === "COMPLETED" ? { kds_completed_at: nowIso } : {}),
        };
        if (!fulfillmentUid) {
          if (targetState === "COMPLETED") {
            const putResult = await updateOrder(base, orderId, {
              location_id: locationId,
              version: liveVersion,
              state: "COMPLETED",
              metadata: nextMetadata,
            });
            if (!putResult.resp.ok) {
              const errDetail = String(putResult.data?.errors?.[0]?.detail || "");
              if (errDetail.includes("cannot be completed before payments have been processed")) {
                const cancelResult = await updateOrder(base, orderId, {
                  location_id: locationId,
                  version: liveVersion,
                  state: "CANCELED",
                });
                if (cancelResult.resp.ok) {
                  return {
                    ok: true,
                    currentState,
                    targetState: "CANCELED",
                    usedOrderStateFallback: true,
                    usedCancelFallback: true,
                    order: cancelResult.data?.order || null,
                  };
                }
              }
              return {
                ok: false,
                stage: "update-order-state",
                status: putResult.resp.status,
                error:
                  putResult.data?.errors?.[0]?.detail ||
                  putResult.data?.errors?.[0]?.code ||
                  `Order state COMPLETE failed (${putResult.resp.status})`,
                squareError: firstSquareError(putResult.data),
                currentState,
                targetState,
              };
            }
            return {
              ok: true,
              currentState,
              targetState,
              usedOrderStateFallback: true,
              order: putResult.data?.order || null,
            };
          }

          return {
            ok: false,
            stage: "validate-fulfillment",
            status: 500,
            error: "No fulfillment on order",
            currentState,
            targetState,
          };
        }

        const putResult = await updateOrder(base, orderId, {
          location_id: locationId,
          version: liveVersion,
          metadata: nextMetadata,
          fulfillments: [{ uid: fulfillmentUid, state: targetState }],
        });

        if (!putResult.resp.ok) {
          return {
            ok: false,
            stage: "update-fulfillment",
            status: putResult.resp.status,
            error:
              putResult.data?.errors?.[0]?.detail ||
              putResult.data?.errors?.[0]?.code ||
              `${targetState} failed (${putResult.resp.status})`,
            squareError: firstSquareError(putResult.data),
            currentState,
            targetState,
          };
        }

        return {
          ok: true,
          currentState,
          targetState,
          order: putResult.data?.order || null,
        };
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

      if (url.pathname === "/kds/queue/upsert") {
        const locationId = String(body?.locationId || "").trim();
        const environment = getEnvFromBody();
        const status = String(body?.status || "PREPARING").toUpperCase() === "NOT_HERE" ? "NOT_HERE" : "PREPARING";
        const sourceOrderId = String(body?.sourceOrderId || body?.orderId || "").trim();
        const queueId = String(body?.queueId || sourceOrderId || crypto.randomUUID()).trim();

        if (!locationId || !sourceOrderId) {
          return new Response(JSON.stringify({ ok: false, error: "locationId and sourceOrderId required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const queueItem = normalizeQueueItem({
          queueId,
          sourceOrderId,
          locationId,
          environment,
          customerName: body?.customerName,
          itemLines: body?.itemLines,
          noteLines: body?.noteLines,
          status,
          insertedAt: body?.insertedAt,
          createdAt: body?.createdAt,
          preparedAt: body?.preparedAt ?? (status === "NOT_HERE" ? Date.now() : null),
          completedAt: body?.completedAt ?? null,
          sourceType: body?.sourceType || "square_terminal_recall",
        }, environment, locationId);

        const kv = ensureKv();
        await kv.put(kvKey(environment, locationId, queueId), JSON.stringify(queueItem));
        await kv.delete(doneKey(environment, locationId, sourceOrderId));

        return new Response(JSON.stringify({ ok: true, queueItem }), { headers: corsHeaders });
      }

      if (url.pathname === "/kds/queue/remove") {
        const locationId = String(body?.locationId || "").trim();
        const environment = getEnvFromBody();
        const queueId = String(body?.queueId || body?.sourceOrderId || body?.orderId || "").trim();
        const sourceOrderId = String(body?.sourceOrderId || queueId).trim();

        if (!locationId || !queueId) {
          return new Response(JSON.stringify({ ok: false, error: "locationId and queueId required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const kv = ensureKv();
        await kv.delete(kvKey(environment, locationId, queueId));
        if (sourceOrderId) {
          await kv.put(doneKey(environment, locationId, sourceOrderId), String(Date.now()), { expirationTtl: 60 * 60 * 24 * 3 });
        }

        return new Response(JSON.stringify({ ok: true, queueId, sourceOrderId }), { headers: corsHeaders });
      }

      if (url.pathname === "/kds/queue/list") {
        const locationId = String(body?.locationId || "").trim();
        const environment = getEnvFromBody();
        if (!locationId) {
          return new Response(JSON.stringify({ ok: false, error: "locationId required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const queue = await listQueueItems(environment, locationId);
        return new Response(JSON.stringify({ ok: true, environment, locationId, queue }), { headers: corsHeaders });
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
        const includeClosed = Boolean(body?.includeClosed);
        const includeKdsQueue = Boolean(body?.includeKdsQueue);
        const day = String(body?.day || "").trim();
        const dayStart = String(body?.dayStart || "").trim();
        const dayEnd = String(body?.dayEnd || "").trim();

        if (!locationId) {
          return new Response(JSON.stringify({ ok: false, error: "locationId required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const base = squareBase(environment);
        const effectiveDayStart = dayStart || `${(day || new Date().toISOString().slice(0, 10))}T00:00:00.000Z`;
        const effectiveDayEnd = dayEnd || `${(day || new Date().toISOString().slice(0, 10))}T23:59:59.999Z`;
        const allOrders = [];
        let cursor = null;
        let pages = 0;

        do {
          const searchFilter = includeClosed
            ? {}
            : { state_filter: { states: ["OPEN"] } };

          if (dayStart && dayEnd) {
            searchFilter.date_time_filter = {
              created_at: {
                start_at: dayStart,
                end_at: dayEnd,
              },
            };
          } else if (day) {
            searchFilter.date_time_filter = {
              created_at: {
                start_at: `${day}T00:00:00.000Z`,
                end_at: `${day}T23:59:59.999Z`,
              },
            };
          }

          const searchPayload = {
            location_ids: [locationId],
            query: {
              filter: searchFilter,
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

        const filtered = includeClosed
          ? allOrders
          : allOrders.filter((o) => {
              const orderState = String(o?.state || "");
              if (["COMPLETED", "CANCELED"].includes(orderState)) return false;
              const fulfillments = o?.fulfillments ?? [];
              if (!fulfillments.length) return true;
              return !fulfillments.every((f) =>
                ["COMPLETED", "CANCELED", "FAILED"].includes(String(f?.state || ""))
              );
            });

        let orders = filtered.map(normalizeOrder);

        if (includeKdsQueue) {
          const queueItems = await listQueueItems(environment, locationId);
          const doneMemo = new Map();
          async function isDoneMemo(sourceOrderId) {
            const k = String(sourceOrderId || "");
            if (!k) return false;
            if (doneMemo.has(k)) return doneMemo.get(k);
            const done = await isDoneOrder(environment, locationId, k);
            doneMemo.set(k, done);
            return done;
          }

          const completedOrders = [];
          if (!includeClosed) {
            let completedCursor = null;
            let completedPages = 0;
            do {
              const completedPayload = {
                location_ids: [locationId],
                query: {
                  filter: {
                    state_filter: { states: ["COMPLETED"] },
                    date_time_filter: {
                      created_at: {
                        start_at: effectiveDayStart,
                        end_at: effectiveDayEnd,
                      },
                    },
                  },
                  sort: { sort_field: "CREATED_AT", sort_order: "ASC" },
                },
                limit: 100,
                ...(completedCursor ? { cursor: completedCursor } : {}),
              };
              const completedRes = await squareFetch(base, "/v2/orders/search", "POST", completedPayload);
              if (!completedRes.resp.ok) break;
              const pageOrders = Array.isArray(completedRes.data?.orders) ? completedRes.data.orders : [];
              completedOrders.push(...pageOrders);
              completedCursor = completedRes.data?.cursor || null;
              completedPages += 1;
              if (completedPages >= 30) break;
            } while (completedCursor);
          }

          const bySource = new Map();
          for (const sq of orders) {
            const sourceOrderId = String(sq.sourceOrderId || sq.id || "");
            if (!sourceOrderId) continue;
            if (await isDoneMemo(sourceOrderId)) continue;
            bySource.set(sourceOrderId, sq);
          }
          for (const co of completedOrders.map(normalizeOrder)) {
            const sourceOrderId = String(co.sourceOrderId || co.id || "");
            if (!sourceOrderId) continue;
            if (await isDoneMemo(sourceOrderId)) continue;
            bySource.set(sourceOrderId, {
              ...co,
              sourceType: "square_terminal_paid",
              status: "PREPARING",
              fulfillmentState: "PROPOSED",
              orderState: "OPEN",
              queueId: sourceOrderId,
            });
          }
          for (const qi of queueItems) {
            bySource.set(String(qi.sourceOrderId || qi.id), qi);
          }
          orders = Array.from(bySource.values()).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
        }

        const activePrepOrders = orders.filter((o) => String(o.fulfillmentState || "") !== "PREPARED");
        const avgWaitMs =
          activePrepOrders.length > 0
            ? Math.round(
                activePrepOrders.reduce((sum, o) => sum + Math.max(0, Date.now() - Number(o.createdAt || Date.now())), 0) / activePrepOrders.length
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
            includeClosed,
            includeKdsQueue,
            day: day || null,
            dayStart: dayStart || null,
            dayEnd: dayEnd || null,
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
        let result = await setFulfillmentState(base, orderId, locationId, "COMPLETED");

        if (!result.ok) {
          const current = String(result.currentState || "");
          if (current === "PROPOSED" || current === "RESERVED") {
            const prep = await setFulfillmentState(base, orderId, locationId, "PREPARED");
            if (prep.ok) {
              result = await setFulfillmentState(base, orderId, locationId, "COMPLETED");
            }
          }
        }

        if (!result.ok) {
          return new Response(JSON.stringify({
            ok: false,
            error: String(result.error || "Complete failed"),
            stage: result.stage || "unknown",
            httpStatus: result.status || 500,
            currentState: result.currentState || null,
            targetState: result.targetState || "COMPLETED",
            squareError: result.squareError || null,
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify({ ok: true, orderId, action: "COMPLETED", fromState: result.currentState || null }), {
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
        const result = await setFulfillmentState(base, orderId, locationId, "PREPARED");
        if (!result.ok) {
          return new Response(JSON.stringify({
            ok: false,
            error: String(result.error || "Prepared failed"),
            stage: result.stage || "unknown",
            httpStatus: result.status || 500,
            currentState: result.currentState || null,
            targetState: "PREPARED",
            squareError: result.squareError || null,
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify({ ok: true, orderId, action: "PREPARED", fromState: result.currentState || null }), {
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
        const result = await setFulfillmentState(base, orderId, locationId, "PROPOSED");
        if (!result.ok) {
          return new Response(JSON.stringify({
            ok: false,
            error: String(result.error || "Reopen failed"),
            stage: result.stage || "unknown",
            httpStatus: result.status || 500,
            currentState: result.currentState || null,
            targetState: "PROPOSED",
            squareError: result.squareError || null,
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify({ ok: true, orderId, action: "PROPOSED", fromState: result.currentState || null }), {
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
    } catch (err) {
      const message = err && err.message ? String(err.message) : String(err);
      const stack = err && err.stack ? String(err.stack) : null;
      console.error("[MiniDisplayWorker:fatal]", message, stack || "");
      return new Response(JSON.stringify({
        ok: false,
        error: message,
        fatal: true,
        stack,
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
