require('dotenv').config();
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');
const getDatabaseConfig = require('./db-config.cjs');

async function syncServicePoints() {
  const connection = await mysql.createConnection(getDatabaseConfig());

  try {
    // 1. 确保 service_evaluations 表存在 is_synced 列
    const [cols] = await connection.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      ['service_evaluations', 'is_synced'],
    );
    if (!cols.length) {
      await connection.query(
        "ALTER TABLE `service_evaluations` ADD COLUMN `is_synced` tinyint(1) NOT NULL DEFAULT 0 AFTER `status`",
      );
      console.log('Added is_synced column to service_evaluations');
    }

    // 2. 查找所有未同步积分的评价记录
    const [evaluations] = await connection.query(`
      SELECT se.id, se.points_awarded, se.service_record_id, se.participant_id, se.settlement_type, sp.user_id as participant_user_id
      FROM service_evaluations se
      LEFT JOIN service_participants sp ON se.participant_id = sp.id
      WHERE se.is_synced = 0
    `);

    console.log(`Found ${evaluations.length} unsynced service evaluations.`);

    for (const ev of evaluations) {
      const [ledgers] = await connection.query(
        'SELECT user_id, points_delta FROM point_ledger WHERE source_id = ?',
        [ev.id],
      );

      if (ledgers.length > 0) {
        for (const ledger of ledgers) {
          const delta = Number(ledger.points_delta || 0);
          const positiveDelta = Math.max(0, delta);
          await connection.query(
            `UPDATE users 
             SET points_balance = GREATEST(0, points_balance + ?),
                 points_earned_lifetime = points_earned_lifetime + ?
             WHERE id = ?`,
            [delta, positiveDelta, ledger.user_id],
          );
          console.log(`Synced user ${ledger.user_id}: balance delta ${delta}, lifetime delta ${positiveDelta}`);
        }
      } else if (ev.participant_user_id && Number(ev.points_awarded) > 0) {
        const delta = Number(ev.points_awarded);
        await connection.query(
          `UPDATE users 
           SET points_balance = GREATEST(0, points_balance + ?),
               points_earned_lifetime = points_earned_lifetime + ?
           WHERE id = ?`,
          [delta, delta, ev.participant_user_id],
        );

        const ledgerId = `pl-${randomUUID()}`;
        await connection.query(
          `INSERT INTO point_ledger (id, user_id, source_type, source_id, target_type, target_id, points_delta, reason, operator_id)
           VALUES (?, ?, ?, ?, 'user', ?, ?, '客户服务历史评价积分同步补齐', 'system')`,
          [ledgerId, ev.participant_user_id, ev.settlement_type || 'service_standalone', ev.id, ev.participant_user_id, delta],
        );
        console.log(`Fallback synced user ${ev.participant_user_id}: +${delta} eP`);
      }

      await connection.query('UPDATE service_evaluations SET is_synced = 1 WHERE id = ?', [ev.id]);
    }

    console.log('Customer service points synchronization completed successfully.');
  } finally {
    await connection.end();
  }
}

syncServicePoints().catch((error) => {
  console.error('Service points synchronization failed:', error);
  process.exitCode = 1;
});
