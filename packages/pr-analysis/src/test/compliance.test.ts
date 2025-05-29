/**
 * Test file for Compliance Analysis Module
 */

import { ComplianceAnalysisModule } from '../modules/compliance/index.js';
import { FileInfo } from '../types/index.js';

describe('ComplianceAnalysisModule', () => {
  let module: ComplianceAnalysisModule;

  beforeEach(() => {
    module = new ComplianceAnalysisModule();
  });

  describe('TypeScript/JavaScript Analysis', () => {
    it('should detect naming convention violations', async () => {
      const files: FileInfo[] = [{
        path: 'src/user_service.ts',
        content: `
export class user_service {
  private user_id: string;
  
  public get_user_data() {
    return this.user_id;
  }
}`,
        language: 'typescript',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      expect(result.findings).toHaveLength(3);
      expect(result.findings[0].type).toBe('naming_convention');
      expect(result.findings[0].context?.expected).toBe('UserService');
    });

    it('should detect missing documentation', async () => {
      const files: FileInfo[] = [{
        path: 'src/api.ts',
        content: `
export function createUser(userData: any) {
  return userData;
}

export class UserManager {
  process() {
    // implementation
  }
}`,
        language: 'typescript',
        size: 150,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const docFindings = result.findings.filter(f => f.type === 'missing_documentation');
      expect(docFindings.length).toBeGreaterThan(0);
    });

    it('should detect style violations', async () => {
      const files: FileInfo[] = [{
        path: 'src/bad-style.js',
        content: `
function test()   {
    var x = 1    
    if(x > 0){
        console.log("test")
    }
}`,
        language: 'javascript',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const styleFindings = result.findings.filter(f => 
        f.rule?.includes('semicolon') || f.rule?.includes('trailing_whitespace')
      );
      expect(styleFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Security Compliance', () => {
    it('should detect hardcoded secrets', async () => {
      const files: FileInfo[] = [{
        path: 'src/config.ts',
        content: `
const config = {
  api_key: "sk-1234567890abcdef",
  password: "mypassword123",
  secret: "supersecret"
};`,
        language: 'typescript',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const secretFindings = result.findings.filter(f => f.type === 'hardcoded_secrets');
      expect(secretFindings.length).toBeGreaterThan(0);
      expect(secretFindings[0].severity).toBe('high');
    });

    it('should detect SQL injection risks', async () => {
      const files: FileInfo[] = [{
        path: 'src/database.ts',
        content: `
function getUserById(id: string) {
  const query = "SELECT * FROM users WHERE id = '" + id + "'";
  return db.execute(query);
}`,
        language: 'typescript',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const sqlFindings = result.findings.filter(f => f.type === 'sql_injection_risk');
      expect(sqlFindings.length).toBeGreaterThan(0);
      expect(sqlFindings[0].severity).toBe('high');
    });

    it('should detect insecure HTTP usage', async () => {
      const files: FileInfo[] = [{
        path: 'src/api-client.ts',
        content: `
const apiUrl = "http://api.example.com/users";
fetch(apiUrl).then(response => response.json());`,
        language: 'typescript',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const httpFindings = result.findings.filter(f => f.type === 'insecure_http');
      expect(httpFindings.length).toBeGreaterThan(0);
    });
  });

  describe('License Compliance', () => {
    it('should validate package.json license', async () => {
      const files: FileInfo[] = [{
        path: 'package.json',
        content: `{
  "name": "test-package",
  "version": "1.0.0",
  "license": "WTFPL"
}`,
        language: 'json',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const licenseFindings = result.findings.filter(f => f.type === 'invalid_license');
      expect(licenseFindings.length).toBeGreaterThan(0);
    });

    it('should detect missing license headers', async () => {
      const files: FileInfo[] = [{
        path: 'src/important-module.ts',
        content: `
export class ImportantModule {
  process() {
    // critical business logic
  }
}`,
        language: 'typescript',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const headerFindings = result.findings.filter(f => f.type === 'missing_license_header');
      expect(headerFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Python Analysis', () => {
    it('should detect Python naming violations', async () => {
      const files: FileInfo[] = [{
        path: 'src/userService.py',
        content: `
class userService:
    def __init__(self):
        self.userId = None
    
    def getUserData(self):
        return self.userId`,
        language: 'python',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const namingFindings = result.findings.filter(f => f.type === 'naming_convention');
      expect(namingFindings.length).toBeGreaterThan(0);
    });

    it('should detect missing docstrings', async () => {
      const files: FileInfo[] = [{
        path: 'src/api.py',
        content: `
def create_user(user_data):
    return user_data

class UserManager:
    def process(self):
        pass`,
        language: 'python',
        size: 100,
        modified: true
      }];

      const result = await module.analyze(files);
      
      const docFindings = result.findings.filter(f => f.type === 'missing_docstring');
      expect(docFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should return proper configuration', () => {
      const config = module.getConfiguration();
      
      expect(config.enabled).toBe(true);
      expect(config.rules.enforceStyleGuide).toBe(true);
      expect(config.rules.requireDocumentation).toBe(true);
      expect(config.excludePatterns).toContain('node_modules/**');
      expect(config.includePatterns).toContain('**/*.ts');
    });
  });

  describe('Overall Analysis', () => {
    it('should calculate correct severity', async () => {
      const files: FileInfo[] = [{
        path: 'src/critical.ts',
        content: `
const api_key = "sk-1234567890abcdef";
const query = "SELECT * FROM users WHERE id = '" + userId + "'";

export function unsafeFunction() {
  // no documentation
}`,
        language: 'typescript',
        size: 200,
        modified: true
      }];

      const result = await module.analyze(files);
      
      expect(result.severity).toBe('high');
      expect(result.metadata?.filesAnalyzed).toBe(1);
      expect(result.metadata?.rulesApplied).toContain('security_compliance');
    });
  });
});

