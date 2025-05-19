# Feature Implementation Excellence Framework v2.0 - Node.js/React Example

## ROLE
You are a senior software engineer with 10+ years of experience in Node.js and React, specializing in feature design, implementation, and integration. You have deep expertise in software architecture, testing methodologies, and production-grade code quality.

## OBJECTIVE
Design and implement a comprehensive, production-ready "Multi-Factor Authentication" feature that integrates seamlessly with the existing codebase while following best practices for architecture, testing, and documentation.

## CONTEXT
**Repository**: https://github.com/organization/user-management-service
**Branch/Commit**: main (commit: a7b3c9d)
**Feature Scope**: Implement multi-factor authentication (MFA) with support for TOTP (Time-based One-Time Password) and SMS verification methods
**Technology Stack**: Node.js, Express, MongoDB, React, TypeScript, Jest

**Existing Architecture**:
```
The application follows a layered architecture:

* Frontend: React with TypeScript, Redux for state management
* Backend: Express.js API with controller-service-repository pattern
* Database: MongoDB with Mongoose ODM
* Authentication: JWT-based authentication with refresh tokens

Current authentication flow:

1. User logs in with username/password
2. Server validates credentials and issues JWT
3. Client stores JWT and uses it for subsequent requests
4. Refresh token flow for token renewal

The system has existing user management functionality including registration, login, password reset, and profile management.
```

**Requirements**:
- Implement TOTP-based MFA using standard algorithms (RFC 6238)
- Implement SMS-based verification as an alternative MFA method
- Allow users to enable/disable MFA for their accounts
- Support MFA enrollment during registration or later from user settings
- Provide backup codes for account recovery
- Ensure secure storage of MFA secrets
- Maintain backward compatibility with existing authentication flow

**Constraints**:
- Must comply with OWASP security best practices
- Must maintain or improve current API response times
- Must support all modern browsers and mobile devices
- Must be accessible and follow WCAG 2.1 guidelines
- Must support internationalization

## DESIGN METHODOLOGY

### 1. Architecture Design
- Define the architectural approach:
  - Extend existing authentication system with MFA middleware
  - Implement provider pattern for different MFA methods
  - Use strategy pattern to select appropriate verification method
- Identify integration points with existing systems:
  - Authentication Service: Add MFA verification step after password validation
  - User Service: Add MFA configuration to user profiles
  - Frontend Auth Flow: Modify to handle MFA challenge step
- Design component boundaries and responsibilities:
  - MFA Service: Core logic for managing MFA methods and verification
  - TOTP Provider: Generate and validate TOTP codes
  - SMS Provider: Send and validate SMS verification codes
  - Backup Code Manager: Generate and validate backup codes

### 2. Data Model Design
- Define data structures:
  - MFAConfiguration: Store user's MFA settings and enabled methods
  - TOTPSecret: Securely store TOTP secret keys
  - BackupCodes: Store hashed backup recovery codes
  - VerificationAttempt: Track verification attempts for rate limiting
- Establish data flow:
  - Registration Flow: Optional MFA enrollment after account creation
  - Login Flow: Password verification → MFA challenge → JWT issuance
  - Settings Flow: Enable/disable MFA, change MFA method, regenerate backup codes
- Define persistence strategy:
  - Extend User schema with MFA-related fields
  - Encrypt sensitive MFA data at rest
  - Use separate collection for verification attempts for performance

### 3. Interface Design
- Define API contracts:
  - POST /api/auth/mfa/enroll: Initialize MFA enrollment
  - POST /api/auth/mfa/verify: Verify MFA code during login
  - POST /api/auth/mfa/backup: Verify backup code
  - GET /api/users/me/mfa: Get current MFA configuration
  - PUT /api/users/me/mfa: Update MFA settings
- Design user interfaces:
  - MFA Setup Wizard: Guide users through MFA enrollment
  - MFA Challenge Screen: Prompt for verification code during login
  - MFA Settings Panel: Manage MFA methods and backup codes
- Establish error handling strategy:
  - Invalid Code: Clear feedback with remaining attempts
  - Rate Limiting: Exponential backoff for failed attempts
  - Account Recovery: Clear path for users locked out of accounts

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **Extend User Data Model**
   - **Description**: Add MFA-related fields to user schema
   - **Files to Create/Modify**:
     - `src/models/User.ts`: Add MFA configuration fields
     - `src/types/auth.ts`: Define MFA-related TypeScript interfaces
     - `src/migrations/add-mfa-fields.ts`: Create migration script
   - **Tests**: Unit tests for model validation and methods

2. **Implement MFA Service Core**
   - **Description**: Create core MFA service with provider interface
   - **Files to Create/Modify**:
     - `src/services/MFAService.ts`: Core MFA service implementation
     - `src/services/mfa/MFAProvider.ts`: Provider interface
     - `src/config/mfa.ts`: MFA configuration options
   - **Tests**: Unit tests for MFA service methods

### Phase 2: MFA Providers
1. **Implement TOTP Provider**
   - **Description**: Create TOTP-based verification provider
   - **Files to Create/Modify**:
     - `src/services/mfa/TOTPProvider.ts`: TOTP implementation
     - `src/utils/crypto.ts`: Add TOTP algorithm utilities
     - `src/services/mfa/QRCodeGenerator.ts`: Generate QR codes for TOTP setup
   - **Tests**: Unit tests for TOTP generation and validation

