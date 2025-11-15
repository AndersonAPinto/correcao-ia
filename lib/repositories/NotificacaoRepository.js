import { BaseRepository } from './BaseRepository';

export class NotificacaoRepository extends BaseRepository {
  constructor() {
    super('notificacoes');
  }

  async findByUserId(userId, limit = 50) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async createNotificacao(notificacaoData) {
    return await this.insertOne(notificacaoData);
  }

  async markAsRead(notificacaoId, userId) {
    return await this.updateOne(
      { id: notificacaoId, userId },
      { $set: { lida: true } }
    );
  }
}

export default new NotificacaoRepository();
