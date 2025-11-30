import { BaseRepository } from './BaseRepository';

export class GabaritoRepository extends BaseRepository {
  constructor() {
    super('gabaritos');
  }

  async findByUserId(userId) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async createGabarito(gabaritoData) {
    return await this.insertOne(gabaritoData);
  }

  async findByIdAndUserId(gabaritoId, userId) {
    return await this.findOne({ id: gabaritoId, userId });
  }
}

export default new GabaritoRepository();
