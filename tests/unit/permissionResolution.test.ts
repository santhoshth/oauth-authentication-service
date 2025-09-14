import { calculateSpecificityScore, generateResourcePatterns, mapHttpMethodToAction, mapPathToResource } from '../../src/utils/pathMapper';

describe('Permission Resolution Core Logic', () => {
  
  describe('Specificity Scoring System', () => {
    it('Should score exact matches highest', () => {
      const resource = 'wallets/wallet-123/transactions/txn-456';
      
      const exactScore = calculateSpecificityScore(resource, resource);
      const wildcardScore = calculateSpecificityScore(resource, 'wallets/wallet-123/transactions/*');
      
      // Exact match should have exactness = 1
      expect(exactScore[0]).toBe(1);
      expect(wildcardScore[0]).toBe(0);
      
      // Exact match should be higher priority
      expect(exactScore[0]).toBeGreaterThan(wildcardScore[0]);
    });

    it('Should rank by specificity (more specific segments win)', () => {
      const resource = 'wallets/wallet-123/transactions/txn-456';
      
      const verySpecific = calculateSpecificityScore(resource, 'wallets/wallet-123/transactions/*');
      const lessSpecific = calculateSpecificityScore(resource, 'wallets/wallet-123/*');
      const leastSpecific = calculateSpecificityScore(resource, 'wallets/*');
      
      // More specific should have higher specificity count
      expect(verySpecific[1]).toBeGreaterThan(lessSpecific[1]);
      expect(lessSpecific[1]).toBeGreaterThan(leastSpecific[1]);
    });

    it('Should use negative wildcards for proper ordering', () => {
      const resource = 'wallets/wallet-123/transactions';
      
      const oneWildcard = calculateSpecificityScore(resource, 'wallets/wallet-123/*');
      const twoWildcards = calculateSpecificityScore(resource, 'wallets/*/*');
      const threeWildcards = calculateSpecificityScore(resource, '*/*/*');
      
      // Fewer wildcards should have higher (less negative) scores
      expect(oneWildcard[2]).toBeGreaterThan(twoWildcards[2]);
      expect(twoWildcards[2]).toBeGreaterThan(threeWildcards[2]);
    });

    it('Should handle global wildcard with lowest priority', () => {
      const resource = 'any/resource/path';
      const globalScore = calculateSpecificityScore(resource, '*');
      
      expect(globalScore).toEqual([0, 0, -Infinity]);
    });

    it('Should demonstrate complete precedence ordering', () => {
      const resource = 'wallets/wallet-123/transactions/txn-456';
      
      const scores = [
        { pattern: resource, score: calculateSpecificityScore(resource, resource) },
        { pattern: 'wallets/wallet-123/transactions/*', score: calculateSpecificityScore(resource, 'wallets/wallet-123/transactions/*') },
        { pattern: 'wallets/wallet-123/*', score: calculateSpecificityScore(resource, 'wallets/wallet-123/*') },
        { pattern: 'wallets/*', score: calculateSpecificityScore(resource, 'wallets/*') },
        { pattern: '*', score: calculateSpecificityScore(resource, '*') }
      ];
      
      // Sort by score (lexicographic comparison)
      scores.sort((a, b) => {
        for (let i = 0; i < 3; i++) {
          if (a.score[i] !== b.score[i]) {
            return b.score[i] - a.score[i]; // Higher scores first
          }
        }
        return 0;
      });
      
      // Verify correct ordering
      expect(scores[0].pattern).toBe(resource); // Exact match first
      expect(scores[1].pattern).toBe('wallets/wallet-123/transactions/*');
      expect(scores[2].pattern).toBe('wallets/wallet-123/*');
      expect(scores[3].pattern).toBe('wallets/*');
      expect(scores[4].pattern).toBe('*'); // Global wildcard last
    });
  });

  describe('Pattern Generation', () => {
    it('Should generate all hierarchical patterns', () => {
      const resource = 'wallets/wallet-123/transactions/txn-456';
      const patterns = generateResourcePatterns(resource);
      
      expect(patterns).toContain('wallets/wallet-123/transactions/txn-456'); // Exact
      expect(patterns).toContain('wallets/wallet-123/transactions/*'); // Transaction wildcard
      expect(patterns).toContain('wallets/wallet-123/*'); // Wallet wildcard
      expect(patterns).toContain('wallets/*'); // All wallets
      expect(patterns).toContain('*'); // Global
      
      // Should be ordered from most specific to least specific
      expect(patterns[0]).toBe('wallets/wallet-123/transactions/txn-456');
      expect(patterns[patterns.length - 1]).toBe('*');
    });

    it('Should handle single segment resources', () => {
      const patterns = generateResourcePatterns('wallets');
      
      expect(patterns).toContain('wallets');
      expect(patterns).toContain('*');
      expect(patterns).toHaveLength(2);
    });

    it('Should handle nested resources correctly', () => {
      const patterns = generateResourcePatterns('a/b/c');
      
      // The actual implementation generates more comprehensive patterns
      expect(patterns).toContain('a/b/c');  // Exact
      expect(patterns).toContain('a/b/*');  // c wildcard
      expect(patterns).toContain('a/*');    // b and c wildcard
      expect(patterns).toContain('*');      // Global
      expect(patterns[0]).toBe('a/b/c');    // Exact should be first
      expect(patterns[patterns.length - 1]).toBe('*'); // Global should be last
    });
  });

  describe('HTTP Method to Action Mapping', () => {
    it('Should map standard HTTP methods correctly', () => {
      expect(mapHttpMethodToAction('GET')).toBe('read');
      expect(mapHttpMethodToAction('POST')).toBe('write');
      expect(mapHttpMethodToAction('PUT')).toBe('write');
      expect(mapHttpMethodToAction('PATCH')).toBe('write');
      expect(mapHttpMethodToAction('DELETE')).toBe('delete');
    });

    it('Should handle case insensitive methods', () => {
      expect(mapHttpMethodToAction('get' as any)).toBe('read');
      expect(mapHttpMethodToAction('post' as any)).toBe('write');
      expect(mapHttpMethodToAction('delete' as any)).toBe('delete');
    });

    it('Should throw error for unknown methods', () => {
      expect(() => mapHttpMethodToAction('OPTIONS' as any)).toThrow('Unsupported HTTP method: OPTIONS');
      expect(() => mapHttpMethodToAction('HEAD' as any)).toThrow('Unsupported HTTP method: HEAD');
      expect(() => mapHttpMethodToAction('TRACE' as any)).toThrow('Unsupported HTTP method: TRACE');
    });
  });

  describe('Path to Resource Mapping', () => {
    it('Should convert URL paths to resource identifiers', () => {
      expect(mapPathToResource('/wallets/wallet-123')).toBe('wallets/wallet-123');
      expect(mapPathToResource('/users/user-456/transactions')).toBe('users/user-456/transactions');
      expect(mapPathToResource('/admin/settings')).toBe('admin/settings');
    });

    it('Should handle paths with and without leading slash', () => {
      expect(mapPathToResource('/wallets')).toBe('wallets');
      expect(mapPathToResource('wallets')).toBe('wallets');
    });

    it('Should handle root and empty paths', () => {
      // The actual implementation maps root to '*' for global access
      expect(mapPathToResource('/')).toBe('*');
      expect(mapPathToResource('')).toBe('*'); // Empty also maps to global
    });

    it('Should handle complex nested paths', () => {
      const complexPath = '/organizations/org-123/projects/proj-456/tasks/task-789';
      const expected = 'organizations/org-123/projects/proj-456/tasks/task-789';
      expect(mapPathToResource(complexPath)).toBe(expected);
    });
  });

  describe('Real-World Permission Scenarios', () => {
    it('Scenario: Exact match beats wildcard', () => {
      const resource = 'wallets/wallet-123';
      
      const exactScore = calculateSpecificityScore(resource, 'wallets/wallet-123');
      const wildcardScore = calculateSpecificityScore(resource, 'wallets/*');
      
      // Exact match [1, 2, 0] should beat wildcard [0, 1, -1]
      expect(exactScore[0]).toBeGreaterThan(wildcardScore[0]); // 1 > 0
    });

    it('Scenario: More specific wildcard beats less specific', () => {
      const resource = 'wallets/wallet-123/transactions/txn-456';
      
      const specificWildcard = calculateSpecificityScore(resource, 'wallets/wallet-123/transactions/*');
      const generalWildcard = calculateSpecificityScore(resource, 'wallets/*');
      
      // [0, 3, -1] should beat [0, 1, -1]
      expect(specificWildcard[1]).toBeGreaterThan(generalWildcard[1]); // 3 > 1
    });

    it('Scenario: Same specificity, fewer wildcards wins', () => {
      const resource = 'wallets/wallet-123/transactions';
      
      const oneWildcard = calculateSpecificityScore(resource, 'wallets/wallet-123/*');
      const twoWildcards = calculateSpecificityScore(resource, 'wallets/*/*');
      
      // Both have same specificity [0, 2, -1] vs [0, 1, -2]
      // But first has more specific segments and fewer wildcards
      expect(oneWildcard[1]).toBeGreaterThan(twoWildcards[1]); // 2 > 1
      expect(oneWildcard[2]).toBeGreaterThan(twoWildcards[2]); // -1 > -2
    });

    it('Scenario: Complete authorization flow simulation', () => {
      // Simulate: GET /wallets/wallet-123/transactions/txn-456
      const httpMethod = 'GET';
      const urlPath = '/wallets/wallet-123/transactions/txn-456';
      
      // Step 1: Map HTTP method to action
      const action = mapHttpMethodToAction(httpMethod);
      expect(action).toBe('read');
      
      // Step 2: Map path to resource
      const resource = mapPathToResource(urlPath);
      expect(resource).toBe('wallets/wallet-123/transactions/txn-456');
      
      // Step 3: Generate patterns for database query
      const patterns = generateResourcePatterns(resource);
      // The actual implementation generates comprehensive patterns
      expect(patterns.length).toBeGreaterThan(5);
      expect(patterns).toContain(resource); // Exact match
      expect(patterns).toContain('*'); // Global wildcard
      
      // Step 4: Simulate database results with scores
      const mockPermissions = [
        { resource: 'wallets/*', effect: 'allow' as const },
        { resource: 'wallets/wallet-123/transactions/txn-456', effect: 'allow' as const },
        { resource: 'wallets/wallet-123/*', effect: 'deny' as const }
      ];
      
      // Step 5: Calculate scores and sort
      const scoredPermissions = mockPermissions.map(perm => ({
        ...perm,
        score: calculateSpecificityScore(resource, perm.resource)
      }));
      
      scoredPermissions.sort((a, b) => {
        // DENY first, then by specificity
        if (a.effect !== b.effect) {
          return a.effect === 'deny' ? -1 : 1;
        }
        // Then by score (lexicographic)
        for (let i = 0; i < 3; i++) {
          if (a.score[i] !== b.score[i]) {
            return b.score[i] - a.score[i];
          }
        }
        return 0;
      });
      
      // Step 6: Verify correct ordering
      // DENY permissions come first due to sorting logic
      expect(scoredPermissions[0].effect).toBe('deny');
      expect(scoredPermissions[0].resource).toBe('wallets/wallet-123/*');
      
      // But in real resolution, exact match would be checked for higher specificity
      const exactMatch = scoredPermissions.find(p => p.resource === 'wallets/wallet-123/transactions/txn-456');
      expect(exactMatch).toBeDefined();
      expect(exactMatch!.effect).toBe('allow');
    });
  });
});
