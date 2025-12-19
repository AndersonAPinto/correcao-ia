import { v4 as uuidv4 } from 'uuid';
import AvaliacaoRepository from '@/lib/repositories/AvaliacaoRepository';
import GabaritoRepository from '@/lib/repositories/GabaritoRepository';
import PerfilAvaliacaoRepository from '@/lib/repositories/PerfilAvaliacaoRepository';
import TurmaRepository from '@/lib/repositories/TurmaRepository';
import AlunoRepository from '@/lib/repositories/AlunoRepository';
import SettingsRepository from '@/lib/repositories/SettingsRepository';
import UserRepository from '@/lib/repositories/UserRepository';
import CreditService from './CreditService';
import NotificationService from './NotificationService';

export class GradingService {
  // Nota: submitForGrading e processN8NResult foram removidos
  // O processamento agora é feito diretamente em handleUpload usando Vertex AI

  async getPendingAvaliacoes(userId) {
    const avaliacoes = await AvaliacaoRepository.findPendingByUserId(userId);

    // Enrich with related data
    return await this.enrichAvaliacoes(avaliacoes);
  }

  async getCompletedAvaliacoes(userId) {
    const avaliacoes = await AvaliacaoRepository.findCompletedByUserId(userId);

    // Enrich with related data
    return await this.enrichAvaliacoes(avaliacoes);
  }

  async enrichAvaliacoes(avaliacoes) {
    return await Promise.all(
      avaliacoes.map(async (av) => {
        const gabarito = await GabaritoRepository.findById(av.gabaritoId);
        const turma = await TurmaRepository.findById(av.turmaId);
        const aluno = await AlunoRepository.findById(av.alunoId);

        return {
          ...av,
          gabaritoTitulo: gabarito?.titulo || 'Unknown',
          turmaNome: turma?.nome || 'Unknown',
          alunoNome: aluno?.nome || 'Unknown'
        };
      })
    );
  }

  async validateAvaliacao(assessmentId, userId) {
    const avaliacao = await AvaliacaoRepository.findByIdAndUserId(assessmentId, userId);

    if (!avaliacao) {
      throw new Error('Assessment not found');
    }

    await AvaliacaoRepository.markAsValidated(assessmentId);

    return true;
  }
}

export default new GradingService();
