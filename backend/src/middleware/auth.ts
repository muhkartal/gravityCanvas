import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {

    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token'
      });
    }


    return res.status(403).json({
      success: false,
      error: 'Token verification failed'
    });
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
  } catch (error) {

  }

  next();
};
