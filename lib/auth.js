import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
  }
  console.warn('WARNING: JWT_SECRET is not defined. Using insecure default for development only.');
}

// Validação de força da chave em produção
if (JWT_SECRET && process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET should be at least 32 characters long for production security.');
}

const SECRET_KEY = JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

export function generateToken(userId) {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * Gera token de verificação de email (expira em 24h)
 */
export function generateVerificationToken() {
  return jwt.sign(
    { type: 'email_verification', timestamp: Date.now() },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
}

/**
 * Gera token de reset de senha (expira em 1h)
 */
export function generatePasswordResetToken(userId) {
  return jwt.sign(
    { userId, type: 'password_reset', timestamp: Date.now() },
    SECRET_KEY,
    { expiresIn: '1h' }
  );
}

/**
 * Verifica token de verificação de email
 */
export function verifyVerificationToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.type !== 'email_verification') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verifica token de reset de senha
 */
export function verifyPasswordResetToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.type !== 'password_reset') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}
