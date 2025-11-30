import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'corretor_80_20';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Configurações simplificadas para MongoDB Atlas
  // mongodb+srv gerencia TLS automaticamente
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
    tlsAllowInvalidCertificates: true, // Bypass SSL certificate validation
  };

  // Se a URI já contém parâmetros, adiciona os necessários
  let connectionUri = uri;
  if (uri && uri.includes('mongodb+srv://')) {
    // Adiciona parâmetros necessários para Atlas se não existirem
    if (!uri.includes('retryWrites')) {
      connectionUri += (uri.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority&tlsAllowInvalidCertificates=true';
    } else if (!uri.includes('tlsAllowInvalidCertificates')) {
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
