import { AccessControlAnalyzer } from '../modules/security/access-control-analyzer';
import { AnalysisContext } from '../types';

describe('AccessControlAnalyzer', () => {
  let analyzer: AccessControlAnalyzer;

  beforeEach(() => {
    analyzer = new AccessControlAnalyzer();
  });

  describe('analyze', () => {
    it('should detect unprotected admin routes', async () => {
      const context: AnalysisContext = {
        filePath: 'routes/admin.js',
        content: `
          const express = require('express');
          const router = express.Router();
          
          // This should be flagged - admin route without auth
          router.get('/admin/users', (req, res) => {
            res.json({ users: [] });
          });
          
          // This should be flagged - admin route without auth
          app.post('/admin/delete-user', (req, res) => {
            // Delete user logic
          });
        `,
        language: 'javascript',
        framework: 'express',
      };

      const result = await analyzer.analyze([context]);

      expect(result.module).toBe('access_control_analysis');
      expect(result.severity).toBe('critical');
      expect(result.findings).toHaveLength(2);
      
      const adminFindings = result.findings.filter(f => f.type === 'missing_authentication');
      expect(adminFindings).toHaveLength(2);
      expect(adminFindings[0].severity).toBe('critical');
      expect(adminFindings[0].risk).toBe('unauthorized_admin_access');
    });

    it('should detect missing authentication on API routes', async () => {
      const context: AnalysisContext = {
        filePath: 'routes/api.js',
        content: `
          const express = require('express');
          const app = express();
          
          // This should be flagged
          app.get('/api/users', (req, res) => {
            res.json({ users: [] });
          });
          
          // This should NOT be flagged - has auth middleware
          app.get('/api/protected', authenticateToken, (req, res) => {
            res.json({ data: 'protected' });
          });
        `,
        language: 'javascript',
        framework: 'express',
      };

      const result = await analyzer.analyze([context]);

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe('missing_authentication');
      expect(result.findings[0].endpoint).toBe('GET /api/users');
    });

    it('should detect hardcoded secrets', async () => {
      const context: AnalysisContext = {
        filePath: 'config/database.js',
        content: `
          const config = {
            database: {
              password: "hardcoded_password_123",
              api_key: "sk-1234567890abcdef",
              secret: "super_secret_key_xyz"
            }
          };
        `,
        language: 'javascript',
      };

      const result = await analyzer.analyze([context]);

      const secretFindings = result.findings.filter(f => f.type === 'insecure_storage');
      expect(secretFindings.length).toBeGreaterThan(0);
      expect(secretFindings[0].severity).toBe('critical');
      expect(secretFindings[0].risk).toBe('credential_exposure');
    });

    it('should detect weak role validation', async () => {
      const context: AnalysisContext = {
        filePath: 'middleware/auth.js',
        content: `
          function checkAdmin(req, res, next) {
            // This should be flagged - weak role check
            if (req.user.role === "admin") {
              next();
            } else {
              res.status(403).send('Forbidden');
            }
          }
          
          function checkRole(req, res, next) {
            // This should also be flagged
            if (user.role == "admin") {
              next();
            }
          }
        `,
        language: 'javascript',
      };

      const result = await analyzer.analyze([context]);

      const roleFindings = result.findings.filter(f => f.type === 'weak_authorization');
      expect(roleFindings.length).toBeGreaterThan(0);
      expect(roleFindings[0].risk).toBe('role_bypass');
    });

    it('should detect missing CSRF protection', async () => {
      const context: AnalysisContext = {
        filePath: 'routes/forms.js',
        content: `
          const express = require('express');
          const app = express();
          
          // These should be flagged - state-changing operations without CSRF
          app.post('/update-profile', (req, res) => {
            // Update logic
          });
          
          app.put('/change-password', (req, res) => {
            // Password change logic
          });
          
          app.delete('/delete-account', (req, res) => {
            // Delete logic
          });
        `,
        language: 'javascript',
        framework: 'express',
      };

      const result = await analyzer.analyze([context]);

      const csrfFindings = result.findings.filter(f => f.type === 'csrf_vulnerability');
      expect(csrfFindings.length).toBeGreaterThan(0);
      expect(csrfFindings[0].risk).toBe('cross_site_request_forgery');
    });

    it('should detect JWT tokens without expiration', async () => {
      const context: AnalysisContext = {
        filePath: 'auth/jwt.js',
        content: `
          const jwt = require('jsonwebtoken');
          
          function generateToken(user) {
            // This should be flagged - no expiration
            return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
          }
          
          function generateTokenWithExpiry(user) {
            // This should NOT be flagged - has expiration
            return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
          }
        `,
        language: 'javascript',
      };

      const result = await analyzer.analyze([context]);

      const tokenFindings = result.findings.filter(f => f.type === 'token_validation');
      expect(tokenFindings.length).toBeGreaterThan(0);
      expect(tokenFindings[0].risk).toBe('token_never_expires');
    });

    it('should detect privilege escalation risks', async () => {
      const context: AnalysisContext = {
        filePath: 'routes/user.js',
        content: `
          app.put('/user/profile', (req, res) => {
            const user = req.user;
            
            // This should be flagged - role can be modified via request
            user.role = req.body.role;
            
            // This should also be flagged
            req.user.role = params.role;
            
            user.save();
          });
        `,
        language: 'javascript',
      };

      const result = await analyzer.analyze([context]);

      const escalationFindings = result.findings.filter(f => f.type === 'privilege_escalation');
      expect(escalationFindings.length).toBeGreaterThan(0);
      expect(escalationFindings[0].severity).toBe('critical');
      expect(escalationFindings[0].risk).toBe('privilege_escalation');
    });

    it('should not analyze test files', async () => {
      const context: AnalysisContext = {
        filePath: 'routes/admin.test.js',
        content: `
          // This is a test file and should be ignored
          app.get('/admin/users', (req, res) => {
            res.json({ users: [] });
          });
        `,
        language: 'javascript',
      };

      const result = await analyzer.analyze([context]);

      expect(result.findings).toHaveLength(0);
      expect(result.metadata?.filesAnalyzed).toBe(0);
    });

    it('should calculate correct metadata', async () => {
      const contexts: AnalysisContext[] = [
        {
          filePath: 'file1.js',
          content: 'app.get("/test", (req, res) => {});',
          language: 'javascript',
        },
        {
          filePath: 'file2.js',
          content: 'app.post("/admin", (req, res) => {});',
          language: 'javascript',
        },
      ];

      const result = await analyzer.analyze(contexts);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.filesAnalyzed).toBe(2);
      expect(result.metadata!.totalLines).toBeGreaterThan(0);
      expect(result.metadata!.analysisTime).toBeGreaterThan(0);
      expect(typeof result.metadata!.coverage).toBe('number');
    });
  });
});

