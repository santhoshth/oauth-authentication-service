import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { initializeDatabase } from './config/database';
import { AuthController } from './controllers/authController';
import { 
  validateRequest, 
  authorizeRequestSchema,
} from './middleware/validator';
import { authRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

class App {
  private app: Application;
  private authController: AuthController;

  constructor() {
    this.app = express();
    this.authController = new AuthController();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use((req, _res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      next();
    });

    // const verifyJwt = expressjwt({
    //   secret: expressJwtSecret({
    //     cache: true,
    //     rateLimit: true,
    //     jwksRequestsPerMinute: 5,
    //     jwksUri: 'https://dev-z1wmmaaxrwbbb3ib.us.auth0.com/.well-known/jwks.json',
    //   }),
    //   algorithms: ['RS256'],
    //   audience: 'https://authorization-api.com',
    //   issuer: 'https://dev-z1wmmaaxrwbbb3ib.us.auth0.com/',
    // }).unless({
    //   path: ['/', '/health'],
    // });

    // this.app.use(verifyJwt);
  }

  private setupRoutes(): void {
    this.app.get('/health', asyncHandler(this.authController.healthCheck));

    this.app.post(
      '/authorize',
      authRateLimiter,
      validateRequest(authorizeRequestSchema),
      asyncHandler(this.authController.authorize)
    );

    this.app.get('/', (_req, res) => {
      res.json({
        service: 'Authentication & Authorization Service',
        endpoints: {
          authorize: 'POST /authorize',
          health: 'GET /health',
        },
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      logger.info('Initializing database..');
      initializeDatabase();
      
      const port = config.port;
      this.app.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : error,
      });
      process.exit(1);
    }
  }
}

const app = new App();
app.start().catch(error => {
  logger.error('Application startup failed', { error });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default App;
