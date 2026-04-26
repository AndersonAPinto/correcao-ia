/**
 * process-scheduled-deletions.js
 *
 * Background job: anonymizes accounts whose 30-day grace period has expired.
 * This is the LGPD/CCPA data-erasure step (Phase 3 of deletion lifecycle).
 *
 * Run manually:
 *   node scripts/process-scheduled-deletions.js
 *
 * Schedule via cron (daily at 02:00 UTC):
 *   0 2 * * * node /path/to/scripts/process-scheduled-deletions.js >> /var/log/deletions.log 2>&1
 *
 * Or via Vercel Cron (vercel.json):
 *   { "crons": [{ "path": "/api/cron/process-deletions", "schedule": "0 2 * * *" }] }
 *   Then create app/api/cron/process-deletions/route.js calling this logic.
 *
 * What this does per eligible user:
 *   1. name   → "Deleted User"
 *   2. email  → "deleted+{id}@correcao-ia.com"  (unique, non-identifiable)
 *   3. password hash removed (empty string)
 *   4. status → "deleted"
 *   5. Audit log entry written
 *
 * What is intentionally preserved:
 *   - user.id  (internal FK for billing/assessment records)
 *   - avaliacoes_corrigidas, turmas, alunos rows (anonymized userId still links them)
 *   - logs_auditoria rows (regulatory compliance)
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME   = process.env.DB_NAME || 'correcao-ia';

if (!MONGO_URL) {
  console.error('[DELETION JOB] MONGO_URL not set. Aborting.');
  process.exit(1);
}

const client = new MongoClient(MONGO_URL, {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
});

async function run() {
  await client.connect();
  const db = client.db(DB_NAME);

  const now = new Date();
  console.log(`[DELETION JOB] Starting at ${now.toISOString()}`);

  const pending = await db.collection('users').find({
    status: 'pending_deletion',
    scheduledAnonymizeAt: { $lte: now },
  }).toArray();

  console.log(`[DELETION JOB] Found ${pending.length} account(s) due for anonymization.`);

  let processed = 0;
  let errors = 0;

  for (const user of pending) {
    try {
      // status guard prevents double-processing in concurrent runs
      const result = await db.collection('users').updateOne(
        { id: user.id, status: 'pending_deletion' },
        {
          $set: {
            status: 'deleted',
            name: 'Deleted User',
            email: `deleted+${user.id}@correcao-ia.com`,
            password: '',
            emailVerified: false,
            anonymizedAt: now,
          },
          $unset: { scheduledAnonymizeAt: '' },
        }
      );

      if (result.modifiedCount === 0) {
        console.warn(`[DELETION JOB] User ${user.id} was already processed by another run, skipping.`);
        continue;
      }

      // Audit log — original email kept for dispute resolution (legally permissible)
      await db.collection('logs_auditoria').insertOne({
        id: crypto.randomUUID(),
        userId: user.id,
        acao: 'account_anonymized',
        detalhes: {
          originalEmail: user.email,
          anonymizedEmail: `deleted+${user.id}@correcao-ia.com`,
          gracePeriodExpired: true,
        },
        ip: 'background-job',
        userAgent: 'process-scheduled-deletions',
        createdAt: now,
      });

      processed++;
      console.log(`[DELETION JOB] ✅ Anonymized user ${user.id}`);
    } catch (err) {
      errors++;
      console.error(`[DELETION JOB] ❌ Failed to anonymize user ${user.id}: ${err.message}`);
    }
  }

  console.log(`[DELETION JOB] Done. Processed: ${processed}, Errors: ${errors}`);
  return { processed, errors };
}

run()
  .catch((err) => {
    console.error('[DELETION JOB] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => client.close());
