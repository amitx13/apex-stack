
import cron from 'node-cron';
import { processReentryQueue } from '../services/reentry.service';
import { runSettlementSweep } from './settlementSweep';
import { runAutoPayCron } from '../services/autopay.service';

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
  }, {
    timezone: 'Asia/Kolkata', // ✅ IST
  });

  console.log(`✅ Re-entry cron job started (${isProduction ? 'hourly' : 'every 5 min'})`);
}

export function startSettlementCron() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Production: "59 23 * * *" = Every day at 11:59 PM
  // Development: "*/5 * * * *" = every 5 minutes
  const schedule = isProduction ? '59 23 * * *' : '*/5 * * * *';

  cron.schedule(schedule, async () => {
    try {
      await runSettlementSweep();
    } catch (error: any) {
      console.error('❌ Re-entry cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata', // ✅ IST
  });

  console.log(`✅ SettleMent cron job started (${isProduction ? 'at midnight' : 'every 5 min'})`);
}

export function startAutopayCorn() {

  const isProduction = process.env.NODE_ENV === 'production';

  const schedule = isProduction ? '0 9 5,10,15 * *' : '*/5 * * * *';

  cron.schedule(
    schedule,
    async () => {
      const today = new Date();
      const date = today.getDate();

      const dueDateMap: Record<number, 'FIVE' | 'TEN' | 'FIFTEEN'> = {
        5: 'FIVE',
        10: 'TEN',
        15: 'FIFTEEN',
      };

      const dueDate = dueDateMap[date];
      if (!dueDate) return;

      console.log(`[AutoPay Cron] Running for dueDate: ${dueDate}`);

      try {
        const results = await runAutoPayCron(dueDate);
        console.log(`[AutoPay Cron] Done:`, results);
      } catch (error) {
        console.error(`[AutoPay Cron] Fatal error:`, error);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  console.log('[AutoPay Cron] Scheduled for 5th, 10th, 15th at 9:00 AM IST');
}