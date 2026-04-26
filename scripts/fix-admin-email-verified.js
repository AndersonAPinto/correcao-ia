/**
 * Corrige emailVerified para todos os usuários admin no banco.
 *
 * Uso:
 *   node scripts/fix-admin-email-verified.js
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'corretor-ia';

if (!MONGO_URL) {
  console.error('❌ MONGO_URL não definida no .env');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');

    const db = client.db(DB_NAME);

    const adminsToFix = await db.collection('users').find({
      $or: [{ isAdmin: 1 }, { assinatura: 'admin' }],
      emailVerified: { $ne: true }
    }).toArray();

    if (adminsToFix.length === 0) {
      console.log('✅ Nenhum admin com emailVerified: false encontrado. Nada a corrigir.');
      return;
    }

    console.log(`🔍 Encontrados ${adminsToFix.length} admin(s) para corrigir:`);
    adminsToFix.forEach(u => {
      console.log(`   - ${u.email} (isAdmin: ${u.isAdmin}, assinatura: ${u.assinatura})`);
    });

    const result = await db.collection('users').updateMany(
      {
        $or: [{ isAdmin: 1 }, { assinatura: 'admin' }],
        emailVerified: { $ne: true }
      },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      }
    );

    console.log(`✅ ${result.modifiedCount} usuário(s) corrigido(s) — emailVerified: true`);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
