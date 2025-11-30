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
  async submitForGrading(userId, uploadData) {
    const { gabaritoId, turmaId, alunoId, periodo, imageUrl, fullImageUrl } = uploadData;

    // Verify all entities exist and belong to user
    const gabarito = await GabaritoRepository.findByIdAndUserId(gabaritoId, userId);
    if (!gabarito) {
      throw new Error('Gabarito not found');
    }

    const turma = await TurmaRepository.findByIdAndUserId(turmaId, userId);
    if (!turma) {
      throw new Error('Turma not found');
    }

    const aluno = await AlunoRepository.findByIdAndTurmaId(alunoId, turmaId);
    if (!aluno) {
      throw new Error('Aluno not found');
    }

    // Get N8N webhook URL
    const user = await UserRepository.findById(userId);
    const settings = await SettingsRepository.findByUserId(
      user.isAdmin ? userId : null
    );

    if (!settings || !settings.n8nWebhookUrl) {
      throw new Error('N8N webhook URL not configured.');
    }

    // Debit credits (3 credits per grading)
    await CreditService.debitCredits(userId, 3, 'Correção de prova');

    // Get perfil if exists
    let perfilConteudo = '';
    if (gabarito.perfilAvaliacaoId) {
      const perfil = await PerfilAvaliacaoRepository.findById(gabarito.perfilAvaliacaoId);
      if (perfil) {
        perfilConteudo = perfil.conteudo;
      }
    }

    // Create assessment record
    const assessmentId = uuidv4();
    const assessmentData = {
      id: assessmentId,
      userId,
      gabaritoId,
      turmaId,
      alunoId,
      periodo,
      imageUrl: fullImageUrl,
      textoOcr: '',
      nota: null,
      feedback: '',
      exercicios: [],
      status: 'pending',
      validado: false,
      createdAt: new Date()
    };

    await AvaliacaoRepository.createAvaliacao(assessmentData);

    // Trigger N8N webhook
    try {
      const webhookPayload = {
        user_id: userId,
        assessment_id: assessmentId,
        image_url: fullImageUrl,
        gabarito_id: gabaritoId,
        gabarito_content: gabarito.conteudo,
        perfil_avaliacao: perfilConteudo,
        turma_nome: turma.nome,
        aluno_nome: aluno.nome,
        periodo: periodo
      };

      const webhookResponse = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        console.error('N8N webhook failed:', await webhookResponse.text());
        throw new Error('Failed to trigger correction workflow');
      }

      return {
        success: true,
        assessmentId,
        imageUrl
      };
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      throw new Error('Failed to connect to N8N. Please check webhook URL.');
    }
  }

  async processN8NResult(assessmentId, resultData) {
    const { texto_ocr, nota_final, feedback_geral, exercicios } = resultData;

    const avaliacao = await AvaliacaoRepository.findById(assessmentId);
    if (!avaliacao) {
      throw new Error('Assessment not found');
    }

    // Update assessment with results
    const updateData = {
      textoOcr: texto_ocr || '',
      nota: nota_final || 0,
      feedback: feedback_geral || '',
      exercicios: exercicios || [],
      status: 'completed',
      completedAt: new Date()
    };

    await AvaliacaoRepository.updateResult(assessmentId, updateData);

    // Create notification
    await NotificationService.createNotification(
      avaliacao.userId,
      'avaliacao_concluida',
      'Avaliação processada e aguardando validação',
      assessmentId
    );

    return true;
  }

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
