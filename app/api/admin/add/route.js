import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin, checkRateLimit, logAudit } from '@/lib/api-handlers';

export async function POST(request) {
    try {
        const adminUserId = await requireAdmin(request);

        // Rate limiting rigoroso para endpoint crítico
        const rateLimit = await checkRateLimit(request, adminUserId, 'admin_promote', 5, 60);
        if (rateLimit.blocked) {
            await logAudit(request, adminUserId, 'admin_promote_blocked', { reason: 'rate_limit' });
            return NextResponse.json({
                error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.`
            }, { status: 429 });
        }

        const { email } = await request.json();

        // Validação básica de email
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: '⚠️ O e-mail do usuário é obrigatório.' }, { status: 400 });
        }

        // Validar formato de email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return NextResponse.json({ error: '⚠️ Formato de e-mail inválido.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Buscar usuário a ser promovido
        const targetUser = await db.collection('users').findOne({ email: email.trim() });

        if (!targetUser) {
            await logAudit(request, adminUserId, 'admin_promote_failed', { email: email.trim(), reason: 'user_not_found' });
            return NextResponse.json({ error: '❌ Usuário não encontrado com este e-mail.' }, { status: 404 });
        }

        // Verificar se já é admin
        if (targetUser.isAdmin) {
            await logAudit(request, adminUserId, 'admin_promote_failed', {
                email: email.trim(),
                targetUserId: targetUser.id,
                reason: 'already_admin'
            });
            return NextResponse.json({ error: '❌ Usuário já é administrador.' }, { status: 400 });
        }

        // Verificar se não está tentando se promover
        if (targetUser.id === adminUserId) {
            await logAudit(request, adminUserId, 'admin_promote_failed', {
                email: email.trim(),
                reason: 'self_promotion'
            });
            return NextResponse.json({ error: '❌ Não é possível se promover.' }, { status: 400 });
        }

        // Promover usuário
        const result = await db.collection('users').updateOne(
            { email: email.trim() },
            { $set: { isAdmin: 1, promotedAt: new Date(), promotedBy: adminUserId } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: '❌ Erro ao promover usuário.' }, { status: 500 });
        }

        // Auditoria crítica
        await logAudit(request, adminUserId, 'admin_promote_success', {
            email: email.trim(),
            targetUserId: targetUser.id,
            targetUserName: targetUser.name
        });

        return NextResponse.json({ success: true, message: '✅ Usuário promovido a administrador com sucesso!' });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
