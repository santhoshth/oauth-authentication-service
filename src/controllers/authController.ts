import { Request, Response } from 'express';
import { AuthorizationService } from '../services/authorizationService';
import { AuthorizeRequest } from '../types';
import { logger } from '../utils/logger';

export class AuthController {
  private authorizationService: AuthorizationService;

  constructor() {
    this.authorizationService = new AuthorizationService();
  }

  // POST /authorize - Main authorization endpoint
  authorize = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: AuthorizeRequest = req.body;
      const response = await this.authorizationService.authorize(request);
      
      const statusCode = response.decision === 'ALLOW' ? 200 : 403;
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Authorization failed', { error });
      res.status(500).json({
        decision: 'DENY',
        user_id: 'unknown',
        reason: 'Internal server error',
        matched_permissions: []
      });
    }
  };

  // GET /health - Health check endpoint
  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const { getDatabase } = await import('../config/database');
      const db = getDatabase();
      const result = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
      
      if (result.healthy === 1) {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected'
        });
      } else {
        throw new Error('Database check failed');
      }
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable'
      });
    }
  };
}

export default AuthController;
