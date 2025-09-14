# Authentication & Authorization Service

## Overview
A OAuth2 token validation and fine-grained permission service built with Node.js, TypeScript, and SQLite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd auth-service-project

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize the database
npm run db:init

# Start the development server
npm run dev
```

### Environment Variables

```bash
# Server Configuration
PORT=8080
NODE_ENV=development
LOG_LEVEL=info

DATABASE_PATH=./data/permissions.db

# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://authorization-api.com

# Security Configuration
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=50

# JWT Configuration
JWT_CLOCK_TOLERANCE=5
```

### Auth0 Setup

1. Create a free account at https://auth0.com
2. Create a new API in the Dashboard
3. Note the Domain and Audience
4. Update `.env` with Auth0 details:
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
AUTH0_ISSUER=https://your-domain.auth0.com/
```

## 📚 API Usage

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

### Authorization Check

```bash
POST /authorize
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "method": "GET",
  "path": "/wallets/wallet-123"
}
```

**Response (ALLOW):**
```json
{
  "decision": "ALLOW",
  "user_id": "user123",
  "reason": "Exact match: wallets/wallet-123",
  "matched_permissions": [
    {
      "action": "read",
      "resource": "wallets/wallet-123",
      "effect": "allow"
    }
  ]
}
```

**Response (DENY):**
```json
{
  "decision": "DENY",
  "user_id": "user123",
  "reason": "Explicit deny rule for delete operations",
  "matched_permissions": [
    {
      "action": "delete",
      "resource": "wallets/wallet-123",
      "effect": "deny"
    }
  ]
}
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

**Integration Tests:**
- ✅ Core authorization scenarios (ALLOW/DENY)
- ✅ Token validation and expiration
- ✅ Wildcard permission inheritance
- ✅ System error handling (fail-secure)
- ✅ Health check functionality
- ✅ HTTP method mapping
- ✅ Resource path handling

**Unit Tests:**
- ✅ Specificity scoring system
- ✅ Pattern generation algorithms
- ✅ HTTP method to action mapping
- ✅ Path to resource conversion
- ✅ Real-world permission scenarios

## 🏗️ Architecture

### Permission Precedence Rules

The service uses a sophisticated tuple-based scoring system for permission resolution:

```typescript
Priority Order (Highest to Lowest):
1. Exact match DENY      → [1, segments, 0]
2. Exact match ALLOW     → [1, segments, 0]
3. Specific wildcard DENY → [0, segments, -wildcards]
4. Specific wildcard ALLOW → [0, segments, -wildcards]
5. Global wildcard DENY   → [0, 0, -∞]
6. Global wildcard ALLOW  → [0, 0, -∞]
7. Default DENY (no match)
```

**Key Principles:**
- **DENY beats ALLOW** at the same specificity level
- **More specific** patterns take precedence
- **Fewer wildcards** rank higher
- **Fail-secure** default (DENY when no permissions match)

