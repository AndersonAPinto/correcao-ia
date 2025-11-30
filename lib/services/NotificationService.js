import { v4 as uuidv4 } from 'uuid';
import NotificacaoRepository from '@/lib/repositories/NotificacaoRepository';

export class NotificationService {
  async createNotification(userId, tipo, mensagem, avaliacaoId = null) {
    const notificationData = {
      id: uuidv4(),
      userId,
      tipo,
      mensagem,
      lida: false,
      avaliacaoId,
      createdAt: new Date()
    };

    return await NotificacaoRepository.createNotificacao(notificationData);
  }

  async getNotifications(userId, limit = 50) {
    return await NotificacaoRepository.findByUserId(userId, limit);
  }

  async markAsRead(notificacaoId, userId) {
    return await NotificacaoRepository.markAsRead(notificacaoId, userId);
  }
}

export default new NotificationService();
