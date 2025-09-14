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
	const patterns = new Set<string>(); 
  patterns.add(resource); // Exact match 
	const segments = resource.split('/');
	// Generate parent wildcards 
	for (let i = segments.length - 1; i > 0; i--) {
		const parentPath = segments.slice(0, i).join('/');
		patterns.add(`${parentPath}/*`);
	}
	// Generate middle wildcards for nested resources 
	if (segments.length >= 3) {
		// For paths like wallets/wallet-789/transactions // Generate: wallets/*/transactions 
		const firstSegment = segments[0];
		const lastSegment = segments[segments.length - 1];
		patterns.add(`${firstSegment}/*/${lastSegment}`);
		// For deeper nesting, generate intermediate patterns 
		if (segments.length > 3) {
			for (let i = 1; i < segments.length - 1; i++) {
				const pattern = segments.map((seg, idx) => idx === i ? '*' : seg).join('/');
				if (!patterns.has(pattern)) {
					patterns.add(pattern);
				}
			}
		}
	}
	// Add patterns for multi-level wildcards 
	// e.g., wallets/*/transactions/* for wallets/wallet-789/transactions/txn-123 
	if (segments.length >= 4) {
		for (let i = 1; i < segments.length - 2; i++) {
			const pattern = segments.slice(0, i).concat('*', segments.slice(i + 1, -1), '*').join('/');
			if (!patterns.has(pattern)) {
				patterns.add(pattern);
			}
		}
	}
	// Add global wildcard 
	patterns.add('*');
	return Array.from(patterns);
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
    nonWildcardSegments,                    // specificity
    -wildcardCount                          // negative wildcards
  ];
}
