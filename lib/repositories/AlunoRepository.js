import { BaseRepository } from './BaseRepository';

export class AlunoRepository extends BaseRepository {
  constructor() {
    super('alunos');
  }

  async findByTurmaId(turmaId) {
    const collection = await this.getCollection();
    return await collection
      .find({ turmaId })
      .sort({ nome: 1 })
      .toArray();
  }

  async createAluno(alunoData) {
    return await this.insertOne(alunoData);
  }

  async findByIdAndTurmaId(alunoId, turmaId) {
    return await this.findOne({ id: alunoId, turmaId });
  }
}

export default new AlunoRepository();
