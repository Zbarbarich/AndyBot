import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    email: string;
    role: string;
    userID: number;
  };
}

export const verifyUserContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First try to get user context from gateway
    const userContext = req.headers['x-user-context'] as string;
    if (userContext) {
      req.user = JSON.parse(userContext);
      next();
      return;
    }

    // Fallback to token verification
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      email: string;
      role: string;
      userID: number;
    };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error');
    res.status(401).json({ error: 'Invalid token or user context' });
  }
};

export const isAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT role FROM "users" WHERE email = $1',
      [req.user?.email]
    );
    
    if (result.rows[0]?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
