import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';
import { isValidUUID } from '@/lib/utils';

export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const alunoId = params.id;

        if (!isValidUUID(alunoId)) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const aluno = await db.collection('alunos').findOne({ id: alunoId });
        if (!aluno) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        const turma = await db.collection('turmas').findOne({ id: aluno.turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({ userId, alunoId, validado: true })
            .sort({ createdAt: -1 })
            .toArray();

        const gabaritoIds = [...new Set(avaliacoes.map(a => a.gabaritoId))];
        const gabaritos = await db.collection('gabaritos')
            .find({ id: { $in: gabaritoIds } })
            .toArray();
        const gabaritosMap = {};
        gabaritos.forEach(g => gabaritosMap[g.id] = g);

        const habilidades = await db.collection('habilidades').find({ userId }).toArray();
        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        const mediaGeral = avaliacoes.length > 0
            ? (avaliacoes.reduce((s, a) => s + (a.nota || 0), 0) / avaliacoes.length).toFixed(2)
            : '—';

        // Agregar habilidades do aluno
        const habAgregada = {};
        avaliacoes.forEach(av => {
            (av.habilidadesPontuacao || []).forEach(h => {
                if (!habAgregada[h.habilidadeId]) habAgregada[h.habilidadeId] = [];
                habAgregada[h.habilidadeId].push(h.pontuacao);
            });
        });
        const habResumo = Object.entries(habAgregada).map(([id, pts]) => ({
            nome: habilidadesMap[id] || id,
            media: (pts.reduce((s, v) => s + v, 0) / pts.length).toFixed(1),
            total: pts.length
        })).sort((a, b) => parseFloat(a.media) - parseFloat(b.media));

        const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório — ${aluno.nome}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; max-width: 780px; margin: auto; }
  h1 { font-size: 20px; color: #1d4ed8; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #374151; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  h3 { font-size: 13px; color: #1d4ed8; margin-bottom: 6px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
  .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: bold; }
  .badge.green { background: #dcfce7; color: #166534; }
  .badge.red { background: #fee2e2; color: #991b1b; }
  .badge.orange { background: #ffedd5; color: #9a3412; }
  .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin-bottom: 14px; }
  .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .nota-destaque { font-size: 28px; font-weight: bold; color: #1d4ed8; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; }
  td { padding: 6px 8px; border-top: 1px solid #f3f4f6; }
  .analise-box { background: #f0f9ff; border-left: 3px solid #38bdf8; padding: 10px 12px; margin-bottom: 8px; border-radius: 0 4px 4px 0; }
  .analise-label { font-size: 10px; text-transform: uppercase; color: #0284c7; font-weight: bold; margin-bottom: 2px; }
  .exercicio { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; margin-bottom: 8px; }
  .redacao-criterio { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; font-size: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>

<h1>Relatório do Aluno</h1>
<div class="meta">
  Emitido em ${now} &nbsp;|&nbsp; Turma: <strong>${turma.nome}</strong>
</div>

<div class="card">
  <div class="row">
    <div>
      <div style="font-size:18px;font-weight:bold;">${aluno.nome}</div>
      ${aluno.email ? `<div class="meta">${aluno.email}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div class="meta">Média geral</div>
      <div class="nota-destaque">${mediaGeral}</div>
      <div class="meta">/ 10 &nbsp;(${avaliacoes.length} avaliação${avaliacoes.length !== 1 ? 'ões' : ''})</div>
    </div>
  </div>
</div>

${habResumo.length > 0 ? `
<h2>Habilidades Avaliadas</h2>
<table>
  <thead><tr><th>Habilidade</th><th>Média</th><th>Avaliações</th><th>Nível</th></tr></thead>
  <tbody>
    ${habResumo.map(h => {
      const media = parseFloat(h.media);
      const nivel = media >= 8 ? 'Forte' : media >= 5 ? 'Em desenvolvimento' : 'Precisa de atenção';
      const badgeClass = media >= 8 ? 'green' : media >= 5 ? 'orange' : 'red';
      return `<tr>
        <td>${h.nome}</td>
        <td><strong>${h.media}</strong>/10</td>
        <td>${h.total}</td>
        <td><span class="badge ${badgeClass}">${nivel}</span></td>
      </tr>`;
    }).join('')}
  </tbody>
</table>` : ''}

<h2>Avaliações Realizadas</h2>

${avaliacoes.map(av => {
    const gabarito = gabaritosMap[av.gabaritoId];
    const notaClass = av.nota >= 7 ? 'green' : av.nota >= 5 ? 'orange' : 'red';
    const analise = av.analisePedagogica || {};
    const dataFmt = av.validadoAt
        ? new Date(av.validadoAt).toLocaleDateString('pt-BR')
        : new Date(av.createdAt).toLocaleDateString('pt-BR');

    return `
<div class="card">
  <div class="row">
    <div>
      <h3>${gabarito?.titulo || 'Avaliação'}</h3>
      <div class="meta">${av.periodo || ''} &nbsp;|&nbsp; ${dataFmt}</div>
    </div>
    <span class="badge ${notaClass}" style="font-size:16px;padding:4px 14px;">${(av.nota || 0).toFixed(1)}/10</span>
  </div>

  ${av.feedback ? `<p style="margin:8px 0;color:#374151;">${av.feedback}</p>` : ''}

  ${(av.exercicios || []).length > 0 ? `
  <div style="margin-top:10px;">
    ${av.exercicios.map(ex => `
    <div class="exercicio">
      <div class="row">
        <strong>Questão ${ex.numero}</strong>
        <span class="badge ${(ex.nota || 0) >= (ex.nota_maxima || 10) * 0.7 ? 'green' : 'red'}">${(ex.nota || 0).toFixed(1)}/${ex.nota_maxima || 10}</span>
      </div>
      <p style="color:#4b5563;font-size:12px;margin-top:4px;">${ex.feedback || ''}</p>
      ${ex.detalhes_redacao ? `
      <div style="margin-top:8px;font-size:12px;color:#6b7280;">Critérios de redação:</div>
      ${Object.entries(ex.detalhes_redacao).map(([k, v]) => {
        const labels = { tese_argumentacao: 'Tese e argumentação', coerencia_coesao: 'Coerência e coesão', estrutura: 'Estrutura', repertorio: 'Repertório', adequacao_linguistica: 'Adequação linguística' };
        return `<div class="redacao-criterio"><span>${labels[k] || k}</span><span><strong>${v.nota}</strong>/20 — ${v.comentario}</span></div>`;
      }).join('')}` : ''}
    </div>`).join('')}
  </div>` : ''}

  ${analise.ponto_forte || analise.ponto_atencao || analise.sugestao_intervencao ? `
  <div style="margin-top:12px;">
    ${analise.ponto_forte ? `<div class="analise-box"><div class="analise-label">Ponto forte</div>${analise.ponto_forte}</div>` : ''}
    ${analise.ponto_atencao ? `<div class="analise-box" style="border-color:#fb923c;background:#fff7ed;"><div class="analise-label" style="color:#ea580c;">Ponto de atenção</div>${analise.ponto_atencao}</div>` : ''}
    ${analise.sugestao_intervencao ? `<div class="analise-box" style="border-color:#a78bfa;background:#f5f3ff;"><div class="analise-label" style="color:#7c3aed;">Sugestão para o professor</div>${analise.sugestao_intervencao}</div>` : ''}
  </div>` : ''}
</div>`;
}).join('')}

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;text-align:center;">
  Relatório gerado pelo Corretor IA &nbsp;|&nbsp; ${now}
</div>
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `inline; filename="relatorio-${aluno.nome.replace(/\s+/g, '_')}.html"`
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
