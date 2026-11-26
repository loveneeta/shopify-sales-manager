import express from 'express';
import db from '../db/database.js';

const router = express.Router();

/**
 * GET /api/orders
 * Pagination, Search, Filter, Sort
 */
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const {
      search = '',
      startDate,
      endDate,
      financialStatus,
      fulfillmentStatus,
      source,
      sortBy = 'order_date',
      sortOrder = 'DESC'
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (
        o.order_number LIKE ? OR
        o.customer_name LIKE ? OR
        o.customer_phone LIKE ? OR
        o.customer_email LIKE ? OR
        o.tracking_number LIKE ? OR
        EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_name LIKE ?)
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    if (startDate) {
      whereClause += ` AND o.order_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND o.order_date <= ?`;
      params.push(endDate);
    }

    if (financialStatus && financialStatus !== 'ALL') {
      whereClause += ` AND o.financial_status = ?`;
      params.push(financialStatus);
    }

    if (fulfillmentStatus && fulfillmentStatus !== 'ALL') {
      whereClause += ` AND o.fulfillment_status = ?`;
      params.push(fulfillmentStatus);
    }

    if (source && source !== 'ALL') {
      whereClause += ` AND o.source = ?`;
      params.push(source);
    }

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).total;

    // Allowed sort columns
    const allowedSorts = ['order_date', 'order_number', 'total_price', 'customer_name', 'financial_status', 'fulfillment_status'];
    const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'order_date';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const ordersSql = `
      SELECT
        o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as itemCount,
        (SELECT GROUP_CONCAT(oi.product_name, ' | ') FROM order_items oi WHERE oi.order_id = o.id) as productSummary,
        (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as totalQuantity
      FROM orders o
      ${whereClause}
      ORDER BY o.${safeSort} ${safeOrder}, o.id DESC
      LIMIT ? OFFSET ?
    `;

    const orders = db.prepare(ordersSql).all(...params, limit, offset);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('[Orders GET] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/:id
 * Full order details with items, customer, refunds
 */
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const customer = order.customer_id ? db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id) : null;
    const refunds = db.prepare('SELECT * FROM refunds WHERE order_id = ?').all(order.id);

    res.json({
      success: true,
      order: {
        ...order,
        items,
        customer,
        refunds
      }
    });
  } catch (err) {
    console.error('[Order Details] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orders
 * Add order manually
 */
router.post('/', (req, res) => {
  try {
    const {
      orderNumber,
      orderDate,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      city,
      province,
      zip,
      totalPrice,
      financialStatus = 'PAID',
      fulfillmentStatus = 'Delivered',
      trackingNumber,
      trackingCompany,
      notes,
      items = []
    } = req.body;

    if (!orderNumber || !orderDate) {
      return res.status(400).json({ success: false, error: 'Order Number and Order Date are required' });
    }

    const cleanOrderNumber = String(orderNumber).replace(/^[#\s]+/, '').trim();
    const existing = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(cleanOrderNumber);
    if (existing) {
      return res.status(400).json({ success: false, error: `Order #${cleanOrderNumber} already exists in database.` });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // Find or create customer
      let customerId = null;
      if (customerName || customerPhone || customerEmail) {
        const custRes = db.prepare(`
          INSERT INTO customers (full_name, email, phone, address_line1, city, province, zip, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          customerName || 'Customer', customerEmail || '', customerPhone || '',
          shippingAddress || '', city || '', province || '', zip || ''
        );
        customerId = custRes.lastInsertRowid;
      }

      const total = parseFloat(totalPrice) || 0.0;
      const orderRes = db.prepare(`
        INSERT INTO orders (
          order_number, order_name, order_date, customer_id, customer_name, customer_email, customer_phone,
          shipping_address, city, province, zip, total_price, subtotal_price, total_discounts, total_tax,
          currency, financial_status, fulfillment_status, tracking_number, tracking_company,
          notes, source, is_manual, manual_override, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, 0, 0,
          'INR', ?, ?, ?, ?,
          ?, 'manual', 1, 1, datetime('now'), datetime('now')
        )
      `).run(
        cleanOrderNumber, `#${cleanOrderNumber}`, orderDate, customerId,
        customerName || '', customerEmail || '', customerPhone || '',
        shippingAddress || '', city || '', province || '', zip || '',
        total, total, financialStatus, fulfillmentStatus, trackingNumber || '', trackingCompany || '',
        notes || ''
      );

      const orderId = orderRes.lastInsertRowid;

      // Add line items
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_name, quantity, price, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      if (items.length > 0) {
        for (const it of items) {
          insertItemStmt.run(orderId, it.productName || 'Item', parseInt(it.quantity) || 1, parseFloat(it.price) || 0);
        }
      } else {
        insertItemStmt.run(orderId, 'Item', 1, total);
      }

      db.exec('COMMIT;');
      res.json({ success: true, orderId, message: `Order #${cleanOrderNumber} created successfully.` });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    console.error('[Order Create] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/orders/:id
 * Edit order
 */
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const {
      orderDate,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      city,
      province,
      zip,
      totalPrice,
      financialStatus,
      fulfillmentStatus,
      trackingNumber,
      trackingCompany,
      notes,
      items,
      manualOverride = true
    } = req.body;

    db.exec('BEGIN TRANSACTION;');
    try {
      const total = totalPrice !== undefined ? parseFloat(totalPrice) : existing.total_price;

      db.prepare(`
        UPDATE orders SET
          order_date = COALESCE(?, order_date),
          customer_name = COALESCE(?, customer_name),
          customer_phone = COALESCE(?, customer_phone),
          customer_email = COALESCE(?, customer_email),
          shipping_address = COALESCE(?, shipping_address),
          city = COALESCE(?, city),
          province = COALESCE(?, province),
          zip = COALESCE(?, zip),
          total_price = ?,
          financial_status = COALESCE(?, financial_status),
          fulfillment_status = COALESCE(?, fulfillment_status),
          tracking_number = COALESCE(?, tracking_number),
          tracking_company = COALESCE(?, tracking_company),
          notes = COALESCE(?, notes),
          manual_override = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        orderDate, customerName, customerPhone, customerEmail,
        shippingAddress, city, province, zip, total,
        financialStatus, fulfillmentStatus, trackingNumber, trackingCompany,
        notes, manualOverride ? 1 : existing.manual_override, existing.id
      );

      // If items provided, replace items
      if (Array.isArray(items) && items.length > 0) {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(existing.id);
        const insertItem = db.prepare(`
          INSERT INTO order_items (order_id, product_name, quantity, price, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `);
        for (const it of items) {
          insertItem.run(existing.id, it.productName || 'Item', parseInt(it.quantity) || 1, parseFloat(it.price) || 0);
        }
      }

      db.exec('COMMIT;');
      res.json({ success: true, message: `Order #${existing.order_number} updated successfully.` });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    console.error('[Order Update] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/orders/:id
 * Delete manually created order (or guard Shopify-originated orders)
 */
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Protection rule: Never delete Shopify-originated data without explicit force
    const force = req.query.force === 'true';
    if (existing.source === 'shopify' && !force) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete an active Shopify-synced order. If you truly wish to remove it, pass force=true.'
      });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(existing.id);
      db.prepare('DELETE FROM refunds WHERE order_id = ?').run(existing.id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(existing.id);
      db.exec('COMMIT;');
      res.json({ success: true, message: `Order #${existing.order_number} deleted.` });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    console.error('[Order Delete] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
