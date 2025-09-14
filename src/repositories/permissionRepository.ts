import { getDatabase } from '../config/database';
import {
  IPermissionRepository,
  UserPermission,
  PermissionAction,
  MatchedPermission,
  MatchedPermissionWithScore,
} from '../types';
import { generateResourcePatterns, calculateSpecificityScore } from '../utils/pathMapper';

export class PermissionRepository implements IPermissionRepository {
  private db = getDatabase();

  async findPermissionsWithWildcards(
    userId: string,
    action: PermissionAction,
    resource: string
  ): Promise<MatchedPermission[]> {
    // Generate all possible patterns to match
    const patterns = generateResourcePatterns(resource);
    console.log('patterns', patterns);
    // Build query with placeholders for all patterns
    const placeholders = patterns.map(() => '?').join(',');
    const query = `
      SELECT 
        action,
        resource,
        effect
      FROM user_permissions
      WHERE user_id = ? 
        AND action = ?
        AND resource IN (${placeholders})
      ORDER BY 
        CASE effect WHEN 'deny' THEN 0 ELSE 1 END,
        LENGTH(resource) DESC
    `;
    
    const stmt = this.db.prepare(query);
    const results = stmt.all(userId, action, ...patterns) as Array<{
      action: PermissionAction;
      resource: string;
      effect: 'allow' | 'deny';
    }>;
    
    // Calculate scores and sort by specificity
    const matchedPermissions: MatchedPermissionWithScore[] = results.map(perm => ({
      ...perm,
      score: calculateSpecificityScore(resource, perm.resource),
    }));
    
    matchedPermissions.sort((a: MatchedPermissionWithScore, b: MatchedPermissionWithScore) => {
      // Always prioritize deny over allow
      if (a.effect !== b.effect) {
        return a.effect === 'deny' ? -1 : 1;
      }
    
      // Otherwise, sort by score
      for (let i = 0; i < a.score.length; i++) {
        if (a.score[i] !== b.score[i]) {
          return b.score[i] - a.score[i];
        }
      }
    
      return 0;
    });
    
    return matchedPermissions;
  }
}

export default PermissionRepository;
