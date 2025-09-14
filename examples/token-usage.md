# Token Generation and Authorization Usage Examples

## Complete Flow: Generate Token → Authorize Request

This example demonstrates the complete JWT token generation and authorization flow using the service.

## Prerequisites

1. Optionally configure JWT secret in your `.env` file (defaults to demo secret):
```bash
JWT_SECRET=your-secret-key-change-in-production
```

2. Start the service:
```bash
npm run dev
```

## Step 1: Generate a User Token

Generate a JWT token with user_id embedded as the subject claim:

### Using cURL:
```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123"
  }'
```

### Using JavaScript (Node.js):
```javascript
const axios = require('axios');

async function getToken(userId) {
  try {
    const response = await axios.post('http://localhost:8080/token', {
      user_id: userId
    });
    
    console.log('Token obtained:', response.data);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting token:', error.response?.data || error.message);
  }
}
```

### Using Python:
```python
import requests

def get_token(user_id):
    url = "http://localhost:8080/token"
    payload = {
        "user_id": user_id
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Token obtained for {data['user_id']}: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"Error: {response.json()}")
        return None
```

### Expected Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiaWF0IjoxNzU3NzcyMzIzLCJleHAiOjE3NTc3NzU5MjMsImF1ZCI6Imh0dHBzOi8vYXV0aHNlcnZpY2UuY29tL2FwaSIsImlzcyI6ImF1dGgtc2VydmljZSJ9.signature",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user_id": "user123"
}
```

**Token Details:**
- **Algorithm**: HS256 (HMAC SHA256)
- **Subject**: Contains the user_id ("user123")
- **Expiration**: 1 hour (3600 seconds)
- **Issuer**: auth-service

## Step 2: Use the Token for Authorization

Once you have the token, use it to check permissions for specific resources:

### Using cURL:
```bash
# Save the token to a variable (or copy from previous response)
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiaWF0IjoxNzU3NzcyMzIzLCJleHAiOjE3NTc3NzU5MjMsImF1ZCI6Imh0dHBzOi8vYXV0aHNlcnZpY2UuY29tL2FwaSIsImlzcyI6ImF1dGgtc2VydmljZSJ9.signature"

# Check authorization for a specific resource
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d "{
    \"access_token\": \"$TOKEN\",
    \"method\": \"GET\",
    \"path\": \"/wallets/wallet-123/transactions\"
  }"
```

### Complete Flow Example (Node.js):
```javascript
const axios = require('axios');

class AuthService {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    // Check if we have a valid cached token
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/token`, {
        grant_type: 'client_credentials',
        scope: 'read:wallets write:wallets read:transactions'
      });

      this.token = response.data.access_token;
      // Set expiry time (slightly before actual expiry for safety)
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      return this.token;
    } catch (error) {
      console.error('Failed to get token:', error.response?.data);
      throw error;
    }
  }

  async checkAuthorization(method, path) {
    const token = await this.getToken();

    try {
      const response = await axios.post(`${this.baseUrl}/authorize`, {
        access_token: token,
        method: method,
        path: path
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('Authorization denied:', error.response.data);
      } else {
        console.error('Authorization check failed:', error.response?.data);
      }
      throw error;
    }
  }
}

// Usage
async function main() {
  const authService = new AuthService();

  try {
    // Check various permissions
    const checks = [
      { method: 'GET', path: '/wallets/wallet-123' },
      { method: 'POST', path: '/wallets' },
      { method: 'DELETE', path: '/wallets/wallet-123/transactions/tx-456' },
      { method: 'GET', path: '/users/user-789/profile' }
    ];

    for (const check of checks) {
      console.log(`\nChecking ${check.method} ${check.path}...`);
      const result = await authService.checkAuthorization(check.method, check.path);
      console.log(`Decision: ${result.decision}`);
      console.log(`Reason: ${result.reason}`);
    }
  } catch (error) {
    console.error('Error in main:', error.message);
  }
}

main();
```

## Step 3: Handle Different Scenarios

### Successful Authorization:
```json
{
  "decision": "ALLOW",
  "user_id": "auth0|507f1f77bcf86cd799439011",
  "reason": "User has read permission for wallets/wallet-123",
  "matched_permissions": [
    {
      "action": "read",
      "resource": "wallets/*",
      "effect": "allow"
    }
  ]
}
```

### Denied Authorization:
```json
{
  "decision": "DENY",
  "user_id": "auth0|507f1f77bcf86cd799439011",
  "reason": "User is explicitly denied delete permission for transactions",
  "matched_permissions": [
    {
      "action": "delete",
      "resource": "transactions",
      "effect": "deny"
    }
  ]
}
```

### Token Generation Error (Invalid Credentials):
```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

### Token Validation Error (Expired Token):
```json
{
  "decision": "DENY",
  "user_id": "unknown",
  "reason": "Token has expired",
  "matched_permissions": []
}
```

## Best Practices

1. **Token Caching**: Cache tokens until they expire to avoid unnecessary API calls
2. **Error Handling**: Always handle both token generation and authorization errors
3. **Token Refresh**: Implement automatic token refresh before expiry
4. **Secure Storage**: Never expose client credentials in client-side code
5. **Scope Management**: Request only the scopes you need
6. **Rate Limiting**: Be aware of rate limits on both token generation and authorization endpoints

## Testing with Different Permissions

To test different permission scenarios, you can:

1. Add test permissions to the database:
```sql
-- Allow read on all wallets
INSERT INTO permissions (user_id, action, resource, effect) 
VALUES ('auth0|test-user', 'read', 'wallets/*', 'allow');

-- Deny delete on transactions
INSERT INTO permissions (user_id, action, resource, effect) 
VALUES ('auth0|test-user', 'delete', 'transactions', 'deny');

-- Allow specific wallet access
INSERT INTO permissions (user_id, action, resource, effect) 
VALUES ('auth0|test-user', 'write', 'wallets/wallet-123', 'allow');
```

2. Use the token to test various authorization scenarios

## Troubleshooting

### Common Issues:

1. **"OAuth provider not properly configured"**
   - Ensure AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET are set in .env

2. **"Client authentication failed"**
   - Verify your Auth0 M2M application credentials
   - Check that the application is authorized for your API

3. **"Token has expired"**
   - Request a new token using the /token endpoint

4. **"Invalid token format"**
   - Ensure you're passing the complete JWT token
   - Check that the token hasn't been truncated

## Additional Resources

- [Auth0 M2M Authentication](https://auth0.com/docs/flows/client-credentials-flow)
- [JWT.io - Token Decoder](https://jwt.io/)
- [OAuth 2.0 Client Credentials Grant](https://oauth.net/2/grant-types/client-credentials/)
