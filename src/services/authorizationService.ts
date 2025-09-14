import {
  IAuthorizationService,
  AuthorizeRequest,
  AuthorizeResponse,
} from '../types';
import { TokenService } from './tokenService';
import { PermissionService } from './permissionService';
import { mapHttpMethodToAction, mapPathToResource } from '../utils/pathMapper';
import { logger } from '../utils/logger';

/**
 * AuthorizationService handles authorization decisions
 * Validates tokens and checks permissions
 */
export class AuthorizationService implements IAuthorizationService {
  private tokenService: TokenService;
  private permissionService: PermissionService;

  constructor() {
    this.tokenService = new TokenService();
    this.permissionService = new PermissionService();
  }

  // Main authorization method
  async authorize(request: AuthorizeRequest): Promise<AuthorizeResponse>{
    try {
      // Validate token
      const tokenResult = await this.tokenService.validateToken(request.access_token);
      
      if (!tokenResult.valid || !tokenResult.payload) {
        return {
          decision: 'DENY',
          user_id: 'unknown',
          reason: tokenResult.error || 'Invalid token',
          matched_permissions: []
        };
      }

      // user_id values in our db is of nickname format
      const userId = tokenResult.userInfo.nickname;
      
      if (!userId) {
        return {
          decision: 'DENY',
          user_id: 'unknown',
          reason: 'User not found',
          matched_permissions: []
        };
      }

      // Map HTTP method to action and path to resource
      const action = mapHttpMethodToAction(request.method);
      const resource = mapPathToResource(request.path);
      
      // Check permissions
      const permissionResult = await this.permissionService.checkPermission(
        userId,
        action,
        resource
      );

      // Build response
      const decision = permissionResult.allowed ? 'ALLOW' : 'DENY';
      
      const response: AuthorizeResponse = {
        decision,
        user_id: userId,
        reason: permissionResult.reason,
        matched_permissions: permissionResult.matchedPermissions.map(p => ({
          action: p.action,
          resource: p.resource,
          effect: p.effect
        }))
      };

      return response;
    } catch (error) {
      logger.error('Authorization failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail secure - deny on unexpected errors
      return {
        decision: 'DENY',
        user_id: 'unknown',
        reason: 'Authorization check failed due to system error',
        matched_permissions: []
      };
    }
  }
}

export default AuthorizationService;
