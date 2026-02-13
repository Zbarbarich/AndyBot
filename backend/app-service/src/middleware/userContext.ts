import { Request, Response, NextFunction } from 'express';

export interface AppUser {
  email: string;
  role: string;
  userID: number;
}

export interface AppRequest extends Request {
  user?: AppUser;
}

/**
 * Reads user context set by API gateway (x-user-context header).
 * Gateway must run verifyToken and set this header before proxying to app-service.
 */
export function userContext(req: AppRequest, res: Response, next: NextFunction): void {
  const raw = req.headers['x-user-context'];
  if (raw && typeof raw === 'string') {
    try {
      req.user = JSON.parse(raw) as AppUser;
    } catch {
      // ignore invalid JSON
    }
  }
  next();
}
