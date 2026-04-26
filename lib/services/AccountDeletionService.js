/**
 * AccountDeletionService — orchestrates the full user account deletion lifecycle.
 *
 * Deletion is a 3-phase process:
 *
 *   Phase 1 — Initiation (immediate, user-triggered)
 *     • Verify password
 *     • Soft-delete: status → 'pending_deletion', store deletedAt + scheduledAnonymizeAt
 *     • Cancel Stripe subscription (configurable: immediate or period_end)
 *     • Detach Stripe payment methods
 *     • Revoke in-flight tokens (email verification, password reset)
 *     • Send confirmation + restore-link email
 *     • Clear session (cookie cleared by the route handler)
 *     • Write audit log
 *
 *   Phase 2 — Grace period (0–30 days, user can restore)
 *     • Account is inaccessible (status check in requireActiveUser)
 *     • User can trigger restore via the emailed signed link
 *
 *   Phase 3 — Anonymization (background job, after grace period)
 *     • Replace PII: name → "Deleted User", email → deleted+{id}@…
 *     • Remove password hash
 *     • Status → 'deleted'
 *     • Write audit log
 *
 * LGPD/CCPA compliance notes:
 *   - Billing records (avaliacoes_corrigidas) are kept with the anonymized userId,
 *     which is a non-identifiable internal key — legally permissible for financial audits.
 *   - Personal columns (name, email) are anonymized, not deleted, to satisfy
 *     referential-integrity requirements in related collections.
 *   - All deletion events are recorded in logs_auditoria for regulatory traceability.
 */

import { v4 as uuidv4 } from 'uuid';
import { verifyPassword, generateRestoreToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserRepository from '@/lib/repositories/UserRepository';
import stripeService from '@/lib/services/StripeService';
import emailService from '@/lib/services/EmailService';

const GRACE_PERIOD_DAYS = 30;

export class AccountDeletionService {
  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1 — Initiation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {string} userId
   * @param {string} password  Plain-text password for confirmation
   * @param {{ ip: string, userAgent: string }} meta
   * @param {{ stripeStrategy?: 'immediate'|'period_end' }} [options]
   * @returns {Promise<{ scheduledAnonymizeAt: Date }>}
   */
  async initiateAccountDeletion(userId, password, meta, options = {}) {
    const { stripeStrategy = 'period_end' } = options;

    // ── 1. Fetch user (must exist and be active) ──────────────────────────
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('Usuário não encontrado.');
    if (user.status === 'pending_deletion' || user.status === 'deleted') {
      throw new Error('Esta conta já está em processo de exclusão ou foi excluída.');
    }

    // ── 2. Verify password (prevents CSRF / session hijacking) ───────────
    const passwordValid = verifyPassword(password, user.password);
    if (!passwordValid) {
      await this._writeAuditLog(userId, 'account_deletion_failed_wrong_password', { reason: 'wrong_password' }, meta);
      throw new Error('Senha incorreta. A exclusão foi cancelada.');
    }

    // ── 3. Soft-delete (atomic, no PII touched yet) ───────────────────────
    await UserRepository.softDeleteUser(userId);
    const scheduledAnonymizeAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    // ── 4. Stripe: cancel subscription + detach payment methods ──────────
    //    No-ops when Stripe is not configured (stripeCustomerId absent).
    try {
      if (user.stripeCustomerId) {
        await stripeService.cancelSubscription(user.stripeCustomerId, stripeStrategy);
        await stripeService.detachAllPaymentMethods(user.stripeCustomerId);
      }
    } catch (stripeErr) {
      console.error('[ACCOUNT DELETION] Stripe cleanup failed (non-fatal):', stripeErr.message);
      await this._writeAuditLog(userId, 'account_deletion_stripe_error', { error: stripeErr.message }, meta);
    }

    // ── 5. Revoke in-flight tokens ────────────────────────────────────────
    const { db } = await connectToDatabase();
    await db.collection('email_verifications').updateMany({ userId, used: false }, { $set: { used: true } });
    await db.collection('password_reset_tokens').updateMany({ userId, used: false }, { $set: { used: true } });

    // ── 6. Send deletion confirmation + restore link (best-effort) ────────
    const restoreToken = generateRestoreToken(userId);
    const restoreUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/account/restore?token=${restoreToken}`;

    try {
      await emailService.sendAccountDeletionEmail(user.email, user.name, restoreUrl, GRACE_PERIOD_DAYS);
    } catch (emailErr) {
      console.error('[ACCOUNT DELETION] Failed to send deletion email:', emailErr.message);
    }

    // ── 7. Audit log ──────────────────────────────────────────────────────
    await this._writeAuditLog(userId, 'account_deletion_initiated', {
      scheduledAnonymizeAt,
      stripeCustomerId: user.stripeCustomerId ?? null,
      stripeStrategy,
    }, meta);

    return { scheduledAnonymizeAt };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2 — Restore (within grace period)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Restores an account from pending_deletion.
   * The restore token is sent by email during initiation and is valid for 7 days.
   *
   * @param {string} userId - Decoded from the signed restore JWT
   * @param {{ ip: string, userAgent: string }} meta
   */
  async restoreAccount(userId, meta) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('Conta não encontrada.');
    if (user.status !== 'pending_deletion') {
      throw new Error('Esta conta não está em período de exclusão ou já foi anonimizada.');
    }

    await UserRepository.restoreUser(userId);
    await this._writeAuditLog(userId, 'account_restored', {}, meta);

    return { restored: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 3 — Anonymization (called by background job)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Anonymizes all users whose grace period has expired.
   * Run via: node scripts/process-scheduled-deletions.js
   *
   * @returns {Promise<{ processed: number, errors: number }>}
   */
  async processScheduledAnonymizations() {
    const now = new Date();
    const users = await UserRepository.findDueForAnonymization(now);
    console.log(`[ACCOUNT DELETION] Found ${users.length} account(s) due for anonymization.`);

    let processed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        await UserRepository.anonymizeUser(user.id);
        await this._writeAuditLog(user.id, 'account_anonymized', {
          originalEmail: user.email,
          anonymizedEmail: `deleted+${user.id}@correcao-ia.com`,
        }, { ip: 'background-job', userAgent: 'process-scheduled-deletions' });

        processed++;
        console.log(`[ACCOUNT DELETION] Anonymized user ${user.id}`);
      } catch (err) {
        errors++;
        console.error(`[ACCOUNT DELETION] Failed to anonymize user ${user.id}:`, err.message);
      }
    }

    return { processed, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────

  async _writeAuditLog(userId, acao, detalhes, meta) {
    try {
      const { db } = await connectToDatabase();
      await db.collection('logs_auditoria').insertOne({
        id: uuidv4(),
        userId,
        acao,
        detalhes,
        ip: meta?.ip ?? 'unknown',
        userAgent: meta?.userAgent ?? 'unknown',
        createdAt: new Date(),
      });
    } catch (err) {
      console.error('[ACCOUNT DELETION] Audit log write failed:', err.message);
    }
  }
}

export default new AccountDeletionService();
