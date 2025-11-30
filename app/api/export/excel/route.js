import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({ userId, validado: true })
            .sort({ createdAt: -1 })
            .toArray();

        // Enriquecer dados
        const enriched = await Promise.all(avaliacoes.map(async (av) => {
            const turma = await db.collection('turmas').findOne({ id: av.turmaId });
            const aluno = await db.collection('alunos').findOne({ id: av.alunoId });
            const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });

            return {
                ...av,
                turmaNome: turma ? turma.nome : 'N/A',
                alunoNome: aluno ? aluno.nome : 'N/A',
                gabaritoTitulo: gabarito ? gabarito.titulo : 'N/A'
            };
        }));

        // Generate XML Excel (SpreadsheetML)
        const excelContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Avaliações">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Turma</Data></Cell>
    <Cell><Data ss:Type="String">Aluno</Data></Cell>
    <Cell><Data ss:Type="String">Gabarito</Data></Cell>
    <Cell><Data ss:Type="String">Período</Data></Cell>
    <Cell><Data ss:Type="String">Nota</Data></Cell>
    <Cell><Data ss:Type="String">Data Validação</Data></Cell>
   </Row>
${enriched.map(av => `   <Row>
    <Cell><Data ss:Type="String">${escapeXml(av.turmaNome)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(av.alunoNome)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(av.gabaritoTitulo)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(av.periodo || 'N/A')}</Data></Cell>
    <Cell><Data ss:Type="Number">${av.nota || 0}</Data></Cell>
    <Cell><Data ss:Type="String">${av.validadoAt ? new Date(av.validadoAt).toLocaleString('pt-BR') : 'N/A'}</Data></Cell>
   </Row>`).join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;

        return new NextResponse(excelContent, {
            headers: {
                'Content-Type': 'application/vnd.ms-excel',
                'Content-Disposition': `attachment; filename="avaliacoes_${new Date().toISOString().split('T')[0]}.xls"`
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
