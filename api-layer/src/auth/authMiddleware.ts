import { Request, Response, NextFunction, Application } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../common/logger';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';

    // Verify token
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Setup authentication routes and middleware
 */
export const setupAuthMiddleware = (app: Application) => {
  // Login endpoint
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // In a real implementation, validate credentials against a database
      // This is a placeholder for demonstration purposes
      if (username === 'admin' && password === 'password') {
        const token = jwt.sign(
          { id: '1', username, role: 'admin' },
          process.env.JWT_SECRET || 'default-secret-change-in-production',
          { expiresIn: '1h' }
        );
        
        return res.json({ token });
      }
      
      return res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Protected routes will use the authenticate middleware
  app.use('/api', authenticate);
};

