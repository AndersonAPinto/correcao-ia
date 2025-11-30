import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
  }
  console.warn('WARNING: JWT_SECRET is not defined. Using insecure default for development only.');
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
