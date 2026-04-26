/**
 * POST /api/account/delete
 *
 * Initiates account deletion for the authenticated user.
 *
 * Security measures:
 *   • JWT authentication via middleware (cookie 'session')
 *   • Active-user guard (blocks already-deleted accounts)
 *   • Password confirmation (prevents CSRF and session-hijack attacks)
 *   • Rate limiting: 3 attempts per 15 minutes
 *   • Full audit log written regardless of outcome
 *   • Session cookie cleared on success
 *
 * Request body:
 *   { "password": "string", "stripeStrategy": "immediate" | "period_end" (optional) }
 *
 * Responses:
 *   200 — deletion initiated, grace period begins
 *   400 — missing fields or invalid stripeStrategy
 *   401 — wrong password
 *   403 — account not active
 *   429 — rate limit exceeded
 *   500 — internal error
 */

import { NextResponse } from 'next/server';
import { requireActiveUser, checkRateLimit, registerAttempt } from '@/lib/api-handlers';
import { clearSessionCookie } from '@/lib/auth';
import accountDeletionService from '@/lib/services/AccountDeletionService';

function getClientMeta(request) {
  const realIp = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = realIp ?? (forwarded ? forwarded.split(',').at(-1).trim() : '127.0.0.1');
  return { ip, userAgent: request.headers.get('user-agent') ?? 'unknown' };
}

export async function POST(request) {
  let userId;
  const meta = getClientMeta(request);

  try {
    // ── Auth: must be an active (non-deleted) user ─────────────────────────
    try {
      userId = await requireActiveUser(request);
    } catch (authErr) {
      const status = authErr.statusCode === 403 ? 403 : 401;
      return NextResponse.json({ error: authErr.message }, { status });
    }

    // ── Rate limit: 3 deletion attempts per 15 min (keyed on userId) ───────
    const rateLimit = await checkRateLimit(request, userId, 'account_deletion', 3, 15);
    if (rateLimit.blocked) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minuto(s).` },
        { status: 429 }
      );
    }
    await registerAttempt(request, userId, 'account_deletion');

    // ── Parse body ─────────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const { password, stripeStrategy } = body ?? {};

    if (!password || typeof password !== 'string' || password.trim() === '') {
      return NextResponse.json(
        { error: 'A confirmação de senha é obrigatória para excluir a conta.' },
        { status: 400 }
      );
    }

    if (stripeStrategy && !['immediate', 'period_end'].includes(stripeStrategy)) {
      return NextResponse.json({ error: 'Valor inválido para stripeStrategy.' }, { status: 400 });
    }

    // ── Business logic ─────────────────────────────────────────────────────
    const { scheduledAnonymizeAt } = await accountDeletionService.initiateAccountDeletion(
      userId,
      password,
      meta,
      { stripeStrategy: stripeStrategy ?? 'period_end' }
    );

    // ── Clear session — account is now inaccessible ────────────────────────
    const response = NextResponse.json(
      {
        message: 'Conta marcada para exclusão. Você receberá um e-mail com instruções.',
        scheduledAnonymizeAt,
        gracePeriodDays: 30,
      },
      { status: 200 }
    );
    clearSessionCookie(response);

    return response;
  } catch (err) {
    if (err.message.includes('Senha incorreta')) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err.message.includes('já está em processo') || err.message.includes('foi excluída')) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    console.error('[DELETE ACCOUNT] Unexpected error:', err);
    return NextResponse.json({ error: 'Erro interno. Tente novamente mais tarde.' }, { status: 500 });
  }
}
