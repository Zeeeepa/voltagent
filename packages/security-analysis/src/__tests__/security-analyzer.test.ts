/**
 * Tests for SecurityAnalyzer
 */

import { SecurityAnalyzer } from '../security-analyzer';
import { CodeParser } from '../utils/code-parser';

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
  });

  describe('analyzeContent', () => {
    it('should detect SQL injection vulnerabilities', async () => {
      const vulnerableCode = `
        function getUserById(id) {
          const query = "SELECT * FROM users WHERE id = " + id;
          return database.execute(query);
        }
      `;

      const result = await analyzer.analyzeContent(vulnerableCode, 'test.js');

      expect(result.total_vulnerabilities).toBeGreaterThan(0);
      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql_injection',
            risk_level: 'critical'
          })
        ])
      );
    });

    it('should detect XSS vulnerabilities', async () => {
      const vulnerableCode = `
        function displayMessage(message) {
          document.getElementById('output').innerHTML = message;
        }
      `;

      const result = await analyzer.analyzeContent(vulnerableCode, 'test.js');

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'xss_vulnerability'
          })
        ])
      );
    });

    it('should detect hardcoded secrets', async () => {
      const vulnerableCode = `
        const config = {
          apiKey: "sk-1234567890abcdef",
          password: "supersecret123"
        };
      `;

      const result = await analyzer.analyzeContent(vulnerableCode, 'test.js');

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'hardcoded_secrets',
            risk_level: 'critical'
          })
        ])
      );
    });

    it('should detect command injection', async () => {
      const vulnerableCode = `
        function executeCommand(userInput) {
          exec("ls " + userInput);
        }
      `;

      const result = await analyzer.analyzeContent(vulnerableCode, 'test.js');

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'command_injection',
            risk_level: 'critical'
          })
        ])
      );
    });

    it('should not detect vulnerabilities in secure code', async () => {
      const secureCode = `
        function getUserById(id) {
          const query = "SELECT * FROM users WHERE id = ?";
          return database.execute(query, [id]);
        }
        
        function displayMessage(message) {
          document.getElementById('output').textContent = sanitize(message);
        }
      `;

      const result = await analyzer.analyzeContent(secureCode, 'test.js');

      expect(result.total_vulnerabilities).toBe(0);
    });

    it('should calculate correct severity levels', async () => {
      const criticalVulnCode = `
        const password = "hardcoded123";
        const query = "SELECT * FROM users WHERE id = " + userId;
      `;

      const result = await analyzer.analyzeContent(criticalVulnCode, 'test.js');

      expect(result.severity).toBe('critical');
      expect(result.summary.critical).toBeGreaterThan(0);
    });

    it('should provide OWASP coverage information', async () => {
      const vulnerableCode = `
        const apiKey = "sk-1234567890abcdef";
        const query = "SELECT * FROM users WHERE id = " + id;
      `;

      const result = await analyzer.analyzeContent(vulnerableCode, 'test.js');

      expect(result.owasp_coverage).toContain('A03:2021'); // Injection
      expect(result.owasp_coverage).toContain('A06:2021'); // Vulnerable Components
    });

    it('should respect confidence threshold', async () => {
      const vulnerableCode = `
        const query = "SELECT * FROM users WHERE id = " + id;
      `;

      const highThresholdResult = await analyzer.analyzeContent(
        vulnerableCode, 
        'test.js', 
        { confidenceThreshold: 95 }
      );

      const lowThresholdResult = await analyzer.analyzeContent(
        vulnerableCode, 
        'test.js', 
        { confidenceThreshold: 50 }
      );

      expect(lowThresholdResult.total_vulnerabilities).toBeGreaterThanOrEqual(
        highThresholdResult.total_vulnerabilities
      );
    });
  });

  describe('language detection', () => {
    it('should detect vulnerabilities in Python code', async () => {
      const pythonCode = `
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = " + user_id
    return execute_query(query)
      `;

      const result = await analyzer.analyzeContent(pythonCode, 'test.py');

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql_injection'
          })
        ])
      );
    });

    it('should detect vulnerabilities in Java code', async () => {
      const javaCode = `
public User getUser(String userId) {
    String query = "SELECT * FROM users WHERE id = " + userId;
    return database.execute(query);
}
      `;

      const result = await analyzer.analyzeContent(javaCode, 'Test.java');

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql_injection'
          })
        ])
      );
    });
  });

  describe('performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const largeCode = 'const x = 1;\n'.repeat(1000);
      
      const startTime = Date.now();
      await analyzer.analyzeContent(largeCode, 'test.js');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('error handling', () => {
    it('should handle malformed code gracefully', async () => {
      const malformedCode = `
        function incomplete(
          // Missing closing brace and parenthesis
      `;

      const result = await analyzer.analyzeContent(malformedCode, 'test.js');

      expect(result).toBeDefined();
      expect(result.module).toBe('security_vulnerability_detection');
    });

    it('should handle empty content', async () => {
      const result = await analyzer.analyzeContent('', 'test.js');

      expect(result.total_vulnerabilities).toBe(0);
      expect(result.total_files_scanned).toBe(1);
    });
  });
});

