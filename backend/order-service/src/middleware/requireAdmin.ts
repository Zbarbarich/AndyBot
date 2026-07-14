import { Response, NextFunction } from 'express';
import { AppRequest } from './userContext';

export function requireAdmin(req: AppRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
