import { v4 as uuidv4 } from 'uuid';
import AlunoRepository from '@/lib/repositories/AlunoRepository';
import TurmaService from './TurmaService';

export class AlunoService {
  async createAluno(userId, turmaId, nome) {
    if (!turmaId || !nome) {
      throw new Error('Turma ID and student name are required');
    }

    // Verify turma exists and belongs to user
    await TurmaService.getTurmaById(turmaId, userId);

    const alunoData = {
      id: uuidv4(),
      turmaId,
      nome,
      createdAt: new Date()
    };

    await AlunoRepository.createAluno(alunoData);
    return alunoData;
  }

  async getAlunosByTurmaId(turmaId, userId) {
    // Verify turma exists and belongs to user
    await TurmaService.getTurmaById(turmaId, userId);

    return await AlunoRepository.findByTurmaId(turmaId);
  }
}

export default new AlunoService();
