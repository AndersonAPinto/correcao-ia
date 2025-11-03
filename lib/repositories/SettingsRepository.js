import { BaseRepository } from './BaseRepository';

export class SettingsRepository extends BaseRepository {
  constructor() {
    super('settings');
  }

  async findByUserId(userId) {
    return await this.findOne({ userId });
  }

  async createSettings(settingsData) {
    return await this.insertOne(settingsData);
  }

  async updateSettings(userId, updates) {
    return await this.updateOne(
      { userId },
      { 
        $set: { ...updates, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
  }
}

export default new SettingsRepository();
