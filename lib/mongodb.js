import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'corretor_80_20';

if (!uri) {
  throw new Error('Please define the MONGO_URL environment variable inside .env');
}

// Configurações otimizadas para MongoDB Atlas e Serverless
const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4, // Force IPv4 para evitar problemas de resolução de DNS
  tlsAllowInvalidCertificates: process.env.NODE_ENV !== 'production',
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // No desenvolvimento, usamos uma variável global para que o valor seja preservado
  // entre as recargas do Hot Module Replacement (HMR).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Em produção, é melhor não usar uma variável global.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Em caso de erro catastrófico em desenvolvimento, limpa o cache global
    if (process.env.NODE_ENV === 'development') {
      global._mongoClientPromise = null;
    }
    throw error;
  }
}
