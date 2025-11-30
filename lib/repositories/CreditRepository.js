import { BaseRepository } from './BaseRepository';

export class CreditRepository extends BaseRepository {
  constructor() {
    super('creditos');
  }

  async findByUserId(userId) {
    return await this.findOne({ userId });
  }

  async createCredit(creditData) {
    return await this.insertOne(creditData);
  }

  async updateBalance(userId, amount) {
    return await this.updateOne(
      { userId },
      { $inc: { saldoAtual: amount } }
    );
  }

  async setBalance(userId, newBalance) {
    return await this.updateOne(
      { userId },
      { $set: { saldoAtual: newBalance } }
    );
  }
}

export default new CreditRepository();
