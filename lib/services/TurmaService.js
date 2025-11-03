import { v4 as uuidv4 } from 'uuid';
import TurmaRepository from '@/lib/repositories/TurmaRepository';

export class TurmaService {
  async createTurma(userId, nome) {
    if (!nome) {
      throw new Error('Turma name is required');
    }

    const turmaData = {
      id: uuidv4(),
      userId,
      nome,
      createdAt: new Date()
    };

    await TurmaRepository.createTurma(turmaData);
    return turmaData;
  }

  async getTurmasByUserId(userId) {
    return await TurmaRepository.findByUserId(userId);
  }

  async getTurmaById(turmaId, userId) {
    const turma = await TurmaRepository.findByIdAndUserId(turmaId, userId);
    
    if (!turma) {
      throw new Error('Turma not found');
    }

    return turma;
  }
}

export default new TurmaService();
