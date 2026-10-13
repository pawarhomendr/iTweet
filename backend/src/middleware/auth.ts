import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  // FIX S-1: only accept Bearer token from Authorization header (not cookie-stored access token)

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    // FIX A-1: pin algorithm to prevent algorithm confusion attacks
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { userId: string };
    User.findById(payload.userId)
      // FIX A-7: remove +password — not needed in auth middleware
      .then((user) => {
        if (!user) {
          res.status(401).json({ success: false, message: 'Authentication required' });
          return;
        }
        if (user.isSuspended) {
          const until = user.suspendedUntil;
          if (!until || until > new Date()) {
            // FIX E-2: never leak the internal suspension reason
            res.status(403).json({ success: false, message: 'Account suspended. Contact support for details.' });
            return;
          }
        }
        req.user = user;
        next();
      })
      .catch(next);
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) return next();

  try {
    // FIX A-1: pin algorithm
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { userId: string };
    User.findById(payload.userId).then((user) => {
      if (user && !user.isSuspended) req.user = user;
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export const requireMod = requireRole('moderator', 'admin');
export const requireAdmin = requireRole('admin');
