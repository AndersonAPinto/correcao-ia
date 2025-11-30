const { MongoClient } = require('mongodb');
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

async function verificarAdmin() {
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

        // Buscar usuário admin
        console.log('🔍 Buscando usuário admin@admin.com...');
        const adminUser = await db.collection('users').findOne({ email: 'admin@admin.com' });

        if (adminUser) {
            console.log('✅ Usuário admin encontrado!\n');
            console.log('📋 Estrutura do documento:');
            console.log('  - id:', adminUser.id);
            console.log('  - email:', adminUser.email);
            console.log('  - name:', adminUser.name);
            console.log('  - isAdmin:', adminUser.isAdmin);
            console.log('  - password (hash):', adminUser.password ? adminUser.password.substring(0, 20) + '...' : 'NÃO DEFINIDO');
            console.log('  - assinatura:', adminUser.assinatura);
            console.log('  - createdAt:', adminUser.createdAt);

            // Verificar se password está hasheada
            if (adminUser.password && adminUser.password.startsWith('$2')) {
                console.log('\n✅ Senha está hasheada (bcrypt)');
            } else {
                console.log('\n⚠️  Senha pode não estar hasheada corretamente');
            }

            // Verificar isAdmin
            if (adminUser.isAdmin === 1) {
                console.log('✅ isAdmin está definido como 1');
            } else {
                console.log('⚠️  isAdmin não está definido como 1 (valor:', adminUser.isAdmin, ')');
            }
        } else {
            console.log('❌ Usuário admin NÃO encontrado no banco de dados');
            console.log('\n📝 Será necessário criar o usuário admin.');
        }

        // Listar todos os usuários (para debug)
        console.log('\n📊 Total de usuários no banco:');
        const totalUsers = await db.collection('users').countDocuments();
        console.log('  Total:', totalUsers);

        if (totalUsers > 0) {
            console.log('\n📋 Lista de emails cadastrados:');
            const users = await db.collection('users').find({}, { projection: { email: 1, name: 1, isAdmin: 1 } }).toArray();
            users.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.email} (${user.name}) - Admin: ${user.isAdmin || 0}`);
            });
        }

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

verificarAdmin();

