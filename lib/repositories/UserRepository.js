import { BaseRepository } from './BaseRepository';

// Grace period before PII is anonymized (30 days in ms)
const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    return await this.findOne({ email });
  }

  // Bypasses status filter — use only for deletion/restore flows
  async findByEmailIncludingDeleted(email) {
    const collection = await this.getCollection();
    return await collection.findOne({ email });
  }

  async createUser(userData) {
    return await this.insertOne(userData);
  }

  async updateUser(userId, updates) {
    return await this.updateOne(
      { id: userId },
      { $set: updates }
    );
  }

  /**
   * Marks account as pending_deletion and schedules anonymization.
   * PII is NOT touched here — anonymization happens after grace period.
   */
  async softDeleteUser(userId) {
    const now = new Date();
    return await this.updateOne(
      { id: userId },
      {
        $set: {
          status: 'pending_deletion',
          deletedAt: now,
          scheduledAnonymizeAt: new Date(now.getTime() + DELETION_GRACE_PERIOD_MS),
        },
      }
    );
  }

  /**
   * Restores an account from pending_deletion within the grace period.
   */
  async restoreUser(userId) {
    return await this.updateOne(
      { id: userId, status: 'pending_deletion' },
      {
        $set: { status: 'active' },
        $unset: { deletedAt: '', scheduledAnonymizeAt: '' },
      }
    );
  }

  /**
   * Replaces all PII with anonymous equivalents and marks as deleted.
   * Called by the background job after the grace period expires.
   */
  async anonymizeUser(userId) {
    return await this.updateOne(
      { id: userId },
      {
        $set: {
          status: 'deleted',
          name: 'Deleted User',
          email: `deleted+${userId}@correcao-ia.com`,
          password: '',
          emailVerified: false,
          anonymizedAt: new Date(),
        },
        $unset: { scheduledAnonymizeAt: '' },
      }
    );
  }

  /**
   * Returns users whose grace period has expired and are still pending_deletion.
   * Used by the background deletion job.
   */
  async findDueForAnonymization(cutoffDate) {
    const collection = await this.getCollection();
    return await collection
      .find({ status: 'pending_deletion', scheduledAnonymizeAt: { $lte: cutoffDate } })
      .toArray();
  }
}

export default new UserRepository();
