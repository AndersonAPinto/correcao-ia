const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URL;
const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
};

async function createIndexes() {
    if (!uri) {
        console.error('MONGO_URL not defined');
        process.exit(1);
    }

    const client = new MongoClient(uri, options);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(process.env.DB_NAME || 'correcao-ia');

        // Users indexes
        console.log('Creating indexes for users...');
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ id: 1 }, { unique: true });

        // Turmas indexes
        console.log('Creating indexes for turmas...');
        await db.collection('turmas').createIndex({ userId: 1 });
        await db.collection('turmas').createIndex({ id: 1 }, { unique: true });

        // Alunos indexes
        console.log('Creating indexes for alunos...');
        await db.collection('alunos').createIndex({ turmaId: 1 });
        await db.collection('alunos').createIndex({ id: 1 }, { unique: true });

        // Avaliacoes indexes
        console.log('Creating indexes for avaliacoes_corrigidas...');
        await db.collection('avaliacoes_corrigidas').createIndex({ userId: 1 });
        await db.collection('avaliacoes_corrigidas').createIndex({ turmaId: 1 });
        await db.collection('avaliacoes_corrigidas').createIndex({ alunoId: 1 });
        await db.collection('avaliacoes_corrigidas').createIndex({ id: 1 }, { unique: true });
        await db.collection('avaliacoes_corrigidas').createIndex({ validado: 1 });

        // Notificacoes indexes
        console.log('Creating indexes for notificacoes...');
        await db.collection('notificacoes').createIndex({ userId: 1, lida: 1 });
        await db.collection('notificacoes').createIndex({ id: 1 }, { unique: true });

        // Creditos indexes
        console.log('Creating indexes for creditos...');
        await db.collection('creditos').createIndex({ userId: 1 }, { unique: true });

        console.log('All indexes created successfully!');
    } catch (error) {
        console.error('Error creating indexes:', error);
    } finally {
        await client.close();
    }
}

createIndexes();
