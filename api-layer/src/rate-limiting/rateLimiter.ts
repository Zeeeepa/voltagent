import { Application } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../common/logger';

/**
 * Setup rate limiting middleware for the API
 */
export const setupRateLimiting = (app: Application) => {
  // Default rate limiter for all API routes
  const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes',
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(options.statusCode).json({
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000 / 60) // in minutes
      });
    }
  });

  // Apply default rate limiter to all API routes
  app.use('/api', defaultLimiter);

  // More restrictive rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again after an hour',
    handler: (req, res, next, options) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
      res.status(options.statusCode).json({
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000 / 60) // in minutes
      });
    }
  });

  // Apply auth rate limiter to login endpoint
  app.use('/api/auth/login', authLimiter);

  // More permissive rate limiter for webhook endpoints
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 requests per minute (1 per second)
    standardHeaders: true,
    legacyHeaders: false
  });

  // Apply webhook rate limiter to webhook endpoints
  app.use('/api/webhooks', webhookLimiter);
};

