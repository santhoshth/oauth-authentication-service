import { HttpMethod, PermissionAction } from '../types';

export function mapHttpMethodToAction(method: HttpMethod): PermissionAction {
  switch (method.toUpperCase() as HttpMethod) {
    case 'GET':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'delete';
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

// Converts API path to resource identifier
export function mapPathToResource(path: string): string {
  // Remove leading slash and any query parameters
  let cleanPath = path.replace(/^\/+/, '').split('?')[0];

  // Remove trailing slash
  cleanPath = cleanPath.replace(/\/+$/, '');

  // Handle empty path
  if (!cleanPath) {
    return '*';
  }

  return cleanPath;
}

// Generates all possible resource patterns for wildcard matching 
export function generateResourcePatterns(resource: string): string[] {
  const patterns: string[] = [];
  const segments = resource.split('/');
  
  // 1. Exact match (highest priority)
  patterns.push(resource);
  
  // 2. Parent wildcards (wallets/* for wallets/wallet-123)
  for (let i = segments.length - 1; i > 0; i--) {
    const parentPath = segments.slice(0, i).join('/');
    patterns.push(`${parentPath}/*`);
  }
  
  // 3. Middle wildcards (wallets/*/transactions for wallets/wallet-123/transactions)
  if (segments.length >= 3) {
    for (let i = 1; i < segments.length - 1; i++) {
      const pattern = segments.map((seg, idx) => idx === i ? '*' : seg).join('/');
      patterns.push(pattern);
    }
  }
  
  // 4. Multi position wildcards (wallets/*/transactions/* for wallets/wallet-123/transactions/txn-456)
  if (segments.length >= 4) {
    // Generate patterns with wildcards in multiple positions
    for (let i = 1; i < segments.length - 2; i++) {
      for (let j = i + 2; j < segments.length; j++) {
        const pattern = segments.map((seg, idx) => 
          (idx === i || idx === j) ? '*' : seg
        ).join('/');
        patterns.push(pattern);
      }
    }
  }
  
  // 5. Global wildcard (lowest priority)
  patterns.push('*');
  
  return [...new Set(patterns)];
}

/**
 * Calculates specificity score as a tuple [exactness, specificity, -wildcards]
 * Lexicographic ordering ensures proper precedence
 * 
 * Tuple meaning:
 * [0] exactness: 1=exact match, 0=pattern match
 * [1] specificity: count of non-wildcard segments (higher = more specific)
 * [2] -wildcards: negative wildcard count (fewer wildcards = higher value)
 * 
 * Examples:
 * "users/123" exact    → [1, 2, 0] (highest priority)
 * "users/123"         → [0, 2, 0] 
 * "users/*"           → [0, 1, -1]
 * "*"                 → [0, 0, -∞] (lowest priority)
 */
export function calculateSpecificityScore(
  resource: string,
  matchedResource: string
): [number, number, number] {
  // Global wildcard gets lowest priority
  if (matchedResource === '*') {
    return [0, 0, -Infinity];
  }

  const segments = matchedResource.split('/');
  const wildcardCount = (matchedResource.match(/\*/g) || []).length;
  const nonWildcardSegments = segments.length - wildcardCount;

  return [
    resource === matchedResource ? 1 : 0,  // exactness
    nonWildcardSegments,                    // specificity, to prioritize more specific matches
    -wildcardCount                          // negative wildcards, to prioritize matches with fewer wildcards
  ];
}
