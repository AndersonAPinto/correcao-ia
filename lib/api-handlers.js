import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, getUserFromRequest } from '@/lib/auth';
import { ADMIN_EMAIL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Helper to get user ID from request
export async function requireAuth(request) {
  const userId = getUserFromRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

// Helper to check if user is admin
export async function requireAdmin(request) {
  const userId = await requireAuth(request);
  const { db } = await connectToDatabase();
  
  const user = await db.collection('users').findOne({ id: userId });
  if (!user || !user.isAdmin) {
    throw new Error('Forbidden - Admin only');
  }
  
  return userId;
}

// Helper to create notification
export async function createNotification(db, userId, tipo, mensagem, avaliacaoId = null) {
  await db.collection('notificacoes').insertOne({
    id: uuidv4(),
    userId,
    tipo,
    mensagem,
    lida: false,
    avaliacaoId,
    createdAt: new Date()
  });
}

// Call Gemini API for generating content
export async function callGeminiAPI(apiKey, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    }
  );

  if (!response.ok) {
    throw new Error('Gemini API call failed');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
