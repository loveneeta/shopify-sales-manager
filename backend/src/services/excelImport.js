import xlsx from 'xlsx';
import db from '../db/database.js';

/**
 * Standard column aliases for smart header detection
 */
const COLUMN_ALIASES = {
  sno: ['s.no.', 'sno', 'sr no', 's.no', 'sr. no.', 'sr.no', 'sl no', 'serial no'],
  date: ['date', 'order date', 'order_date', 'created_at', 'invoice date'],
  orderNumber: ['#order', 'order', 'order #', 'order number', 'order_number', 'order id', 'order_id', 'invoice no'],
  customerName: ['customer name', 'customer', 'name', 'client name', 'buyer name'],
  address: ['address', 'shipping address', 'delivery address', 'shipping_address', 'customer address'],
  contact: ['contact', 'phone', 'contact number', 'mobile', 'email', 'phone number', 'contact details'],
  product: ['product', 'products', 'item', 'items', 'product name', 'item name', 'line items'],
  qty: ['qty', 'quantity', 'units', 'count', 'total qty', 'quantity sold'],
  price: ['price', 'order amount', 'total', 'amount', 'total price', 'order value', 'revenue'],
  paymentStatus: ['cod/ paid', 'cod/paid', 'payment status', 'pay status', 'payment mode', 'payment type', 'payment'],
  tracking: ['tracking', 'tracking number', 'awb', 'waybill', 'tracking #', 'courier tracking'],
  status: ['status', 'order status', 'delivery status', 'fulfillment status', 'fulfillment']
};

/**
 * Clean currency string to float
 */
export function cleanPrice(val) {
  if (val === null || val === undefined || val === '') return 0.0;
  if (typeof val === 'number') return isNaN(val) ? 0.0 : val;
  const str = String(val)
    .replace(/[₹$,]/g, '')
    .replace(/\s+/g, '')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0.0 : num;
}

/**
 * Parse raw date value (handles Date objects, excel numbers, strings with typos like '18-07-206')
 */
export function parseDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  
  // If already Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  // If Excel serial number (e.g., 45433)
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    return jsDate.toISOString().slice(0, 10);
  }

  const str = String(val).trim();

  // Fix known typo '18-07-206' -> '2026-07-18'
  if (str.includes('-206')) {
    const fixed = str.replace('-206', '-2026');
    const parts = fixed.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  // Check YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse contact string into phone and email
 */
export function parseContact(contactStr) {
  if (!contactStr) return { phone: '', email: '' };
  const lines = String(contactStr).split('\n').map(l => l.trim()).filter(Boolean);
  let phone = '';
  let email = '';

  for (const line of lines) {
    if (line.includes('@')) {
      email = line;
    } else if (/\d/.test(line)) {
      if (!phone) phone = line;
    }
  }

  // If both are inline separated by space or comma
  if (!email && String(contactStr).includes('@')) {
    const emailMatch = contactStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) email = emailMatch[0];
  }
  if (!phone) {
    const phoneMatch = contactStr.match(/(\+?\d[\d\s-]{8,}\d)/);
    if (phoneMatch) phone = phoneMatch[0].trim();
  }

  return { phone, email };
}

/**
 * Parse address into addressLine, city, province, zip
 */
export function parseAddress(addrStr) {
  if (!addrStr) return { fullAddress: '', city: '', province: '', zip: '' };
  const full = String(addrStr).trim();
  let zip = '';
  let province = '';
  let city = '';

  // Match 6 digit Indian pin code e.g. 560018
  const pinMatch = full.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    zip = pinMatch[1];
  }

  // Match common state codes e.g. KA, MH, DL, TG, HR, GJ, TN, UP, WB, KL
  const stateMatch = full.match(/\b(KA|MH|DL|TG|HR|GJ|TN|UP|WB|KL|GA|RJ|OR|MP|JH|CT|BR|AS|MZ|AR|UT|HP|JK|LA|CH)\b/i);
  if (stateMatch) {
    province = stateMatch[1].toUpperCase();
  }

  // City is often the word preceding the state code or pincode
  if (zip) {
    const afterPin = full.split(zip)[1];
    if (afterPin) {
      const cityWords = afterPin.trim().split(/\s+/);
      if (cityWords.length > 0 && cityWords[0] !== province) {
        city = cityWords[0];
      }
    }
  }

  return {
    fullAddress: full,
    city: city || '',
    province: province || '',
    zip: zip || ''
  };
}

