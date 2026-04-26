/**
 * POST /api/account/restore
 *
 * Restores an account that is in 'pending_deletion' status.
 * The signed restore token is emailed at deletion initiation and expires in 7 days.
 *
 * This route is intentionally PUBLIC (no session cookie required) because:
 *   • The user is logged out immediately after initiating deletion.
 *   • Access is secured by the signed JWT restore token delivered to the registered email.
 *
 * Request body:
 *   { "token": "string" }
 *
 * Responses:
 *   200 — restored successfully
 *   400 — missing or invalid token
 *   410 — account already anonymized (past grace period)
 *   500 — internal error
 */

import { NextResponse } from 'next/server';
import { verifyRestoreToken } from '@/lib/auth';
import accountDeletionService from '@/lib/services/AccountDeletionService';
import emailService from '@/lib/services/EmailService';
import UserRepository from '@/lib/repositories/UserRepository';

function getClientMeta(request) {
  const realIp = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = realIp ?? (forwarded ? forwarded.split(',').at(-1).trim() : '127.0.0.1');
  return { ip, userAgent: request.headers.get('user-agent') ?? 'unknown' };
}

export async function POST(request) {
  const meta = getClientMeta(request);

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const { token } = body ?? {};

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token de restauração obrigatório.' }, { status: 400 });
    }

    // ── Verify signed restore token (tamper-proof, time-limited) ──────────
    const decoded = verifyRestoreToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado. Solicite um novo link de restauração via suporte.' },
        { status: 400 }
      );
    }

    const { userId } = decoded;

    // ── Check current account status before restoring ──────────────────────
    const user = await UserRepository.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 400 });
    }

    if (user.status === 'deleted') {
      // Past grace period — PII has been anonymized, restore is not possible
      return NextResponse.json(
        {
          error:
            'Esta conta já foi anonimizada e não pode ser restaurada. ' +
            'Entre em contato com o suporte para assistência.',
        },
        { status: 410 } // 410 Gone — resource permanently removed
      );
    }

    if (user.status === 'active') {
      // Already restored (double-click) — idempotent success
      return NextResponse.json({ message: 'Conta já está ativa.' }, { status: 200 });
    }

    // ── Restore ────────────────────────────────────────────────────────────
    await accountDeletionService.restoreAccount(userId, meta);

    // Confirmation email (best-effort)
    try {
      await emailService.sendAccountRestoredEmail(user.email, user.name);
    } catch (emailErr) {
      console.error('[RESTORE ACCOUNT] Failed to send confirmation email:', emailErr.message);
    }

    return NextResponse.json(
      { message: 'Conta restaurada com sucesso. Você já pode fazer login normalmente.' },
      { status: 200 }
    );
  } catch (err) {
    if (err.message.includes('não está em período de exclusão')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error('[RESTORE ACCOUNT] Unexpected error:', err);
    return NextResponse.json({ error: 'Erro interno. Tente novamente mais tarde.' }, { status: 500 });
  }
}
