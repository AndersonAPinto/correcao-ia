import { v4 as uuidv4 } from 'uuid';
import SettingsRepository from '@/lib/repositories/SettingsRepository';
import UserRepository from '@/lib/repositories/UserRepository';

export class SettingsService {
  async getSettings(userId) {
    let settings = await SettingsRepository.findByUserId(userId);
    
    if (!settings) {
      const defaultSettings = {
        id: uuidv4(),
        userId,
        geminiApiKey: '',
        n8nWebhookUrl: '',
        createdAt: new Date()
      };
      await SettingsRepository.createSettings(defaultSettings);
      settings = defaultSettings;
    }

    // Check if user is admin
    const user = await UserRepository.findById(userId);
    const isAdmin = user?.isAdmin === 1;

    // Return different data based on admin status
    if (isAdmin) {
      return {
        geminiApiKey: settings.geminiApiKey || '',
        n8nWebhookUrl: settings.n8nWebhookUrl || ''
      };
    } else {
      return {}; // Regular users don't see API keys
    }
  }

  async updateSettings(userId, updates) {
    const user = await UserRepository.findById(userId);
    const isAdmin = user?.isAdmin === 1;

    const updateData = {};

    // Only admin can update API keys
    if (isAdmin) {
      if (updates.geminiApiKey !== undefined) {
        updateData.geminiApiKey = updates.geminiApiKey;
      }
      if (updates.n8nWebhookUrl !== undefined) {
        updateData.n8nWebhookUrl = updates.n8nWebhookUrl;
      }
    }

    // All users can update their profile
    if (updates.name) {
      await UserRepository.updateUser(userId, { name: updates.name });
    }

    if (Object.keys(updateData).length > 0) {
      await SettingsRepository.updateSettings(userId, updateData);
    }

    return true;
  }
}

export default new SettingsService();
