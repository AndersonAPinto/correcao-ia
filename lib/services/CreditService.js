import { v4 as uuidv4 } from 'uuid';
import CreditRepository from '@/lib/repositories/CreditRepository';
import TransactionRepository from '@/lib/repositories/TransactionRepository';

export class CreditService {
  async createInitialCredits(userId) {
    const creditData = {
      id: uuidv4(),
      userId,
      saldoAtual: 1000,
      createdAt: new Date()
    };

    await CreditRepository.createCredit(creditData);

    // Log transaction
    await this.logTransaction(
      userId,
      'credito',
      1000,
      'Créditos iniciais de boas-vindas'
    );
  }

  async getBalance(userId) {
    const credit = await CreditRepository.findByUserId(userId);
    return credit?.saldoAtual || 0;
  }

  async debitCredits(userId, amount, description) {
    const currentBalance = await this.getBalance(userId);
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient credits. Need at least ${amount} credits.`);
    }

    await CreditRepository.updateBalance(userId, -amount);
    await this.logTransaction(userId, 'debito', -amount, description);

    return await this.getBalance(userId);
  }

  async creditCredits(userId, amount, description) {
    await CreditRepository.updateBalance(userId, amount);
    await this.logTransaction(userId, 'credito', amount, description);

    return await this.getBalance(userId);
  }

  async logTransaction(userId, tipo, quantidade, descricao) {
    const transactionData = {
      id: uuidv4(),
      userId,
      tipo,
      quantidade,
      descricao,
      createdAt: new Date()
    };

    return await TransactionRepository.createTransaction(transactionData);
  }

  async getTransactionHistory(userId, limit = 50) {
    return await TransactionRepository.getTransactionsByUserId(userId, limit);
  }
}

export default new CreditService();
