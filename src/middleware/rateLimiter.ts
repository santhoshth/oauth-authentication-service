import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

export const authRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: Math.floor(config.security.rateLimitMaxRequests),
  message: 'Too many authorization requests from this IP',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Authorization rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      error: 'Too many authorization requests',
      message: 'Rate limit exceeded for authorization endpoint',
      retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
    });
  },
});

export default authRateLimiter;
