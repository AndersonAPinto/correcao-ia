import { BaseRepository } from './BaseRepository';

export class PerfilAvaliacaoRepository extends BaseRepository {
  constructor() {
    super('perfis_avaliacao');
  }

  async findByUserId(userId) {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async createPerfil(perfilData) {
    return await this.insertOne(perfilData);
  }
}

export default new PerfilAvaliacaoRepository();
