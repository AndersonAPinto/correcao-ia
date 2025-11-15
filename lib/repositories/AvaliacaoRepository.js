import { BaseRepository } from './BaseRepository';

export class AvaliacaoRepository extends BaseRepository {
  constructor() {
    super('avaliacoes_corrigidas');
  }

  async createAvaliacao(avaliacaoData) {
    return await this.insertOne(avaliacaoData);
  }

  async findPendingByUserId(userId) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId, status: 'completed', validado: false })
      .sort({ completedAt: -1 })
      .toArray();
  }

  async findCompletedByUserId(userId, limit = 100) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId, validado: true })
      .sort({ validadoAt: -1 })
      .limit(limit)
      .toArray();
  }

  async updateResult(assessmentId, resultData) {
    return await this.updateOne(
      { id: assessmentId },
      { $set: resultData }
    );
  }

  async markAsValidated(assessmentId) {
    return await this.updateOne(
      { id: assessmentId },
      { 
        $set: { 
          validado: true,
          validadoAt: new Date()
        } 
      }
    );
  }

  async findByIdAndUserId(assessmentId, userId) {
    return await this.findOne({ id: assessmentId, userId });
  }
}

export default new AvaliacaoRepository();
