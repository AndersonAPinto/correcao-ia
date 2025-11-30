import { BaseRepository } from './BaseRepository';

export class TurmaRepository extends BaseRepository {
  constructor() {
    super('turmas');
  }

  async findByUserId(userId) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async createTurma(turmaData) {
    return await this.insertOne(turmaData);
  }

  async findByIdAndUserId(turmaId, userId) {
    return await this.findOne({ id: turmaId, userId });
  }
}

export default new TurmaRepository();
