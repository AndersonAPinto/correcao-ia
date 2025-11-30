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

        const perfis = await db.collection('perfis_avaliacao')
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ perfis });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const formData = await request.formData();

        const nome = formData.get('nome');
        const conteudo = formData.get('conteudo');
        const arquivo = formData.get('arquivo');
        const criteriosRigorJson = formData.get('criteriosRigor');

        if (!nome) {
            return NextResponse.json({ error: 'Missing perfil name' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        let arquivoUrl = '';

        // Handle file upload if provided
        if (arquivo && arquivo.size > 0) {
            const bytes = await arquivo.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), 'public', 'perfis');
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            const filename = `${uuidv4()}-${arquivo.name}`;
            const filepath = join(uploadDir, filename);
            await writeFile(filepath, buffer);
            arquivoUrl = `/perfis/${filename}`;
        }

        // Parse criteriosRigor if provided
        let criteriosRigor = [];
        if (criteriosRigorJson) {
            try {
                criteriosRigor = JSON.parse(criteriosRigorJson);
                // Validar estrutura
                if (Array.isArray(criteriosRigor)) {
                    criteriosRigor = criteriosRigor.filter(c =>
                        c.criterio &&
                        ['rigoroso', 'moderado', 'flexivel'].includes(c.nivelRigor)
                    );
                } else {
                    criteriosRigor = [];
                }
            } catch (e) {
                console.error('Error parsing criteriosRigor:', e);
                criteriosRigor = [];
            }
        }

        const perfil = {
            id: uuidv4(),
            userId,
            nome,
            conteudo: conteudo || '',
            criteriosRigor: criteriosRigor || [],
            arquivoUrl,
            createdAt: new Date()
        };

        await db.collection('perfis_avaliacao').insertOne(perfil);
        return NextResponse.json({ perfil });
    } catch (error) {
        console.error('Create perfil error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
