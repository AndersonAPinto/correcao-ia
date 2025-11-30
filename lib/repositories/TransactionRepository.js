import { BaseRepository } from './BaseRepository';

export class TransactionRepository extends BaseRepository {
  constructor() {
    super('transacoes_creditos');
  }

  async createTransaction(transactionData) {
    return await this.insertOne(transactionData);
  }

  async getTransactionsByUserId(userId, limit = 50) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}

export default new TransactionRepository();
