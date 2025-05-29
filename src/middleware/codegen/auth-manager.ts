/**
 * Codegen Authentication Manager
 * 
 * Handles authentication token management and validation for Codegen SDK
 */

export interface AuthCredentials {
  token: string;
  orgId: string;
}

export interface AuthValidationResult {
  valid: boolean;
  error?: string;
  expiresAt?: Date;
}

export class CodegenAuthManager {
  private credentials: AuthCredentials | null = null;
  private validationCache: Map<string, AuthValidationResult> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize authentication with credentials
   */
  setCredentials(credentials: AuthCredentials): void {
    this.credentials = credentials;
    // Clear validation cache when credentials change
    this.validationCache.clear();
  }

  /**
   * Get current credentials
   */
  getCredentials(): AuthCredentials | null {
    return this.credentials;
  }

  /**
   * Load credentials from environment variables
   */
  loadFromEnvironment(): AuthCredentials {
    const token = process.env.CODEGEN_API_TOKEN || process.env.CODEGEN_API_KEY;
    const orgId = process.env.CODEGEN_ORG_ID;

    if (!token) {
      throw new Error(
        'Codegen API token not found. Please set CODEGEN_API_TOKEN or CODEGEN_API_KEY environment variable.'
      );
    }

    if (!orgId) {
      throw new Error(
        'Codegen organization ID not found. Please set CODEGEN_ORG_ID environment variable.'
      );
    }

    const credentials = { token, orgId };
    this.setCredentials(credentials);
    return credentials;
  }

  /**
   * Validate authentication credentials
   */
  async validateCredentials(
    baseUrl: string = 'https://codegen-sh-rest-api.modal.run'
  ): Promise<AuthValidationResult> {
    if (!this.credentials) {
      return {
        valid: false,
        error: 'No credentials provided',
      };
    }

    const cacheKey = `${this.credentials.token}-${this.credentials.orgId}`;
    const cached = this.validationCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return cached;
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.token}`,
          'X-Org-ID': this.credentials.orgId,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result: AuthValidationResult = {
          valid: true,
          expiresAt: new Date(Date.now() + this.cacheExpiry),
        };
        
        this.validationCache.set(cacheKey, result);
        return result;
      } else {
        const errorText = await response.text();
        const result: AuthValidationResult = {
          valid: false,
          error: `Authentication failed (${response.status}): ${errorText}`,
        };
        
        return result;
      }
    } catch (error) {
      return {
        valid: false,
        error: `Authentication validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Refresh authentication token (if supported by API)
   */
  async refreshToken(
    baseUrl: string = 'https://codegen-sh-rest-api.modal.run'
  ): Promise<AuthCredentials> {
    if (!this.credentials) {
      throw new Error('No credentials to refresh');
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.token}`,
          'X-Org-ID': this.credentials.orgId,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newCredentials: AuthCredentials = {
          token: data.token,
          orgId: this.credentials.orgId,
        };
        
        this.setCredentials(newCredentials);
        return newCredentials;
      } else {
        throw new Error(`Token refresh failed (${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear stored credentials and cache
   */
  clearCredentials(): void {
    this.credentials = null;
    this.validationCache.clear();
  }

  /**
   * Check if credentials are available
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('No credentials available for authentication');
    }

    return {
      'Authorization': `Bearer ${this.credentials.token}`,
      'X-Org-ID': this.credentials.orgId,
    };
  }

  /**
   * Validate credentials and throw if invalid
   */
  async ensureValidCredentials(baseUrl?: string): Promise<void> {
    const validation = await this.validateCredentials(baseUrl);
    
    if (!validation.valid) {
      throw new Error(`Invalid Codegen credentials: ${validation.error}`);
    }
  }
}

// Singleton instance for global use
export const authManager = new CodegenAuthManager();

