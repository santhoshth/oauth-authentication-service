export interface UserPermission {
  id: number;
  user_id: string;
  action: PermissionAction;
  resource: string;
  effect: PermissionEffect;
}

export type PermissionAction = 'read' | 'write' | 'delete';
export type PermissionEffect = 'allow' | 'deny';
export type AuthorizationDecision = 'ALLOW' | 'DENY';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface AuthorizeRequest {
  access_token: string;
  method: HttpMethod;
  path: string;
}

export interface AuthorizeResponse {
  decision: AuthorizationDecision;
  user_id: string;
  reason: string;
  matched_permissions: MatchedPermission[];
}

export interface MatchedPermission {
  action: PermissionAction;
  resource: string;
  effect: PermissionEffect;
  score?: SpecificityScore;
}

export type SpecificityScore = [number, number, number];

export interface MatchedPermissionWithScore extends MatchedPermission {
  score: SpecificityScore;
}

export interface TokenPayload {
  sub?: string;
  user_id?: string;
  email?: string;
  exp?: number;
  iat?: number;
  aud?: string | string[];
  iss?: string;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  userInfo?: any;
  error?: string;
}

export interface ITokenService {
  validateToken(token: string): Promise<ValidationResult>;
}

export interface IPermissionService {
  checkPermission(
    userId: string,
    action: PermissionAction,
    resource: string
  ): Promise<PermissionCheckResult>;
}

export interface IAuthorizationService {
  authorize(request: AuthorizeRequest): Promise<AuthorizeResponse>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  matchedPermissions: MatchedPermission[];
  reason: string;
}

// Repository interfaces
export interface IPermissionRepository {
  findPermissionsWithWildcards(
    userId: string,
    action: PermissionAction,
    resource: string
  ): Promise<MatchedPermission[]>;
}

// Configuration types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  database: DatabaseConfig;
  oauth: OAuthConfig;
  security: SecurityConfig;
  jwt: JWTConfig;
}

export interface DatabaseConfig {
  path: string;
}

export interface OAuthConfig {
  auth0?: {
    domain: string;
    audience: string;
  };
}

export interface SecurityConfig {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface JWTConfig {
  clockTolerance: number;
}
