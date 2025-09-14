# Authentication & Authorization Service

## Overview
A robust OAuth2 token validation and fine-grained permission service built with Node.js, TypeScript, and SQLite. The service validates JWT tokens from Auth0 and enforces granular permissions using a hierarchical resource model.

## Architecture & Design Decisions

### 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Application                       │
│  1. POST /token {user_id: "user123"}                           │
│  2. POST /authorize {access_token, method, path}                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ JWT Token (HS256)
                      │ {sub: "user123", iss: "auth-service"}
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                         │
│  • Rate Limiting                                                 │
│  • Request Validation (Zod)                                      │
│  • Security Headers (Helmet)                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Token Validation Layer                          │
│  • Local JWT Validation (HS256 with shared secret)              │
│  • Auth0 Token Validation (RS256 with JWKS)                     │
│  • Token Expiry & Signature Verification                        │
│  • Audience/Issuer Validation                                   │
│  • Automatic Fallback Between Validation Methods                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Extracted User ID
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               Authorization Engine                               │
│  • Path → Resource Mapping                                      │
│  • Method → Action Mapping                                      │
│  • Permission Resolution                                        │
│  • Wildcard Pattern Matching                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Permission Repository                           │
│  • SQLite Database                                              │
│  • Prepared Statements                                          │
│  • Connection Pooling                                           │
│  • Query Optimization                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Key Design Decisions

#### 2.1 Layered Architecture Pattern
**Decision**: Implemented a clean layered architecture with separation of concerns.

**Reasoning**:
- **Maintainability**: Each layer has a single responsibility
- **Testability**: Layers can be tested independently with mocks
- **Flexibility**: Easy to swap implementations (e.g., change database)
- **Scalability**: Layers can be scaled independently if needed

**Layers**:
1. **Controller Layer**: HTTP request handling and response formatting
2. **Service Layer**: Business logic and orchestration
3. **Repository Layer**: Data access and persistence
4. **Utility Layer**: Cross-cutting concerns (logging, validation)

#### 2.2 Permission Resolution Algorithm

**Decision**: Implemented a sophisticated permission matching system with the following precedence rules:

```typescript
Priority Order (Highest to Lowest):
1. Exact match with DENY
2. Exact match with ALLOW
3. Specific wildcard match with DENY (e.g., /wallets/wallet-789/*)
4. Specific wildcard match with ALLOW
5. Parent resource match with DENY
6. Parent resource match with ALLOW
7. General wildcard match with DENY (e.g., /wallets/*)
8. General wildcard match with ALLOW
9. Global wildcard with DENY (*)
10. Global wildcard with ALLOW
11. Default DENY
```

**Reasoning**:
- **Security First**: DENY always takes precedence over ALLOW at the same specificity level
- **Principle of Least Privilege**: More specific permissions override general ones
- **Predictability**: Clear, documented precedence rules
- **Performance**: Optimized query with scoring system for efficient resolution

#### 2.3 Resource Path Mapping Strategy

**Decision**: Implemented a hierarchical resource mapping that preserves path structure.

**Mapping Examples**:
```
/transactions → transactions
/transactions/txn-123 → transactions/txn-123
/wallets/wallet-789 → wallets/wallet-789
/wallets/wallet-789/transactions → wallets/wallet-789/transactions
```

**Reasoning**:
- **Intuitive**: Direct mapping from API paths to resources
- **Hierarchical**: Supports nested resource permissions
- **Wildcard Support**: Enables patterns like `wallets/*` or `wallets/*/transactions/*`
- **Flexibility**: Can handle any depth of nesting

#### 2.4 Token Validation Approach

**Decision**: Used `jose` library with JWKS support for token validation.

**Reasoning**:
- **Standards Compliant**: Full JWT/JWS/JWE support
- **Key Rotation**: Automatic JWKS key rotation handling
- **Performance**: Built-in caching for JWKS keys
- **Security**: Comprehensive validation (signature, expiry, audience, issuer)
- **Auth0 Integration**: Seamless integration with Auth0 for JWT validation

#### 2.5 Database Choice & Query Strategy

**Decision**: SQLite with prepared statements and optimized queries.

**Reasoning**:
- **Simplicity**: No external database server required
- **Performance**: Sufficient for permission checking use case
- **Reliability**: ACID compliant, battle-tested
- **Query Optimization**: Used scoring system to handle wildcard matching efficiently

**Query Strategy**:
```sql
-- Single optimized query with scoring for precedence
SELECT *, 
  CASE 
    WHEN resource = ? THEN 1000
    WHEN resource LIKE ? THEN 500 + LENGTH(resource)
    WHEN resource = '*' THEN 1
    ELSE 0
  END as score
FROM user_permissions
WHERE user_id = ? AND action = ?
ORDER BY score DESC, effect DESC
```

### 3. Security Considerations

1. **Token Validation**:
   - Signature verification using public keys
   - Expiration time checking
   - Audience and issuer validation
   - JWKS key rotation support

2. **Input Validation**:
   - Zod schemas for request validation
   - Path sanitization to prevent injection
   - SQL prepared statements

3. **API Security**:
   - Rate limiting to prevent abuse
   - Helmet for security headers
   - CORS configuration
   - Request size limits

4. **Error Handling**:
   - No sensitive information in error responses
   - Proper logging for debugging
   - Graceful degradation

### 4. Performance Optimizations

1. **Caching Strategy**:
   - JWKS keys cached automatically
   - Database connection pooling
   - Prepared statement caching

2. **Query Optimization**:
   - Single query for permission resolution
   - Indexed columns (user_id, action, resource)
   - Efficient wildcard matching

