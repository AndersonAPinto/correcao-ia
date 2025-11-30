const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do arquivo .env
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}

loadEnv();

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'corretor_80_20';

async function seedUsers() {
    let client;

    try {
        console.log('🔍 Conectando ao MongoDB...');

        // Configurações de conexão
        let connectionUri = uri;
        if (uri && uri.includes('mongodb+srv://')) {
            if (!uri.includes('retryWrites')) {
                connectionUri += (uri.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
            }
        }

        const options = {
            maxPoolSize: 10,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            tls: true,
            tlsAllowInvalidCertificates: false,
            retryWrites: true,
            retryReads: true,
        };

        client = await MongoClient.connect(connectionUri, options);
        const db = client.db(dbName);

        console.log('✅ Conectado ao MongoDB\n');

        // Usuários para criar
        const usersToCreate = [
            {
                email: 'admin@admin.com',
                password: '12345678',
                name: 'Admin',
                isAdmin: 1,
                assinatura: 'premium'
            },
            {
                email: 'user@user.com',
                password: '12345678',
                name: 'User',
                isAdmin: 0,
                assinatura: 'free'
            }
        ];

        for (const userData of usersToCreate) {
            console.log(`\n🔍 Verificando usuário ${userData.email}...`);

            // Verificar se usuário já existe
            const existingUser = await db.collection('users').findOne({ email: userData.email });

            if (existingUser) {
                console.log(`⚠️  Usuário ${userData.email} já existe. Atualizando senha...`);

                // Atualizar senha
                const hashedPassword = bcrypt.hashSync(userData.password, 10);
                await db.collection('users').updateOne(
                    { email: userData.email },
                    {
                        $set: {
                            password: hashedPassword,
                            isAdmin: userData.isAdmin,
                            assinatura: userData.assinatura,
                            name: userData.name
                        }
                    }
                );

                console.log(`✅ Senha atualizada para ${userData.email}`);
            } else {
                console.log(`➕ Criando usuário ${userData.email}...`);

                // Criar novo usuário
                const userId = uuidv4();
                const hashedPassword = bcrypt.hashSync(userData.password, 10);

                await db.collection('users').insertOne({
                    id: userId,
                    email: userData.email,
                    password: hashedPassword,
                    name: userData.name,
                    isAdmin: userData.isAdmin,
                    assinatura: userData.assinatura,
                    createdAt: new Date()
                });

                console.log(`✅ Usuário ${userData.email} criado com sucesso!`);

                // Criar créditos iniciais
                await db.collection('creditos').insertOne({
                    id: uuidv4(),
                    userId,
                    saldoAtual: userData.isAdmin ? 10000 : 1000,
                    createdAt: new Date()
                });

                console.log(`✅ Créditos iniciais criados (${userData.isAdmin ? 10000 : 1000} créditos)`);

                // Criar transação de créditos
                await db.collection('transacoes_creditos').insertOne({
                    id: uuidv4(),
                    userId,
                    tipo: 'credito',
                    quantidade: userData.isAdmin ? 10000 : 1000,
                    descricao: 'Créditos iniciais de boas-vindas',
                    createdAt: new Date()
                });
            }
        }

        // Listar todos os usuários
        console.log('\n\n📊 Usuários no banco de dados:');
        console.log('='.repeat(60));
        const users = await db.collection('users').find({}).toArray();

        for (const user of users) {
            console.log(`\n📧 Email: ${user.email}`);
            console.log(`   Nome: ${user.name}`);
            console.log(`   Admin: ${user.isAdmin === 1 ? 'Sim' : 'Não'}`);
            console.log(`   Assinatura: ${user.assinatura || 'N/A'}`);
            console.log(`   ID: ${user.id}`);

            // Buscar créditos
            const creditos = await db.collection('creditos').findOne({ userId: user.id });
            if (creditos) {
                console.log(`   Créditos: ${creditos.saldoAtual}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Seed concluído com sucesso!');
        console.log('\n📝 Você pode fazer login com:');
        console.log('   Admin: admin@admin.com / 12345678');
        console.log('   User:  user@user.com / 12345678');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Conexão fechada');
        }
    }
}

seedUsers();
