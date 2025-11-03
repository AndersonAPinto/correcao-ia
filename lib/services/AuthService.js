import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword, generateToken } from '@/lib/auth';
import { ADMIN_EMAIL } from '@/lib/constants';
import UserRepository from '@/lib/repositories/UserRepository';
import CreditService from './CreditService';

export class AuthService {
  async registerUser(email, password, name) {
    // Check if user exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const userId = uuidv4();
    const hashedPassword = hashPassword(password);
    const isAdmin = email === ADMIN_EMAIL ? 1 : 0;
    
    const userData = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      isAdmin,
      assinatura: isAdmin ? 'admin' : 'free',
      createdAt: new Date()
    };

    await UserRepository.createUser(userData);

    // Create initial credits
    await CreditService.createInitialCredits(userId);

    // Generate token
    const token = generateToken(userId);

    return {
      token,
      user: { 
        id: userId, 
        email, 
        name, 
        isAdmin 
      }
    };
  }

  async loginUser(email, password) {
    const user = await UserRepository.findByEmail(email);
    
    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user.id);

    return {
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        isAdmin: user.isAdmin || 0 
      }
    };
  }

  async getUserById(userId) {
    const user = await UserRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin || 0,
      assinatura: user.assinatura || 'free'
    };
  }

  async updateUserProfile(userId, updates) {
    return await UserRepository.updateUser(userId, updates);
  }
}

export default new AuthService();
