import db from '../db/database.js';

const SHOPIFY_API_VERSION = '2024-10';

/**
 * Normalize shop domain (e.g. "mystore", "mystore.myshopify.com", "https://mystore.myshopify.com")
 */
export function normalizeShopDomain(domain) {
  if (!domain) return '';
  let clean = domain.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!clean.includes('.myshopify.com') && !clean.includes('.')) {
    clean = `${clean}.myshopify.com`;
  }
  return clean;
}

/**
 * Execute a GraphQL query against Shopify Admin API with rate limit and throttling handling
 */
export async function executeGraphQL(shopDomain, accessToken, query, variables = {}, retries = 3) {
  const normalizedDomain = normalizeShopDomain(shopDomain);
  const endpoint = `https://${normalizedDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed (HTTP ${response.status}). Please check your Shopify Admin Access Token and scopes.`);
      }

      if (response.status === 429) {
        // Throttled by Shopify
        const retryAfter = parseFloat(response.headers.get('Retry-After') || '2');
        console.warn(`[Shopify API] Throttled (429). Retrying in ${retryAfter}s (attempt ${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Shopify API error HTTP ${response.status}: ${text}`);
      }

      const json = await response.json();

      // Check for GraphQL errors
      if (json.errors && json.errors.length > 0) {
        const isThrottled = json.errors.some(e => e.message && e.message.toLowerCase().includes('throttled'));
        if (isThrottled && attempt < retries) {
          console.warn(`[Shopify GraphQL] Cost throttled. Retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(json.errors.map(e => e.message).join(' | '));
      }

      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Shopify API] Attempt ${attempt} failed: ${err.message}. Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Test Shopify store connection and verify access permissions
 */
export async function testShopifyConnection(shopDomain, accessToken) {
  const query = `
    query getShopDetails {
      shop {
        id
        name
        email
        myshopifyDomain
        currencyCode
        timezoneOffsetMinutes
        plan {
          displayName
        }
      }
    }
  `;

  try {
    const data = await executeGraphQL(shopDomain, accessToken, query);
    if (!data || !data.shop) {
      throw new Error('Unable to retrieve store profile.');
    }

    return {
      success: true,
      shop: {
        id: data.shop.id,
        name: data.shop.name,
        email: data.shop.email,
        domain: data.shop.myshopifyDomain,
        currency: data.shop.currencyCode,
        plan: data.shop.plan?.displayName
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Sync Shopify orders into SQLite database with cursor pagination and incremental syncing
 */
export async function syncShopifyOrders({ storeId = null, fullSync = false, limit = 250 } = {}) {
  const startTime = Date.now();

  // Find store config
  let store;
  if (storeId) {
    store = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId);
  } else {
    store = db.prepare('SELECT * FROM stores WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  }

  // Fallback to process.env if not in DB
  let shopDomain = store?.shop_domain || process.env.SHOPIFY_SHOP_DOMAIN;
  let accessToken = store?.access_token || process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    throw new Error('Shopify store credentials not configured. Please set Store Domain and Admin API Access Token in Settings.');
  }

  console.log(`[Shopify Sync] Starting sync for ${shopDomain} (Full Sync: ${fullSync})...`);

  // Build query filter for incremental sync
  let queryString = '';
  if (!fullSync && store?.last_synced_at) {
    // Only orders updated after last sync (with 5 minute safety buffer)
    const bufferDate = new Date(new Date(store.last_synced_at).getTime() - 5 * 60 * 1000);
    queryString = `updated_at:>'${bufferDate.toISOString()}'`;
    console.log(`[Shopify Sync] Incremental filter: ${queryString}`);
  }

  const query = `
    query getOrders($first: Int!, $after: String, $query: String) {
      orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: false) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            name
            createdAt
            updatedAt
            processedAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalDiscountsSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalTaxSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            paymentGatewayNames
            customer {
              id
              displayName
              firstName
              lastName
              email
              phone
              defaultAddress {
                address1
                address2
                city
                province
                provinceCode
                zip
                country
              }
            }
            shippingAddress {
              address1
              address2
              city
              province
              provinceCode
              zip
              country
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  sku
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  variant {
                    id
                    title
                    price
                  }
                  product {
                    id
                    title
                  }
                }
              }
            }
            fulfillments {
              id
              status
              trackingInfo {
                company
                number
                url
              }
            }
            refunds {
              id
              createdAt
              note
              totalRefundedSet {
                shopMoney {
                  amount
                }
              }
            }
            cancelReason
            cancelledAt
            note
          }
        }
      }
    }
  `;

  let hasNextPage = true;
  let cursor = null;
  let ordersFetched = 0;
  let ordersCreated = 0;
  let ordersUpdated = 0;
  let syncStatus = 'success';
  let errorMessage = null;

  const insertCustStmt = db.prepare(`
    INSERT INTO customers (shopify_customer_id, first_name, last_name, full_name, email, phone, address_line1, address_line2, city, province, zip, country, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const updateCustStmt = db.prepare(`
    UPDATE customers SET
      first_name = ?, last_name = ?, full_name = ?, email = ?, phone = ?,
      address_line1 = ?, address_line2 = ?, city = ?, province = ?, zip = ?, country = ?, updated_at = datetime('now')
    WHERE shopify_customer_id = ?
  `);

  const findCustStmt = db.prepare(`SELECT id FROM customers WHERE shopify_customer_id = ? LIMIT 1`);

  const findOrderStmt = db.prepare(`SELECT id, is_manual, manual_override FROM orders WHERE shopify_order_id = ? OR order_number = ? LIMIT 1`);

  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (
      shopify_order_id, order_number, order_name, order_date, customer_id, customer_name, customer_email, customer_phone,
      shipping_address, city, province, zip, total_price, subtotal_price, total_discounts, total_tax,
      currency, financial_status, fulfillment_status, payment_gateway_names, tracking_number, tracking_company,
      cancel_reason, cancelled_at, notes, source, is_manual, raw_data, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 'shopify', 0, ?, datetime('now'), datetime('now')
    )
  `);

  const updateOrderStmt = db.prepare(`
    UPDATE orders SET
      shopify_order_id = ?, order_name = ?, order_date = ?, customer_id = ?, customer_name = ?, customer_email = ?, customer_phone = ?,
      shipping_address = ?, city = ?, province = ?, zip = ?, total_price = ?, subtotal_price = ?, total_discounts = ?, total_tax = ?,
      currency = ?, financial_status = ?, fulfillment_status = ?, payment_gateway_names = ?, tracking_number = ?, tracking_company = ?,
      cancel_reason = ?, cancelled_at = ?, notes = ?, raw_data = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const deleteItemsStmt = db.prepare(`DELETE FROM order_items WHERE order_id = ?`);
  const insertItemStmt = db.prepare(`
    INSERT INTO order_items (order_id, shopify_line_item_id, product_name, variant_title, sku, quantity, price, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertRefundStmt = db.prepare(`
    INSERT OR IGNORE INTO refunds (order_id, shopify_refund_id, amount, note, processed_at, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  try {
    while (hasNextPage) {
      const variables = {
        first: Math.min(limit, 50),
        after: cursor,
        query: queryString || null
      };

      const data = await executeGraphQL(shopDomain, accessToken, query, variables);
      const ordersData = data?.orders;

      if (!ordersData || !ordersData.edges) {
        break;
      }

      const edges = ordersData.edges;
      ordersFetched += edges.length;

      db.exec('BEGIN TRANSACTION;');
      try {
        for (const edge of edges) {
          const node = edge.node;
          const shopifyOrderId = node.id;
          const orderName = node.name || '';
          const orderNumber = orderName.replace(/^[#\s]+/, '') || shopifyOrderId.split('/').pop();

          // Financial & fulfillment statuses
          let finStatus = (node.displayFinancialStatus || 'PAID').toUpperCase();
          if (node.paymentGatewayNames && node.paymentGatewayNames.some(g => g.toLowerCase().includes('cash on delivery') || g.toLowerCase() === 'cod')) {
            finStatus = 'COD';
          }
          let fulStatus = node.displayFulfillmentStatus || 'Unfulfilled';
          if (fulStatus === 'FULFILLED') fulStatus = 'Delivered';

          // Tracking info
          let trackingNum = '';
          let trackingComp = '';
          if (node.fulfillments && node.fulfillments.length > 0) {
            for (const f of node.fulfillments) {
              if (f.trackingInfo && f.trackingInfo.length > 0) {
                trackingNum = f.trackingInfo[0].number || '';
                trackingComp = f.trackingInfo[0].company || '';
                break;
              }
            }
          }

          // Customer parsing
          let customerId = null;
          const rawCust = node.customer;
          const shipping = node.shippingAddress || rawCust?.defaultAddress;
          const fullAddress = shipping ? [shipping.address1, shipping.address2, shipping.city, shipping.province, shipping.zip, shipping.country].filter(Boolean).join(', ') : '';

          if (rawCust) {
            const custId = rawCust.id;
            const existingCust = findCustStmt.get(custId);
            const custName = rawCust.displayName || `${rawCust.firstName || ''} ${rawCust.lastName || ''}`.trim() || 'Shopify Customer';
            const custPhone = rawCust.phone || '';
            const custEmail = rawCust.email || '';

            if (existingCust) {
              customerId = existingCust.id;
              updateCustStmt.run(
                rawCust.firstName || '', rawCust.lastName || '', custName, custEmail, custPhone,
                shipping?.address1 || '', shipping?.address2 || '', shipping?.city || '', shipping?.province || '',
                shipping?.zip || '', shipping?.country || 'India', custId
              );
            } else {
              const res = insertCustStmt.run(
                custId, rawCust.firstName || '', rawCust.lastName || '', custName, custEmail, custPhone,
                shipping?.address1 || '', shipping?.address2 || '', shipping?.city || '', shipping?.province || '',
                shipping?.zip || '', shipping?.country || 'India'
              );
              customerId = res.lastInsertRowid;
            }
          }

          const totalPrice = parseFloat(node.totalPriceSet?.shopMoney?.amount || '0');
          const subtotalPrice = parseFloat(node.subtotalPriceSet?.shopMoney?.amount || '0');
          const totalDiscounts = parseFloat(node.totalDiscountsSet?.shopMoney?.amount || '0');
          const totalTax = parseFloat(node.totalTaxSet?.shopMoney?.amount || '0');
          const currency = node.totalPriceSet?.shopMoney?.currencyCode || 'INR';
          const orderDate = (node.processedAt || node.createdAt || new Date().toISOString()).slice(0, 10);
          const rawJson = JSON.stringify(node);

          // Check existing order
          const existingOrder = findOrderStmt.get(shopifyOrderId, orderNumber);
          let dbOrderId = null;

          if (existingOrder) {
            // Never overwrite manual edits if manual_override is set!
            if (existingOrder.manual_override === 1) {
              console.log(`[Shopify Sync] Skipping update for order #${orderNumber} due to manual override.`);
              continue;
            }

            updateOrderStmt.run(
              shopifyOrderId, orderName, orderDate, customerId,
              rawCust?.displayName || 'Customer', rawCust?.email || '', rawCust?.phone || '',
              fullAddress, shipping?.city || '', shipping?.province || '', shipping?.zip || '',
              totalPrice, subtotalPrice, totalDiscounts, totalTax,
              currency, finStatus, fulStatus, (node.paymentGatewayNames || []).join(', '),
              trackingNum, trackingComp, node.cancelReason || null, node.cancelledAt || null, node.note || '',
              rawJson, existingOrder.id
            );
            dbOrderId = existingOrder.id;
            deleteItemsStmt.run(dbOrderId);
            ordersUpdated++;
          } else {
            const orderRes = insertOrderStmt.run(
              shopifyOrderId, orderNumber, orderName, orderDate, customerId,
              rawCust?.displayName || 'Customer', rawCust?.email || '', rawCust?.phone || '',
              fullAddress, shipping?.city || '', shipping?.province || '', shipping?.zip || '',
              totalPrice, subtotalPrice, totalDiscounts, totalTax,
              currency, finStatus, fulStatus, (node.paymentGatewayNames || []).join(', '),
              trackingNum, trackingComp, node.cancelReason || null, node.cancelledAt || null, node.note || '',
              rawJson
            );
            dbOrderId = orderRes.lastInsertRowid;
            ordersCreated++;
          }

          // Line items
          if (node.lineItems && node.lineItems.edges) {
            for (const itemEdge of node.lineItems.edges) {
              const item = itemEdge.node;
              const itemPrice = parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || item.variant?.price || '0');
              insertItemStmt.run(
                dbOrderId, item.id, item.title, item.variant?.title || '', item.sku || '',
                item.quantity || 1, itemPrice
              );
            }
          }

          // Refunds
          if (node.refunds && node.refunds.length > 0) {
            for (const ref of node.refunds) {
              const refAmt = parseFloat(ref.totalRefundedSet?.shopMoney?.amount || '0');
              insertRefundStmt.run(dbOrderId, ref.id, refAmt, ref.note || '', ref.createdAt || '');
            }
          }
        }
        db.exec('COMMIT;');
      } catch (innerErr) {
        db.exec('ROLLBACK;');
        throw innerErr;
      }

      hasNextPage = ordersData.pageInfo?.hasNextPage && ordersFetched < limit;
      cursor = ordersData.pageInfo?.endCursor;
    }

    // Update store last_synced_at
    const nowIso = new Date().toISOString();
    if (store?.id) {
      db.prepare(`UPDATE stores SET last_synced_at = ?, updated_at = datetime('now') WHERE id = ?`).run(nowIso, store.id);
    }
  } catch (err) {
    syncStatus = 'failed';
    errorMessage = err.message;
    console.error('[Shopify Sync] Error during sync:', err);
  } finally {
    const durationMs = Date.now() - startTime;
    // Record in sync logs
    db.prepare(`
      INSERT INTO sync_logs (store_id, status, orders_fetched, orders_created, orders_updated, error_message, duration_ms, sync_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      store?.id || null, syncStatus, ordersFetched, ordersCreated, ordersUpdated, errorMessage, durationMs, fullSync ? 'initial' : 'manual'
    );
  }

  return {
    success: syncStatus === 'success',
    ordersFetched,
    ordersCreated,
    ordersUpdated,
    durationMs: Date.now() - startTime,
    error: errorMessage
  };
}
