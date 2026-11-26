import cron from 'node-cron';
import db from '../db/database.js';
import { syncShopifyOrders } from './shopify.js';

let cronTask = null;

export function initSyncScheduler() {
  console.log('[Sync Scheduler] Initializing Shopify automatic sync runner...');

  // Default every 15 minutes: '*/15 * * * *'
  cronTask = cron.schedule('*/15 * * * *', async () => {
    console.log('[Sync Scheduler] Running scheduled Shopify sync...');
    try {
      const activeStore = db.prepare('SELECT id, is_active FROM stores WHERE is_active = 1 LIMIT 1').get();
      if (!activeStore) {
        console.log('[Sync Scheduler] No active Shopify store configured. Skipping.');
        return;
      }
      const result = await syncShopifyOrders({ storeId: activeStore.id, fullSync: false });
      console.log(`[Sync Scheduler] Auto-sync finished: Fetched ${result.ordersFetched}, Created ${result.ordersCreated}, Updated ${result.ordersUpdated}`);
    } catch (err) {
      console.error('[Sync Scheduler] Auto-sync error:', err.message);
    }
  });

  console.log('[Sync Scheduler] Auto-sync scheduled for every 15 minutes.');
}

export function stopSyncScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Sync Scheduler] Auto-sync stopped.');
  }
}
