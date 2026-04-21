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
        openRouterApiKey: '',
        openRouterModel: '',
        createdAt: new Date()
      };
      await SettingsRepository.createSettings(defaultSettings);
      settings = defaultSettings;
    }

    // Check if user is admin
    const user = await UserRepository.findById(userId);
    const isAdmin = !!user?.isAdmin;

    // Return different data based on admin status
    if (isAdmin) {
      return {
        geminiApiKey: settings.geminiApiKey || '',
        openRouterApiKey: settings.openRouterApiKey || '',
        openRouterModel: settings.openRouterModel || ''
      };
    } else {
      return {}; // Regular users don't see API keys
    }
  }

  async updateSettings(userId, updates) {
    const user = await UserRepository.findById(userId);
    const isAdmin = !!user?.isAdmin;

    const updateData = {};

    // Only admin can update API keys
    if (isAdmin) {
      if (updates.geminiApiKey !== undefined) {
        updateData.geminiApiKey = updates.geminiApiKey;
      }
      if (updates.openRouterApiKey !== undefined) {
        updateData.openRouterApiKey = updates.openRouterApiKey;
      }
      if (updates.openRouterModel !== undefined) {
        updateData.openRouterModel = updates.openRouterModel;
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
