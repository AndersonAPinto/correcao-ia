import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    return await this.findOne({ email });
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
}

export default new UserRepository();
