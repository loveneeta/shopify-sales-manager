import express from 'express';
import db from '../db/database.js';
import { testShopifyConnection, syncShopifyOrders, normalizeShopDomain } from '../services/shopify.js';

const router = express.Router();

/**
 * GET /api/shopify/config
 * Get current store config (Never expose full access token)
 */
router.get('/config', (req, res) => {
  try {
    const store = db.prepare('SELECT * FROM stores WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    
    // Check fallback to env
    const domain = store?.shop_domain || process.env.SHOPIFY_SHOP_DOMAIN || '';
    const token = store?.access_token || process.env.SHOPIFY_ACCESS_TOKEN || '';

    // Mask token for security
    let maskedToken = '';
    if (token) {
      maskedToken = token.length > 8 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '••••••••';
    }

    const lastSyncLog = db.prepare('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 1').get();

    res.json({
      success: true,
      config: {
        configured: Boolean(domain && token),
        shopDomain: domain,
        maskedToken,
        hasToken: Boolean(token),
        storeName: store?.name || '',
        currency: store?.currency || 'INR',
        lastSyncedAt: store?.last_synced_at || null,
        autoSyncInterval: store?.auto_sync_interval || 15,
        isActive: store ? Boolean(store.is_active) : false
      },
      lastSyncLog
    });
  } catch (err) {
    console.error('[Shopify Config GET] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/shopify/config
 * Save store credentials safely into SQLite database
 */
router.post('/config', async (req, res) => {
  try {
    const { shopDomain, accessToken, autoSyncInterval = 15 } = req.body;

    if (!shopDomain) {
      return res.status(400).json({ success: false, error: 'Shop domain is required' });
    }

    const cleanDomain = normalizeShopDomain(shopDomain);
    const existing = db.prepare('SELECT * FROM stores WHERE shop_domain = ?').get(cleanDomain);

    // If new token provided, use it; otherwise retain existing
    let tokenToSave = accessToken;
    if (!tokenToSave && existing) {
      tokenToSave = existing.access_token;
    }

    if (!tokenToSave) {
      return res.status(400).json({ success: false, error: 'Shopify Admin API Access Token is required' });
    }

    // Verify token with Shopify before saving if provided
    let storeName = cleanDomain;
    if (tokenToSave) {
      const testRes = await testShopifyConnection(cleanDomain, tokenToSave);
      if (testRes.success) {
        storeName = testRes.shop.name;
      }
    }

    if (existing) {
      db.prepare(`
        UPDATE stores SET
          access_token = ?,
          name = ?,
          auto_sync_interval = ?,
          is_active = 1,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(tokenToSave, storeName, parseInt(autoSyncInterval) || 15, existing.id);
    } else {
      db.prepare(`
        INSERT INTO stores (shop_domain, access_token, name, auto_sync_interval, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(cleanDomain, tokenToSave, storeName, parseInt(autoSyncInterval) || 15);
    }

    res.json({
      success: true,
      message: `Shopify store ${cleanDomain} configured successfully!`,
      storeName
    });
  } catch (err) {
    console.error('[Shopify Config POST] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/shopify/test-connection
 * Live test connection using domain and token
 */
router.post('/test-connection', async (req, res) => {
  try {
    let { shopDomain, accessToken } = req.body;

    // If omitted, load from database
    if (!shopDomain || !accessToken) {
      const store = db.prepare('SELECT * FROM stores WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
      if (store) {
        shopDomain = shopDomain || store.shop_domain;
        accessToken = accessToken || store.access_token;
      }
    }

    if (!shopDomain || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing store domain or access token. Please provide credentials to test.'
      });
    }

    const result = await testShopifyConnection(shopDomain, accessToken);
    res.json(result);
  } catch (err) {
    console.error('[Shopify Test Connection] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/shopify/sync
 * Trigger manual or full sync
 */
router.post('/sync', async (req, res) => {
  try {
    const fullSync = req.body.fullSync === true;
    const result = await syncShopifyOrders({ fullSync });
    res.json(result);
  } catch (err) {
    console.error('[Shopify Sync POST] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/shopify/sync-logs
 */
router.get('/sync-logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 20').all();
    res.json({ success: true, logs });
  } catch (err) {
    console.error('[Shopify Sync Logs] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
