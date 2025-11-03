import { v4 as uuidv4 } from 'uuid';
import GabaritoRepository from '@/lib/repositories/GabaritoRepository';

export class GabaritoService {
  async createGabarito(userId, titulo, conteudo, perfilAvaliacaoId, arquivoUrl) {
    if (!titulo) {
      throw new Error('Title is required');
    }

    const gabaritoData = {
      id: uuidv4(),
      userId,
      titulo,
      conteudo: conteudo || '',
      perfilAvaliacaoId: perfilAvaliacaoId || '',
      arquivoUrl: arquivoUrl || '',
      createdAt: new Date()
    };

    await GabaritoRepository.createGabarito(gabaritoData);
    return gabaritoData;
  }

  async getGabaritosByUserId(userId) {
    return await GabaritoRepository.findByUserId(userId);
  }

  async getGabaritoById(gabaritoId, userId) {
    const gabarito = await GabaritoRepository.findByIdAndUserId(gabaritoId, userId);
    
    if (!gabarito) {
      throw new Error('Gabarito not found');
    }

    return gabarito;
  }
}

export default new GabaritoService();
