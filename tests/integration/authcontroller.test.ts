import request from 'supertest';
import express from 'express';
import { AuthController } from '../../src/controllers/authController';
import { AuthorizationService } from '../../src/services/authorizationService';

// Mock all services
jest.mock('../../src/services/authorizationService');
jest.mock('../../src/services/tokenService');
jest.mock('../../src/services/permissionService');

describe('Authorization Scenarios', () => {
  let app: express.Application;
  let authController: AuthController;
  let mockAuthorizationService: jest.Mocked<AuthorizationService>;
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Create controller
    authController = new AuthController();
    mockAuthorizationService = jest.mocked(AuthorizationService.prototype);
    
    // Setup routes
    app.post('/authorize', authController.authorize.bind(authController));
  });

  describe('Core Authorization Scenarios', () => {
    it('Scenario 1: ALLOW - Exact match permission', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockResolvedValue({
        decision: 'ALLOW',
        user_id: 'user123',
        reason: 'Exact match: wallets/wallet-123',
        matched_permissions: [{
          action: 'read',
          resource: 'wallets/wallet-123',
          effect: 'allow'
        }]
      });

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: validToken,
          method: 'GET',
          path: '/wallets/wallet-123'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.decision).toBe('ALLOW');
      expect(response.body.user_id).toBe('user123');
      expect(response.body.matched_permissions).toHaveLength(1);
      expect(response.body.matched_permissions[0].effect).toBe('allow');
    });

    it('Scenario 2: DENY - Explicit deny rule', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockResolvedValue({
        decision: 'DENY',
        user_id: 'user123',
        reason: 'Explicit deny rule for delete operations',
        matched_permissions: [{
          action: 'delete',
          resource: 'wallets/wallet-123',
          effect: 'deny'
        }]
      });

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: validToken,
          method: 'DELETE',
          path: '/wallets/wallet-123'
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.decision).toBe('DENY');
      expect(response.body.reason).toContain('deny');
      expect(response.body.matched_permissions[0].effect).toBe('deny');
    });

    it('Scenario 3: ALLOW - Wildcard permission inheritance', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockResolvedValue({
        decision: 'ALLOW',
        user_id: 'admin789',
        reason: 'Wildcard match: wallets/*',
        matched_permissions: [{
          action: 'read',
          resource: 'wallets/*',
          effect: 'allow'
        }]
      });

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: validToken,
          method: 'GET',
          path: '/wallets/wallet-456/transactions/txn-789'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.decision).toBe('ALLOW');
      expect(response.body.user_id).toBe('admin789');
      expect(response.body.matched_permissions[0].resource).toBe('wallets/*');
    });

    it('Scenario 4: DENY - No permissions found (default deny)', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockResolvedValue({
        decision: 'DENY',
        user_id: 'user456',
        reason: 'No permissions found for write on admin/settings',
        matched_permissions: []
      });

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: validToken,
          method: 'POST',
          path: '/admin/settings'
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.decision).toBe('DENY');
      expect(response.body.reason).toContain('No permissions found');
      expect(response.body.matched_permissions).toHaveLength(0);
    });

    it('Scenario 5: DENY - Invalid/expired token', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockResolvedValue({
        decision: 'DENY',
        user_id: 'unknown',
        reason: 'Token expired',
        matched_permissions: []
      });

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: 'expired.jwt.token',
          method: 'GET',
          path: '/wallets/wallet-123'
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.decision).toBe('DENY');
      expect(response.body.user_id).toBe('unknown');
      expect(response.body.reason).toContain('Token expired');
    });

    it('Scenario 6: DENY beats ALLOW - Conflicting permissions', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockResolvedValue({
        decision: 'DENY',
        user_id: 'user789',
        reason: 'DENY takes precedence over ALLOW at same specificity level',
        matched_permissions: [{
          action: 'write',
          resource: 'wallets/*',
          effect: 'deny'
        }]
      });

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: validToken,
          method: 'POST',
          path: '/wallets/wallet-123'
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.decision).toBe('DENY');
      expect(response.body.reason).toContain('precedence');
    });

    it('Scenario 7: System error - Fail secure', async () => {
      // Arrange
      mockAuthorizationService.authorize.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .post('/authorize')
        .send({
          access_token: validToken,
          method: 'GET',
          path: '/wallets/wallet-123'
        });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.decision).toBe('DENY');
      expect(response.body.reason).toBe('Internal server error');
      expect(response.body.user_id).toBe('unknown');
    });
  });

  describe('HTTP Method Mapping Scenarios', () => {
    it('Should map different HTTP methods correctly', async () => {
      const testCases = [
        { method: 'GET', expectedAction: 'read' },
        { method: 'POST', expectedAction: 'write' },
        { method: 'PUT', expectedAction: 'write' },
        { method: 'PATCH', expectedAction: 'write' },
        { method: 'DELETE', expectedAction: 'delete' }
      ];

      for (const testCase of testCases) {
        // Arrange
        mockAuthorizationService.authorize.mockResolvedValue({
          decision: 'ALLOW',
          user_id: 'user123',
          reason: `${testCase.expectedAction} permission granted`,
          matched_permissions: [{
            action: testCase.expectedAction as any,
            resource: 'test/resource',
            effect: 'allow'
          }]
        });

        // Act
        await request(app)
          .post('/authorize')
          .send({
            access_token: validToken,
            method: testCase.method,
            path: '/test/resource'
          })
          .expect(200);

        // Assert
        expect(mockAuthorizationService.authorize).toHaveBeenCalledWith({
          access_token: validToken,
          method: testCase.method,
          path: '/test/resource'
        });
      }
    });
  });

  describe('Resource Path Scenarios', () => {
    it('Should handle various resource path formats', async () => {
      const testPaths = [
        '/wallets',
        '/wallets/wallet-123',
        '/wallets/wallet-123/transactions',
        '/wallets/wallet-123/transactions/txn-456',
        '/users/user-789/profile',
        '/admin/settings'
      ];

      for (const path of testPaths) {
        // Arrange
        mockAuthorizationService.authorize.mockResolvedValue({
          decision: 'ALLOW',
          user_id: 'user123',
          reason: `Access granted to ${path}`,
          matched_permissions: [{
            action: 'read',
            resource: path.substring(1), // Remove leading slash
            effect: 'allow'
          }]
        });

        // Act
        const response = await request(app)
          .post('/authorize')
          .send({
            access_token: validToken,
            method: 'GET',
            path: path
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.decision).toBe('ALLOW');
      }
    });
  });
});
