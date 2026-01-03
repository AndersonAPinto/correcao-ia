import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'corretor_80_20';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Configurações para MongoDB Atlas
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
    // Em produção, tlsAllowInvalidCertificates deve ser false para evitar ataques MITM
    tlsAllowInvalidCertificates: process.env.NODE_ENV !== 'production',
  };

  // Se a URI já contém parâmetros, adiciona os necessários
  let connectionUri = uri;
  if (uri && uri.includes('mongodb+srv://')) {
    const isProd = process.env.NODE_ENV === 'production';
    // Adiciona parâmetros necessários para Atlas se não existirem
    if (!uri.includes('retryWrites')) {
      connectionUri += (uri.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
      if (!isProd) connectionUri += '&tlsAllowInvalidCertificates=true';
    } else if (!isProd && !uri.includes('tlsAllowInvalidCertificates')) {
      connectionUri += '&tlsAllowInvalidCertificates=true';
    }
  }

  try {
    const client = await MongoClient.connect(connectionUri, options);
    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Limpa cache em caso de erro
    cachedClient = null;
    cachedDb = null;
    throw error;
  }
}
