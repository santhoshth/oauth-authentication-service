import {
  IPermissionService,
  PermissionCheckResult,
  PermissionAction,
  MatchedPermission,
} from '../types';
import { PermissionRepository } from '../repositories/permissionRepository';
import { logger } from '../utils/logger';

export class PermissionService implements IPermissionService {
  private permissionRepository: PermissionRepository;

  constructor() {
    this.permissionRepository = new PermissionRepository();
  }

  async checkPermission(
    userId: string,
    action: PermissionAction,
    resource: string
  ): Promise<PermissionCheckResult> {
    try {
      // Get all matching permissions with wildcard support
      const matchedPermissions = await this.permissionRepository.findPermissionsWithWildcards(
        userId,
        action,
        resource
      );
      console.log('matchedPermissions', matchedPermissions);
      if (matchedPermissions.length === 0) {
        logger.info('No permissions found for user', {
          userId,
          action,
          resource,
        });
        
        return {
          allowed: false,
          matchedPermissions: [],
          reason: `No permissions found for ${action} on ${resource}`,
        };
      }

      // Apply permission resolution rules
      const decision = this.resolvePermissions(matchedPermissions, action, resource);
      
      logger.info('Permission check completed', {
        userId,
        action,
        resource,
        decision: decision.allowed ? 'ALLOW' : 'DENY',
        matchedCount: matchedPermissions.length,
      });

      return decision;
    } catch (error) {
      logger.error('Permission check failed', {
        userId,
        action,
        resource,
        error: error instanceof Error ? error.message : error,
      });
      
      // Fail secure - deny on error
      return {
        allowed: false,
        matchedPermissions: [],
        reason: 'Permission check failed due to system error',
      };
    }
  }

  private resolvePermissions(
    permissions: MatchedPermission[],
    action: PermissionAction,
    resource: string
  ): PermissionCheckResult {
    if (permissions.length === 0) {
      return {
        allowed: false,
        matchedPermissions: [],
        reason: `No permissions found for ${action} on ${resource}`,
      };
    }

    // Permissions are already sorted by specificity and effect
    // Take the first (most specific) permission
    const topPermission = permissions[0];
    
    // Check if there are conflicting permissions at the same specificity level
    const sameScorePermissions = permissions.filter(p => this.areScoresEqual(p.score!, topPermission.score!));
    
    // If there are multiple permissions with the same score, deny takes precedence
    const hasDenyAtSameLevel = sameScorePermissions.some(p => p.effect === 'deny');
    
    if (hasDenyAtSameLevel) {
      const denyPermission = sameScorePermissions.find(p => p.effect === 'deny')!;
      return {
        allowed: false,
        matchedPermissions: [denyPermission],
        reason: this.generateDenyReason(denyPermission, action, resource),
      };
    }

    // Use the top permission
    const allowed = topPermission.effect === 'allow';
    
    return {
      allowed,
      matchedPermissions: [topPermission],
      reason: allowed 
        ? this.generateAllowReason(topPermission, action, resource)
        : this.generateDenyReason(topPermission, action, resource),
    };
  }

  private areScoresEqual(score1: [number, number, number], score2: [number, number, number]): boolean {
    return score1[0] === score2[0] && score1[1] === score2[1] && score1[2] === score2[2];
  }

  private generateAllowReason(
    permission: MatchedPermission,
    action: PermissionAction,
    resource: string
  ): string {
    if (permission.resource === resource) {
      return `User has ${action} permission for ${resource}`;
    }
    
    if (permission.resource === '*') {
      return `User has global ${action} permission`;
    }
    
    if (permission.resource.includes('*')) {
      return `User has ${action} permission matching pattern ${permission.resource}`;
    }
    
    return `User has ${action} permission for ${permission.resource}`;
  }

  private generateDenyReason(
    permission: MatchedPermission,
    action: PermissionAction,
    resource: string
  ): string {
    if (permission.resource === resource) {
      return `User is explicitly denied ${action} permission for ${resource}`;
    }
    
    if (permission.resource === '*') {
      return `User is globally denied ${action} permission`;
    }
    
    if (permission.resource.includes('*')) {
      return `User is denied ${action} permission by pattern ${permission.resource}`;
    }
    
    return `User is denied ${action} permission for ${permission.resource}`;
  }
}

export default PermissionService;
