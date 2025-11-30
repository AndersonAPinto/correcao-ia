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

// Helper function to call Gemini API with retry and validation
export async function callGeminiAPIWithRetry(url, body, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, body);

      if (response.ok) {
        const data = await response.json();

        // Validate response structure
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No candidates in Gemini API response');
        }

        const candidate = data.candidates[0];
        if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
          throw new Error('Invalid response structure from Gemini API');
        }

        const responseText = candidate.content.parts[0].text;
        if (!responseText) {
          throw new Error('Empty response from Gemini API');
        }

        return responseText;
      }

      // If 429 (rate limit), wait longer
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // For other errors, retry with backoff
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        const errorText = await response.text();
        console.warn(`Gemini API error (attempt ${attempt + 1}/${maxRetries}):`, errorText);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Last attempt failed
      const errorText = await response.text();
      throw new Error(`Gemini API failed: ${errorText}`);

    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        console.warn(`Gemini API call failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitTime}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Failed to call Gemini API after all retries');
}