/**
 * Automatically detect which sheet column matches which target field
 */
export function detectColumnMapping(headers) {
  const mapping = {};
  headers.forEach((h, idx) => {
    if (!h) return;
    const cleanH = String(h).toLowerCase().trim();
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (!mapping[key] && aliases.some(alias => cleanH === alias || cleanH.startsWith(alias))) {
        mapping[key] = h;
      }
    }
  });
  return mapping;
}

/**
 * Preview an uploaded workbook/CSV
 */
export function previewFile(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: true });
  // Prefer Sheet1 or first sheet
  const sheetName = wb.SheetNames.includes('Sheet1') ? 'Sheet1' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  // Find header row: scan first 5 rows for column names like '#ORDER', 'DATE', 'PRICE'
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
  let headerRowIndex = 0;
  let headers = [];

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    if (Array.isArray(row)) {
      const matchScore = row.filter(cell => {
        if (!cell) return false;
        const cStr = String(cell).toLowerCase();
        return cStr.includes('order') || cStr.includes('date') || cStr.includes('product') || cStr.includes('price');
      }).length;
      if (matchScore >= 2) {
        headerRowIndex = r;
        headers = row.map(c => c ? String(c).trim() : '');
        break;
      }
    }
  }

  if (headers.length === 0 && rawRows.length > 0) {
    headers = rawRows[0].map((c, i) => c ? String(c).trim() : `Col_${i + 1}`);
  }

  // Detect mapping
  const detectedMapping = detectColumnMapping(headers);

  // Extract preview rows (up to 10 rows)
  const previewRows = [];
  let validOrderCount = 0;
  let totalRows = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;
    totalRows++;

    const rowObj = {};
    headers.forEach((h, idx) => {
      if (h) rowObj[h] = row[idx];
    });

    // Check if valid order row
    const orderCol = detectedMapping.orderNumber;
    const orderVal = orderCol ? rowObj[orderCol] : null;
    if (orderVal !== null && orderVal !== undefined && String(orderVal).trim() !== '') {
      validOrderCount++;
      if (previewRows.length < 10) {
        previewRows.push(rowObj);
      }
    }
  }

  return {
    sheetName,
    sheetNames: wb.SheetNames,
    headerRowIndex,
    headers: headers.filter(Boolean),
    detectedMapping,
    previewRows,
    estimatedTotalOrders: validOrderCount,
    totalRows
  };
}

/**
 * Execute import of Excel or CSV file
 */