3. **Async/Await**:
   - Non-blocking I/O operations
   - Proper error handling in async contexts

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Auth0 account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd auth-service-project
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Required Environment Variables:**
```bash
# JWT Token Configuration
JWT_SECRET=your-secret-key-change-in-production

# Optional: Auth0 Configuration (for external token validation)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
AUTH0_ISSUER=https://your-domain.auth0.com/

# Database Configuration
DATABASE_PATH=./data/permissions.db

# Server Configuration
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
```

4. Initialize the database:
```bash
npm run db:init
```

5. Run the service:
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Auth0 Setup (Optional)

**Note:** Auth0 configuration is optional. The service generates its own JWT tokens by default. Auth0 is only needed if you want to validate external Auth0 tokens as a fallback.

1. Create a free account at https://auth0.com
2. Create a new API in the Dashboard
3. Note the Domain and Audience
4. Update `.env` with Auth0 details (if using external Auth0 tokens):
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
AUTH0_ISSUER=https://your-domain.auth0.com/
```

## API Documentation

### POST /authorize

Validates an OAuth2 token and checks permissions for the requested resource.

**Request:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "method": "GET",
  "path": "/wallets/wallet-789/transactions"
}
```

**Response (Success):**
```json
{
  "decision": "ALLOW",
  "user_id": "user456",
  "reason": "User has read permission for wallets/wallet-789/transactions",
  "matched_permissions": [
    {
      "action": "read",
      "resource": "wallets/wallet-789/transactions",
      "effect": "allow"
    }
  ]
}
```

**Response (Denied):**
```json
{
  "decision": "DENY",
  "user_id": "user456",
  "reason": "User has explicit deny permission for delete action on transactions",
  "matched_permissions": [
    {
      "action": "delete",
      "resource": "transactions",
      "effect": "deny"
    }
  ]
}
```

### POST /token

Generate a JWT token with user_id embedded as the subject claim. This creates user-specific tokens for authorization requests.

**Request:**
```json
{
  "user_id": "user123"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiaWF0IjoxNzU3NzcyMzIzLCJleHAiOjE3NTc3NzU5MjMsImF1ZCI6Imh0dHBzOi8vYXV0aHNlcnZpY2UuY29tL2FwaSIsImlzcyI6ImF1dGgtc2VydmljZSJ9.signature",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user_id": "user123"
}
```

**Response (Error):**
```json
{
  "error": "Token generation failed",
  "message": "Failed to generate user token"
}
```

**Token Details:**
- **Algorithm**: HS256 (HMAC SHA256)
- **Subject Claim**: Contains the provided user_id
- **Expiration**: 1 hour (3600 seconds)
- **Issuer**: auth-service
- **Audience**: Configurable via AUTH0_AUDIENCE or defaults to 'auth-service'

**Note:** The generated JWT token contains the user_id in the `sub` claim, which is automatically extracted during authorization requests. No need to pass user_id separately in `/authorize` calls.

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Test Scenarios Covered
1. Token validation (valid, expired, invalid signature)
2. Permission resolution (exact match, wildcards, precedence)
3. HTTP method to action mapping
4. Path to resource conversion
5. Error handling scenarios
6. Edge cases (malformed requests, missing permissions)

## Project Structure

```
auth-service-project/
├── src/
│   ├── config/           # Configuration management
│   │   ├── database.ts   # Database configuration
│   │   ├── oauth.ts      # OAuth provider configuration
│   │   └── index.ts      # Main configuration
│   ├── controllers/      # HTTP request handlers
│   │   └── authController.ts
│   ├── services/         # Business logic
│   │   ├── tokenService.ts      # Token validation
│   │   ├── permissionService.ts # Permission checking
│   │   └── authorizationService.ts # Main authorization logic
│   ├── repositories/     # Data access layer
│   │   └── permissionRepository.ts
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── validator.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   ├── pathMapper.ts
│   │   └── wildcardMatcher.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── scripts/         # Utility scripts
│   │   └── initDatabase.ts
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Assumptions & Design Choices

1. **Token Claims**: Assumes the JWT contains a `sub` claim for user ID. Can be configured for different claim names.

2. **Resource Inheritance**: Parent resource permissions do NOT automatically apply to child resources unless explicitly defined or matched by wildcards.

3. **Wildcard Behavior**: 
   - `*` matches any single segment
   - `wallets/*` matches `wallets/wallet-123` but not `wallets/wallet-123/transactions`
   - `wallets/*/transactions/*` matches any transaction in any wallet

4. **Default Behavior**: Returns DENY when no matching permissions are found (fail-secure).

5. **Performance Trade-offs**: Optimized for read-heavy workloads typical in authorization systems.

## Monitoring & Observability

The service includes comprehensive logging using Winston:
- **Info**: Successful authorizations
- **Warn**: Denied access attempts
- **Error**: System errors, token validation failures
- **Debug**: Detailed permission resolution steps

## Future Enhancements

1. **Caching Layer**: Redis for permission caching
2. **Policy Engine**: Support for more complex policies (ABAC, conditions)
3. **Audit Trail**: Detailed audit logging for compliance
4. **Multi-tenancy**: Support for multiple organizations
5. **GraphQL Support**: Alternative API interface
6. **Metrics**: Prometheus metrics for monitoring
7. **Distributed Tracing**: OpenTelemetry integration

## Questions for Discussion

During your call, you might want to discuss:

1. **Scalability**: How would this scale to millions of permission checks?
2. **Caching Strategy**: What's the optimal TTL for permission caching?
3. **Policy Complexity**: How to handle time-based or conditional permissions?
4. **Multi-region**: How to handle global deployments?
5. **Compliance**: GDPR, SOC2 considerations for audit logging?

## License

MIT
