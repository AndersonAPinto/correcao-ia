import { connectToDatabase } from '@/lib/mongodb';

export class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async getCollection() {
    const { db } = await connectToDatabase();
    return db.collection(this.collectionName);
  }

  async findById(id) {
    const collection = await this.getCollection();
    return await collection.findOne({ id });
  }

  async findOne(query) {
    const collection = await this.getCollection();
    return await collection.findOne(query);
  }

  async find(query = {}, options = {}) {
    const collection = await this.getCollection();
    return await collection.find(query, options).toArray();
  }

  async insertOne(document) {
    const collection = await this.getCollection();
    return await collection.insertOne(document);
  }

  async updateOne(query, update, options = {}) {
    const collection = await this.getCollection();
    return await collection.updateOne(query, update, options);
  }

  async deleteOne(query) {
    const collection = await this.getCollection();
    return await collection.deleteOne(query);
  }

  async deleteMany(query) {
    const collection = await this.getCollection();
    return await collection.deleteMany(query);
  }

  async countDocuments(query = {}) {
    const collection = await this.getCollection();
    return await collection.countDocuments(query);
  }
}
