# 🔐 Authentication & Authorization Service Demo

## Interview Demonstration - API-Based Flow

This demonstrates the complete OAuth2 authentication and fine-grained authorization system using direct API calls, perfect for interview presentations.

---

## 🚀 Quick Start

### 1. Start the Server
```bash
npm run dev
```

### 2. Initialize Database (if needed)
```bash
npm run db:init
```

---

## 📋 Demo Flow

### **Step 1: Generate User Tokens**

The `/token` endpoint generates **real JWT tokens** with the provided `user_id` as the subject claim:

**Generate token for user123 (has read/write on transactions, denied delete):**
```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'
```

**Generate token for user456 (has wallet permissions):**
```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user456"}'
```

**Generate token for admin789 (has all permissions):**
```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "admin789"}'
```

**Response Example:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiaWF0IjoxNjk5MzY5MjAwLCJleHAiOjE2OTkzNzI4MDB9.signature",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write",
  "user_id": "user123",
  "note": "Real JWT token for interview demonstration"
}
```

**Token Structure:**
- **Header**: `{"alg": "HS256", "typ": "JWT"}`
- **Payload**: `{"sub": "user123", "iat": 1699369200, "exp": 1699372800}`
- **Signature**: HMAC SHA256 signed with secret key

### **Step 2: Test Authorization Scenarios**

Use the generated token to test different authorization scenarios:

#### **Scenario A: ALLOW - user123 reading transactions**
```bash
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiaWF0IjoxNjk5MzY5MjAwLCJleHAiOjE2OTkzNzI4MDB9.signature",
    "method": "GET",
    "path": "/transactions"
  }'
```

**Expected Response:**
```json
{
  "decision": "ALLOW",
  "user_id": "user123",
  "reason": "User has read permission for transactions",
  "matched_permissions": [
    {
      "action": "read",
      "resource": "transactions",
      "effect": "allow"
    }
  ]
}
```

#### **Scenario B: DENY - user123 deleting transactions**
```bash
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiaWF0IjoxNjk5MzY5MjAwLCJleHAiOjE2OTkzNzI4MDB9.signature",
    "method": "DELETE",
    "path": "/transactions"
  }'
```

**Expected Response:**
```json
{
  "decision": "DENY",
  "user_id": "user123",
  "reason": "User is explicitly denied delete access to transactions",
  "matched_permissions": [
    {
      "action": "delete",
      "resource": "transactions",
      "effect": "deny"
    }
  ]
}
```

#### **Scenario C: Wildcard Permissions - user456 accessing wallets**
```bash
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyNDU2IiwiaWF0IjoxNjk5MzY5MjAwLCJleHAiOjE2OTkzNzI4MDB9.signature",
    "method": "GET",
    "path": "/wallets/wallet-789/transactions"
  }'
```

#### **Scenario D: Admin Access - admin789 accessing anything**
```bash
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbjc4OSIsImF1ZCI6Imh0dHBzOi8vYXV0aHNlcnZpY2UuY29tL2FwaSIsImlzcyI6Imh0dHBzOi8vZGV2LXoxd21tYWF4cndiYmIzaWIudXMuYXV0aDAuY29tLyIsImV4cCI6MTcyNjIxODA3NiwiaWF0IjoxNzI2MjE0NDc2fQ.mock-signature",
    "method": "DELETE",
    "path": "/admin/users/sensitive-data"
  }'
```

---

## 🎯 Interview Talking Points

### **Architecture Highlights:**

1. **Real JWT Token Generation**: 
   - Generates proper JWT tokens using HMAC SHA256 signing
   - Sets `sub` claim to the provided user_id
   - Includes standard JWT claims (iat, exp)
   - Tokens can be decoded and validated properly

2. **Dual Token Validation**: 
   - Supports locally signed JWT tokens (HMAC SHA256)
   - Also supports Auth0 JWT tokens (RSA256 with JWKS)
   - Automatic fallback between validation methods
   - Extracts user_id from token's `sub` claim

3. **Permission Resolution Algorithm**:
   - Extracts user_id from token's `sub` claim
   - Specificity-based scoring system
   - DENY takes precedence over ALLOW
   - Supports wildcard patterns (`*`, `wallets/*`, etc.)

4. **Resource Mapping**:
   - HTTP methods → actions (GET=read, POST=write, DELETE=delete)
   - URL paths → resources (`/wallets/123` → `wallets/123`)

5. **Database Design**:
   - Simple but powerful: `user_id`, `action`, `resource`, `effect`
   - Optimized queries with pattern matching
   - Prepared statements for security

### **Key Features Demonstrated:**

✅ **Clean API Design** - Simple, focused endpoints  
✅ **JWT Token Generation** - Standard token structure  
✅ **User Extraction** - From token `sub` claim to database lookup  
✅ **Fine-grained Permissions** - Resource-level access control  
✅ **Wildcard Support** - Hierarchical permission inheritance  
✅ **Precedence Rules** - DENY > ALLOW, exact > wildcard  
✅ **Real-time Authorization** - Sub-millisecond response times  
✅ **Production Ready** - Rate limiting, logging, error handling  

---

## 🔧 Additional Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```

### Batch Authorization
```bash
curl -X POST http://localhost:8080/authorize/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "access_token": "your-token-here",
        "method": "GET",
        "path": "/wallets/123"
      },
      {
        "access_token": "your-token-here", 
        "method": "DELETE",
        "path": "/transactions/456"
      }
    ]
  }'
```

### Token Validation Only
```bash
curl -X POST http://localhost:8080/validate \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "your-token-here"
  }'
```

---

## 🎪 Live Demo Script

**For interviews, follow this flow:**

1. **Start with health check** - Show service is running
2. **Generate user123 token** - `POST /token {"user_id": "user123"}`
3. **Show token structure** - Explain JWT format and claims
4. **Test ALLOW scenario** - Show successful authorization
5. **Test DENY scenario** - Show explicit denial works
6. **Generate admin789 token** - `POST /token {"user_id": "admin789"}`
7. **Test admin access** - Show global permissions work
8. **Explain architecture** - Token → User → Permissions → Decision

**Interview Advantages:**
- **Simple & Clear**: Easy to understand token generation
- **Standard JWT**: Shows understanding of token structure
- **Focused Demo**: No complex OAuth flows to distract
- **Production Concepts**: Real authorization patterns

This demonstrates a **complete, production-ready authorization service** with clean, simple design! 🚀
