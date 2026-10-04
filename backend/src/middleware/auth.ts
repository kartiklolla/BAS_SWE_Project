import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

// The dev fallback is public (it's in the repo), so a deployed instance using it would let
// anyone forge an Owner token. In production, refuse to start unless a real secret is set.
// The value itself is checked, not just its presence: Prisma Client copies backend/.env into
// process.env on import, so a copied dev .env could otherwise smuggle the public secret in.
const DEV_SECRET = 'dev-secret-change-me';
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? '' : DEV_SECRET);
if (isProd && (!JWT_SECRET || JWT_SECRET === DEV_SECRET)) {
  throw new Error('JWT_SECRET must be set to a private value in production');
}

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
