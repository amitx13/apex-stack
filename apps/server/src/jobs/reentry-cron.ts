
import cron from 'node-cron';
import { processReentryQueue } from '../services/reentry.service';

/**
 * Start re-entry cron job
 * Production: Every hour at minute 0
 * Development: Every 5 minutes for testing
 */
export function startReentryCron() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Production: "0 * * * *" = every hour
  // Development: "*/5 * * * *" = every 5 minutes
  const schedule = isProduction ? '0 * * * *' : '*/5 * * * *';
  
  cron.schedule(schedule, async () => {
    try {
      await processReentryQueue();
    } catch (error: any) {
      console.error('❌ Re-entry cron job error:', error.message);
    }
  });

  console.log(`✅ Re-entry cron job started (${isProduction ? 'hourly' : 'every 5 min'})`);
}