export function executeImport(filePath, mappingOverride = {}, duplicateStrategy = 'skip') {
  const wb = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames.includes('Sheet1') ? 'Sheet1' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
  let headerRowIndex = 0;
  let headers = [];

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    if (Array.isArray(row)) {
      const matchScore = row.filter(cell => {
        if (!cell) return false;
        const cStr = String(cell).toLowerCase();
        return cStr.includes('order') || cStr.includes('date') || cStr.includes('product') || cStr.includes('price');
      }).length;
      if (matchScore >= 2) {
        headerRowIndex = r;
        headers = row.map(c => c ? String(c).trim() : '');
        break;
      }
    }
  }

  const detected = detectColumnMapping(headers);
  const mapping = { ...detected, ...mappingOverride };

  const insertCustomerStmt = db.prepare(`
    INSERT INTO customers (full_name, email, phone, address_line1, city, province, zip, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const findCustomerStmt = db.prepare(`
    SELECT id FROM customers WHERE (phone = ? AND phone != '') OR (email = ? AND email != '') OR (full_name = ? AND full_name != '') LIMIT 1
  `);

  const findOrderStmt = db.prepare(`
    SELECT id, source, is_manual, manual_override FROM orders WHERE order_number = ? LIMIT 1
  `);

  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (
      order_number, order_name, order_date, customer_id, customer_name, customer_email, customer_phone,
      shipping_address, city, province, zip, total_price, subtotal_price, total_discounts, total_tax,
      currency, financial_status, fulfillment_status, tracking_number, notes, source, is_manual, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      'INR', ?, ?, ?, ?, 'excel_import', 0, datetime('now'), datetime('now')
    )
  `);

  const updateOrderStmt = db.prepare(`
    UPDATE orders SET
      order_date = ?, customer_id = ?, customer_name = ?, customer_email = ?, customer_phone = ?,
      shipping_address = ?, city = ?, province = ?, zip = ?, total_price = ?, subtotal_price = ?,
      financial_status = ?, fulfillment_status = ?, tracking_number = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const deleteItemsStmt = db.prepare(`DELETE FROM order_items WHERE order_id = ?`);

  const insertItemStmt = db.prepare(`
    INSERT INTO order_items (order_id, product_name, quantity, price, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const insertProductStmt = db.prepare(`
    INSERT OR IGNORE INTO products (title, selling_price, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `);

  let importedRows = 0;
  let skippedRows = 0;
  let errorCount = 0;
  const errors = [];

  // Begin transaction
  db.exec('BEGIN TRANSACTION;');

  try {
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

      const rowMap = {};
      headers.forEach((h, idx) => {
        if (h) rowMap[h] = row[idx];
      });

      const rawOrderNo = rowMap[mapping.orderNumber];
      if (rawOrderNo === null || rawOrderNo === undefined || String(rawOrderNo).trim() === '') {
        continue; // skip blank / summary rows
      }

      const orderNumber = String(rawOrderNo).replace(/^[#\s]+/, '').trim();
      const orderName = `#${orderNumber}`;

      // Check existing order
      const existing = findOrderStmt.get(orderNumber);
      if (existing) {
        if (duplicateStrategy === 'skip') {
          skippedRows++;
          continue;
        }
        // If from Shopify and manual_override is 0, protect Shopify data!
        if (existing.source === 'shopify' && existing.manual_override === 0) {
          skippedRows++;
          continue;
        }
      }

      // Parse fields
      const dateVal = parseDate(rowMap[mapping.date]);
      const custName = rowMap[mapping.customerName] ? String(rowMap[mapping.customerName]).trim() : '';
      const contactInfo = parseContact(rowMap[mapping.contact]);
      const addrInfo = parseAddress(rowMap[mapping.address]);
      const totalAmount = cleanPrice(rowMap[mapping.price]);
      const rawPayStat = rowMap[mapping.paymentStatus] ? String(rowMap[mapping.paymentStatus]).toUpperCase().trim() : 'PAID';
      const financialStatus = rawPayStat.includes('COD') ? 'COD' : 'PAID';
      
      let rawFulfill = rowMap[mapping.status] ? String(rowMap[mapping.status]).trim() : 'Delivered';
      let fulfillmentStatus = 'Delivered';
      let notes = '';

      if (rawFulfill.toLowerCase().includes('in transit')) {
        fulfillmentStatus = 'In Transit';
      } else if (rawFulfill.toLowerCase().includes('pending')) {
        fulfillmentStatus = 'Pending';
      } else if (rawFulfill.toLowerCase().includes('rto')) {
        fulfillmentStatus = 'RTO';
      } else if (rawFulfill.toLowerCase().includes('cancel')) {
        fulfillmentStatus = 'Cancelled';
      } else if (rawFulfill.toLowerCase().includes('delivered')) {
        fulfillmentStatus = 'Delivered';
      } else {
        fulfillmentStatus = rawFulfill || 'Delivered';
      }

      // Notes in extra columns if any
      const colL = row[12];
      const colM = row[13];
      if (colL && typeof colL === 'string' && colL.length > 3) notes = colL.trim();
      if (colM && typeof colM === 'string' && colM.length > 3) notes += (notes ? ' | ' : '') + colM.trim();

      const trackingNumber = rowMap[mapping.tracking] ? String(rowMap[mapping.tracking]).trim() : '';

      // Find or insert customer
      let customerId = null;
      const existingCust = findCustomerStmt.get(contactInfo.phone, contactInfo.email, custName);
      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const custRes = insertCustomerStmt.run(
          custName, contactInfo.email, contactInfo.phone,
          addrInfo.fullAddress, addrInfo.city, addrInfo.province, addrInfo.zip
        );
        customerId = custRes.lastInsertRowid;
      }

      let orderId = null;
      if (existing && duplicateStrategy === 'update') {
        updateOrderStmt.run(
          dateVal, customerId, custName, contactInfo.email, contactInfo.phone,
          addrInfo.fullAddress, addrInfo.city, addrInfo.province, addrInfo.zip,
          totalAmount, totalAmount, financialStatus, fulfillmentStatus, trackingNumber, notes, existing.id
        );
        orderId = existing.id;
        deleteItemsStmt.run(orderId);
      } else {
        const orderRes = insertOrderStmt.run(
          orderNumber, orderName, dateVal, customerId, custName, contactInfo.email, contactInfo.phone,
          addrInfo.fullAddress, addrInfo.city, addrInfo.province, addrInfo.zip,
          totalAmount, totalAmount, 0, 0, financialStatus, fulfillmentStatus, trackingNumber, notes
        );
        orderId = orderRes.lastInsertRowid;
      }

      // Parse product(s) and quantities with smart variant combining
      const rawProduct = rowMap[mapping.product];
      const rawQty = rowMap[mapping.qty];
      const totalQty = parseInt(rawQty) || 1;

      if (rawProduct) {
        const variantsSet = new Set(['s', 'm', 'l', 'xl', 'xxl', 'red', 'yellow', 'blue', 'green', 'black', 'white', 'brown', 'dark brown']);
        const rawLines = String(rawProduct).split('\n').map(p => p.trim()).filter(Boolean);
        const resolvedItems = [];
        let baseProd = null;

        for (const line of rawLines) {
          const isVariant = variantsSet.has(line.toLowerCase()) || (line.length <= 2 && /^[a-zA-Z]+$/.test(line));
          if (isVariant && baseProd) {
            if (resolvedItems.length > 0 && resolvedItems[resolvedItems.length - 1] === baseProd) {
              resolvedItems[resolvedItems.length - 1] = `${baseProd} (${line.toUpperCase()})`;
            } else {
              resolvedItems.push(`${baseProd} (${line.toUpperCase()})`);
            }
          } else {
            baseProd = line;
            resolvedItems.push(line);
          }
        }

        const numItems = resolvedItems.length || 1;
        const itemQty = Math.max(1, Math.round(totalQty / numItems));
        const itemPrice = totalAmount / numItems;

        for (const pName of resolvedItems) {
          insertItemStmt.run(orderId, pName, itemQty, itemPrice);
          insertProductStmt.run(pName, itemPrice / itemQty);
        }
      } else {
        insertItemStmt.run(orderId, 'Item', totalQty, totalAmount);
      }

      importedRows++;
    }

    // Check if side summary expenses exist in rows 3-10 (e.g. Meta Ads, Delhivery)
    // In Daily Sales Tracker.xlsx:
    // Row 4: META ADS 271176
    // Row 4 & 5: DELHIVERY 101363, 47985
    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r];
      if (Array.isArray(row)) {
        for (let c = 12; c < row.length; c++) {
          const val = row[c];
          if (val === 'META ADS') {
            const amount = cleanPrice(row[c + 1]);
            if (amount > 0) {
              const existingExp = db.prepare('SELECT id FROM expenses WHERE category = ? AND amount = ?').get('Meta Ads', amount);
              if (!existingExp) {
                db.prepare(`
                  INSERT INTO expenses (category, description, amount, expense_date, source, notes, created_at, updated_at)
                  VALUES ('Meta Ads', 'Meta Ads historical campaign spend from tracker', ?, '2026-05-21', 'excel_import', 'Imported from Daily Sales Tracker summary', datetime('now'), datetime('now'))
                `).run(amount);
              }
            }
          } else if (val === 'DELHIVERY') {
            const amount = cleanPrice(row[c + 7] || row[c + 1]);
            if (amount > 0) {
              const existingExp = db.prepare('SELECT id FROM expenses WHERE category = ? AND amount = ?').get('Delhivery / Shipping', amount);
              if (!existingExp) {
                db.prepare(`
                  INSERT INTO expenses (category, description, amount, expense_date, source, notes, created_at, updated_at)
                  VALUES ('Delhivery / Shipping', 'Delhivery logistics spend from tracker', ?, '2026-05-21', 'excel_import', 'Imported from Daily Sales Tracker summary', datetime('now'), datetime('now'))
                `).run(amount);
              }
            }
          }
        }
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    errorCount++;
    errors.push(err.message);
    throw err;
  }

  // Record in import history
  db.prepare(`
    INSERT INTO import_history (filename, file_type, total_rows, imported_rows, skipped_rows, error_count, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    filePath.split(/[/\\]/).pop(),
    filePath.endsWith('.csv') ? 'CSV' : 'XLSX',
    importedRows + skippedRows,
    importedRows,
    skippedRows,
    errorCount,
    JSON.stringify({ errors })
  );

  return {
    success: true,
    importedRows,
    skippedRows,
    errorCount,
    errors
  };
}
