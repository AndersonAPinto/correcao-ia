import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'corretor_80_20';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Configurações de conexão para MongoDB Atlas
  const options = {
    maxPoolSize: 10,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 30000, // Aumentado para 30s
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000, // Timeout de conexão inicial
    // Opções SSL/TLS para MongoDB Atlas
    // Para mongodb+srv, TLS é obrigatório e gerenciado automaticamente
    // Não precisamos definir tls explicitamente para mongodb+srv
    // Retry configuration
    retryWrites: true,
    retryReads: true,
    // Configurações adicionais para melhorar estabilidade
    directConnection: false,
    heartbeatFrequencyMS: 10000,
  };

  // Se a URI já contém parâmetros, adiciona os necessários
  let connectionUri = uri;
  if (uri && uri.includes('mongodb+srv://')) {
    // Adiciona parâmetros necessários para Atlas se não existirem
    if (!uri.includes('retryWrites')) {
      connectionUri += (uri.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
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
