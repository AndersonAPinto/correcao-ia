import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const gabaritos = await db.collection('gabaritos')
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ gabaritos });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const formData = await request.formData();

        const titulo = formData.get('titulo');
        const conteudo = formData.get('conteudo');
        const perfilAvaliacaoId = formData.get('perfilAvaliacaoId');
        const arquivo = formData.get('arquivo');
        const tipo = formData.get('tipo') || 'dissertativa'; // 'multipla_escolha' ou 'dissertativa'
        const questoesJson = formData.get('questoes'); // JSON string para questões de múltipla escolha

        if (!titulo) {
            return NextResponse.json({ error: 'Missing title' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        let arquivoUrl = '';

        // Handle file upload if provided
        if (arquivo && arquivo.size > 0) {
            const bytes = await arquivo.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), 'public', 'gabaritos');
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            const filename = `${uuidv4()}-${arquivo.name}`;
            const filepath = join(uploadDir, filename);
            await writeFile(filepath, buffer);
            arquivoUrl = `/gabaritos/${filename}`;
        }

        // Parse questões se for múltipla escolha
        let questoes = [];
        if (tipo === 'multipla_escolha' && questoesJson) {
            try {
                questoes = JSON.parse(questoesJson);
                // Validar estrutura das questões
                if (!Array.isArray(questoes)) {
                    return NextResponse.json({ error: 'Questões must be an array' }, { status: 400 });
                }
                // Validar cada questão
                for (const q of questoes) {
                    if (!q.numero || !q.respostaCorreta || !q.habilidadeId) {
                        return NextResponse.json({
                            error: 'Each question must have numero, respostaCorreta, and habilidadeId'
                        }, { status: 400 });
                    }
                }
            } catch (e) {
                return NextResponse.json({ error: 'Invalid questões JSON format' }, { status: 400 });
            }
        }

        const gabarito = {
            id: uuidv4(),
            userId,
            titulo,
            conteudo: conteudo || '',
            perfilAvaliacaoId: perfilAvaliacaoId || '',
            arquivoUrl,
            tipo, // 'multipla_escolha' ou 'dissertativa'
            questoes: questoes, // Array de questões para múltipla escolha
            totalQuestoes: tipo === 'multipla_escolha' ? questoes.length : 0,
            createdAt: new Date()
        };

        await db.collection('gabaritos').insertOne(gabarito);
        return NextResponse.json({ gabarito });
    } catch (error) {
        console.error('Create gabarito error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const userId = await requireAuth(request);
        const { searchParams } = new URL(request.url);
        const gabaritoId = searchParams.get('id');

        if (!gabaritoId) {
            return NextResponse.json({ error: 'Gabarito ID is required' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Verificar se o gabarito pertence ao usuário
        const gabarito = await db.collection('gabaritos').findOne({
            id: gabaritoId,
            userId
        });

        if (!gabarito) {
            return NextResponse.json({ error: 'Gabarito not found' }, { status: 404 });
        }

        // Verificar se é FormData (com arquivo) ou JSON
        const contentType = request.headers.get('content-type') || '';
        let titulo, conteudo, perfilAvaliacaoId, tipo, questoes, arquivo, removerArquivo;

        if (contentType.includes('multipart/form-data')) {
            // FormData (pode conter arquivo)
            const formData = await request.formData();
            titulo = formData.get('titulo');
            conteudo = formData.get('conteudo');
            perfilAvaliacaoId = formData.get('perfilAvaliacaoId');
            tipo = formData.get('tipo');
            arquivo = formData.get('arquivo');
            removerArquivo = formData.get('removerArquivo') === 'true';

            const questoesJson = formData.get('questoes');
            if (questoesJson) {
                try {
                    questoes = JSON.parse(questoesJson);
                } catch (e) {
                    questoes = null;
                }
            }
        } else {
            // JSON (sem arquivo)
            const body = await request.json();
            titulo = body.titulo;
            conteudo = body.conteudo;
            perfilAvaliacaoId = body.perfilAvaliacaoId;
            tipo = body.tipo;
            questoes = body.questoes;
        }

        if (!titulo) {
            return NextResponse.json({ error: 'Titulo is required' }, { status: 400 });
        }

        // Preparar dados de atualização
        const updateData = {
            titulo,
            conteudo: conteudo || '',
            perfilAvaliacaoId: perfilAvaliacaoId || '',
            updatedAt: new Date()
        };

        // Processar arquivo se fornecido
        let arquivoUrl = gabarito.arquivoUrl || '';
        if (removerArquivo) {
            arquivoUrl = '';
        } else if (arquivo && arquivo.size > 0) {
            // Novo arquivo fornecido
            const bytes = await arquivo.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), 'public', 'gabaritos');
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            const filename = `${uuidv4()}-${arquivo.name}`;
            const filepath = join(uploadDir, filename);
            await writeFile(filepath, buffer);
            arquivoUrl = `/gabaritos/${filename}`;
        }

        updateData.arquivoUrl = arquivoUrl;

        // Atualizar questões se for múltipla escolha
        if (tipo === 'multipla_escolha' && questoes && Array.isArray(questoes)) {
            updateData.questoes = questoes;
            updateData.totalQuestoes = questoes.length;
        }

        await db.collection('gabaritos').updateOne(
            { id: gabaritoId, userId },
            { $set: updateData }
        );

        return NextResponse.json({ success: true, gabarito: { ...gabarito, ...updateData } });
    } catch (error) {
        console.error('Update gabarito error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const userId = await requireAuth(request);
        const { searchParams } = new URL(request.url);
        const gabaritoId = searchParams.get('id');

        if (!gabaritoId) {
            return NextResponse.json({ error: 'Gabarito ID is required' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Verificar se o gabarito pertence ao usuário
        const gabarito = await db.collection('gabaritos').findOne({
            id: gabaritoId,
            userId
        });

        if (!gabarito) {
            return NextResponse.json({ error: 'Gabarito not found' }, { status: 404 });
        }

        // Excluir gabarito
        await db.collection('gabaritos').deleteOne({
            id: gabaritoId,
            userId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete gabarito error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