2. **Implement SMS Provider**
   - **Description**: Create SMS-based verification provider
   - **Files to Create/Modify**:
     - `src/services/mfa/SMSProvider.ts`: SMS implementation
     - `src/services/SMSService.ts`: Service for sending SMS messages
     - `src/config/sms.ts`: SMS provider configuration
   - **Tests**: Unit tests for SMS code generation and validation

3. **Implement Backup Codes**
   - **Description**: Create backup code generation and validation
   - **Files to Create/Modify**:
     - `src/services/mfa/BackupCodeManager.ts`: Backup code implementation
     - `src/utils/random.ts`: Secure random code generation
   - **Tests**: Unit tests for backup code generation and validation

### Phase 3: API Integration
1. **Extend Authentication Flow**
   - **Description**: Modify auth flow to include MFA verification
   - **Files to Create/Modify**:
     - `src/controllers/AuthController.ts`: Add MFA endpoints
     - `src/services/AuthService.ts`: Modify login flow
     - `src/middleware/auth.ts`: Add MFA verification middleware
   - **Tests**: Integration tests for authentication flow

2. **Implement User MFA Management**
   - **Description**: Add endpoints for managing MFA settings
   - **Files to Create/Modify**:
     - `src/controllers/UserController.ts`: Add MFA management endpoints
     - `src/services/UserService.ts`: Add MFA configuration methods
     - `src/routes/user.ts`: Add MFA routes
   - **Tests**: Integration tests for MFA management

### Phase 4: Frontend Implementation
1. **Implement MFA Setup UI**
   - **Description**: Create UI for MFA enrollment
   - **Files to Create/Modify**:
     - `src/frontend/components/MFASetup/`: Create MFA setup components
     - `src/frontend/pages/Settings/Security.tsx`: Add MFA setup to settings
     - `src/frontend/services/auth.ts`: Add MFA API client methods
   - **Tests**: Unit and component tests for MFA setup UI

2. **Implement MFA Verification UI**
   - **Description**: Create UI for MFA verification during login
   - **Files to Create/Modify**:
     - `src/frontend/components/MFAVerification/`: Create verification components
     - `src/frontend/pages/Login.tsx`: Modify to handle MFA challenge
     - `src/frontend/store/auth/`: Update auth state management
   - **Tests**: Unit and component tests for MFA verification UI

## TESTING STRATEGY
- **Unit Testing**:
  - Test each MFA provider in isolation
  - Mock external dependencies (SMS service, etc.)
  - Test edge cases like expired codes, rate limiting
  - Ensure cryptographic functions work as expected
- **Integration Testing**:
  - Test complete authentication flow with MFA
  - Test API endpoints with various scenarios
  - Verify database interactions and data integrity
- **End-to-End Testing**:
  - Test complete user journeys (registration with MFA, login with MFA)
  - Test account recovery with backup codes
  - Test MFA settings management
- **Security Testing**:
  - Verify rate limiting prevents brute force attacks
  - Ensure MFA secrets are properly encrypted
  - Test against OWASP authentication vulnerabilities

## DOCUMENTATION PLAN
- **Code Documentation**:
  - Add JSDoc comments to all new functions and classes
  - Document security considerations for MFA implementation
  - Create architecture diagram for MFA components
- **API Documentation**:
  - Update API documentation with new MFA endpoints
  - Include request/response examples
  - Document error codes and handling
- **User Documentation**:
  - Create user guide for enabling and using MFA
  - Add FAQ section for common MFA issues
  - Create account recovery instructions

## DEPLOYMENT STRATEGY
- **Feature Flags**:
  - Implement MFA behind feature flag
  - Enable for internal users first, then beta testers
  - Gradually roll out to all users
- **Database Migrations**:
  - Create migration for adding MFA fields to user schema
  - Ensure backward compatibility for users without MFA
  - Include rollback script for emergencies
- **Monitoring and Alerting**:
  - Track MFA success/failure rates
  - Monitor for unusual verification patterns
  - Alert on high failure rates (potential attack)
  - Track performance metrics for MFA verification

## RISK MANAGEMENT
- **Identified Risks**:
  - Users locked out of accounts: High impact, medium probability
  - Performance degradation: Medium impact, low probability
  - Security vulnerabilities: High impact, low probability
  - SMS delivery failures: Medium impact, medium probability
- **Mitigation Strategies**:
  - Comprehensive account recovery options
  - Performance testing before deployment
  - Security review and penetration testing
  - Fallback verification methods
- **Fallback Plans**:
  - Emergency disable option for MFA system-wide
  - Support-assisted account recovery process
  - Ability to temporarily bypass MFA for specific users

## DELIVERABLES
1. Complete implementation of Multi-Factor Authentication
2. Comprehensive test suite with 90% coverage
3. API and code documentation
4. Database migration scripts
5. Monitoring dashboards and alerts

## ACCEPTANCE CRITERIA
- Users can enable TOTP-based MFA using standard authenticator apps
- Users can enable SMS-based MFA as an alternative
- MFA verification works correctly during login
- Users can manage their MFA settings (enable/disable/change method)
- Backup codes work correctly for account recovery
- All security best practices are followed
- Performance impact is minimal (<100ms additional latency)

## ADDITIONAL CONSIDERATIONS
- Consider adding additional MFA methods in the future (email, push notifications)
- Plan for internationalization of all user-facing messages
- Consider accessibility requirements for MFA interfaces
- Evaluate compliance requirements (GDPR, CCPA) for storing phone numbers

