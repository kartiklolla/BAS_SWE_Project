import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthedRequest extends Request {
  user?: { userId: number; role: Role };
}

export function signToken(userId: number, role: Role): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '8h' });
}

// 401 on missing/invalid/expired/tampered token.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number; role: Role };
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role guard. Owner inherits Employee (spec section 3).
export function requireRole(...allowed: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'Not authenticated' });
    const effective = new Set<Role>(allowed);
    if (effective.has(Role.EMPLOYEE)) effective.add(Role.OWNER); // Owner inherits Employee
    if (!effective.has(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
