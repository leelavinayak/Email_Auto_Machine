import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'vemu-dev-secret-change-me';

export function signToken(userId) {
  return jwt.sign({ id: String(userId) }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}
