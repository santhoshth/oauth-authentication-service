import { createRemoteJWKSet, jwtVerify, JWTVerifyOptions } from 'jose';
import { config } from '../config';
import { ITokenService, ValidationResult, TokenPayload } from '../types';
import { logger } from '../utils/logger';
import axios from 'axios';

// TokenService handles JWT token validation
export class TokenService implements ITokenService {
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private verifyOptions: JWTVerifyOptions;
  private userInfoUrl: string;

  constructor() {
    const auth0Config = config.oauth.auth0;
    const auth0Domain = auth0Config?.domain || 'dev-z1wmmaaxrwbbb3ib.us.auth0.com';
    const auth0Audience = auth0Config?.audience || 'https://authorization-api.com';
    const auth0Issuer = `https://${auth0Domain}/`;
    
    const jwksUri = `https://${auth0Domain}/.well-known/jwks.json`;
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
    
    this.verifyOptions = {
      audience: auth0Audience,
      issuer: auth0Issuer,
      algorithms: ['RS256'],
      clockTolerance: config.jwt.clockTolerance
    };
    
    this.userInfoUrl = `https://${auth0Domain}/userinfo`;
    
    logger.info('TokenService initialized with Auth0 config');
  }

  async validateToken(token: string): Promise<ValidationResult> {
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      // Validate token format
      const tokenParts = cleanToken.split('.');
      if (tokenParts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid token format'
        };
      }

      try {
        logger.info('Attempting Auth0 token validation');
        
        const { payload } = await jwtVerify(cleanToken, this.jwks, this.verifyOptions);
        
        const userInfo = await axios.get(this.userInfoUrl, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
          },
        });

        if (!userInfo.data) {
          return {
            valid: false,
            error: 'User ID not found in Auth0 token'
          };
        }

        logger.info('Auth0 RS256 token validated');
        
        return {
          valid: true,
          payload: payload as TokenPayload,
          userInfo: userInfo.data
        };
      } catch (auth0ValidationError) {
        const errorMessage = auth0ValidationError instanceof Error ? auth0ValidationError.message : String(auth0ValidationError);
        logger.error('Auth0 token validation failed', { 
          error: errorMessage
        });
        
        return {
          valid: false,
          error: `Auth0 token validation failed: ${errorMessage}`
        };
      }
      
    } catch (error) {
      logger.error('Token validation error', { error });
      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }
}

export default TokenService;
