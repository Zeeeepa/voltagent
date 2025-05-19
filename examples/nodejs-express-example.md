# CreatePR Example: Node.js and Express

This example demonstrates how to use the CreatePR template for a Node.js and Express backend feature.

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in Node.js and Express, specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new payment processing system with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/payment-service
**Base Branch**: main
**Feature Branch**: feature/payment-processing
**Related Issues**: PAY-789, PAY-790

**Existing Implementation**:
```javascript
// src/services/paymentService.js
class PaymentService {
  // Current implementation only supports basic payment creation
  async createPayment(paymentData) {
    // Basic payment creation logic
    return await PaymentModel.create(paymentData);
  }
  
  // Need to add payment processing, webhooks, and refund capabilities
}

module.exports = new PaymentService();
```

**Requirements**:
* Implement payment processing with multiple providers (Stripe, PayPal)
* Add webhook handling for payment status updates
* Implement refund and partial refund capabilities
* Add comprehensive logging and error tracking
* Ensure PCI compliance and security best practices

## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * src/services/paymentService.js: Enhance payment processing
  * src/controllers/webhookController.js: Add webhook handlers
  * src/providers/: Add payment provider integrations
  * src/middleware/security.js: Implement security measures
* Ensure implementation follows these principles:
  * Dependency injection
  * Strategy pattern for providers
  * Proper error handling and logging
* Handle edge cases:
  * Payment provider outages
  * Duplicate webhook events
  * Partial refund calculations
  * Transaction reconciliation

### 2. Test Coverage
* Implement unit tests for all services and controllers
* Create integration tests for payment flows
* Implement mock providers for testing
* Ensure test coverage meets minimum threshold of 85%
* Include security testing for PCI compliance

### 3. Documentation
* Update relevant documentation files:
  * docs/payments.md: Add payment flow documentation
  * README.md: Update API documentation
* Add inline code documentation following JSDoc standards
* Include API usage examples with curl and Postman collection
* Add sequence diagrams for payment flows

### 4. Validation
* Verify all tests pass locally and in CI
* Ensure code meets ESLint standards
* Validate performance meets requirements
* Check for security vulnerabilities with npm audit
* Verify error handling with chaos testing

### 5. PR Preparation
* Create a detailed PR description with:
  * Summary of changes
  * Implementation approach
  * Testing methodology
  * Security considerations
* Add appropriate labels: feature, payments, security
* Request reviews from security team and senior developers

## DELIVERABLES
1. Complete implementation of payment processing system
2. Comprehensive test suite with 85% coverage
3. Updated documentation with API reference
4. Postman collection for API testing
5. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's JavaScript style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No security vulnerabilities detected
- [ ] PCI compliance requirements met

## ADDITIONAL NOTES
* Consider future integration with additional payment providers
* Monitoring setup for payment failures recommended
* Known limitation: Initial implementation has limited subscription capabilities

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Payment Service Core: Implement base payment processing
  - Provider Integrations: Implement Stripe and PayPal providers
  - Webhook Handling: Implement webhook controllers and processors
  - Security Layer: Implement PCI compliance measures
- Integration points between sub-tasks:
  - Provider interfaces must be finalized before service implementation
  - Webhook event schema needed before handler implementation
  - All components required for end-to-end testing
```

## Key Customizations for Node.js and Express

1. **Backend-Specific Considerations**
   * Emphasis on API design and documentation
   * Focus on asynchronous processing
   * Inclusion of security and compliance
   * Addition of error handling strategies

2. **Node.js-Specific Best Practices**
   * Asynchronous patterns with Promises/async-await
   * Error handling with middleware
   * Modular architecture
   * Environment configuration management

3. **Express Best Practices**
   * Middleware composition
   * Route organization
   * Request validation
   * Response formatting

4. **Testing Approach**
   * Unit testing with Jest or Mocha
   * Integration testing for API endpoints
   * Mock services for external dependencies
   * Security testing with npm audit

This example demonstrates how to adapt the CreatePR template for backend development with Node.js and Express, focusing on the specific requirements and best practices for this technology stack.

