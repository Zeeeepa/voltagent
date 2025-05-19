# CreatePR Example: Python and Django

This example demonstrates how to use the CreatePR template for a Python Django backend feature.

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in Python and Django, specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new API-based content recommendation system with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/content-platform
**Base Branch**: main
**Feature Branch**: feature/recommendation-api
**Related Issues**: CONTENT-456, CONTENT-457

**Existing Implementation**:
```python
# content/services/recommendation.py
class RecommendationService:
    # Current implementation only supports basic content listing
    def get_recommended_content(self, user_id):
        # Basic recommendation logic
        return Content.objects.filter(is_featured=True)
    
    # Need to add personalized recommendations, ML integration, and caching
```

**Requirements**:
* Implement personalized content recommendations based on user history
* Add integration with ML recommendation service
* Implement caching layer for improved performance
* Add comprehensive API endpoints with filtering and pagination
* Ensure proper rate limiting and authentication

## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * content/services/recommendation.py: Enhance recommendation logic
  * content/api/views.py: Add API endpoints
  * content/ml/client.py: Create ML service client
  * content/cache/recommendation_cache.py: Implement caching
* Ensure implementation follows these principles:
  * Django REST Framework best practices
  * Service layer pattern
  * Proper exception handling
* Handle edge cases:
  * New users with no history
  * ML service unavailability
  * Cache invalidation
  * Rate limiting for high-traffic scenarios

### 2. Test Coverage
* Implement unit tests for all services and views
* Create integration tests for API endpoints
* Implement performance tests for caching
* Ensure test coverage meets minimum threshold of 90%
* Include load testing for high-traffic scenarios

### 3. Documentation
* Update relevant documentation files:
  * docs/api/recommendation.md: Add API documentation
  * README.md: Update feature list
* Add inline code documentation following Google Python Style Guide
* Include API usage examples with curl and Python requests
* Add OpenAPI/Swagger documentation

### 4. Validation
* Verify all tests pass locally and in CI
* Ensure code meets Black and Flake8 standards
* Validate performance meets requirements
* Check for security vulnerabilities with Bandit
* Verify database query optimization with Django Debug Toolbar

### 5. PR Preparation
* Create a detailed PR description with:
  * Summary of changes
  * Implementation approach
  * Testing methodology
  * Performance benchmarks
* Add appropriate labels: feature, api, performance
* Request reviews from ML team and senior developers

## DELIVERABLES
1. Complete implementation of recommendation API
2. Comprehensive test suite with 90% coverage
3. Updated documentation with API reference
4. OpenAPI/Swagger specification
5. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's Python style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No security vulnerabilities detected
- [ ] Performance meets or exceeds requirements

## ADDITIONAL NOTES
* Consider future integration with A/B testing framework
* Performance monitoring setup recommended
* Known limitation: Initial ML model has limited content categories

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Recommendation Service: Implement core recommendation logic
  - API Endpoints: Implement REST API views and serializers
  - ML Integration: Implement ML service client
  - Caching Layer: Implement caching mechanisms
- Integration points between sub-tasks:
  - Service interfaces must be finalized before API implementation
  - ML client interface needed before recommendation service implementation
  - All components required for end-to-end testing
```

## Key Customizations for Python and Django

1. **Backend-Specific Considerations**
   * Emphasis on API design and documentation
   * Focus on performance and scalability
   * Inclusion of database optimization
   * Addition of security scanning

2. **Django-Specific Best Practices**
   * Django REST Framework patterns
   * Service layer architecture
   * ORM query optimization
   * Middleware for cross-cutting concerns

3. **Python Best Practices**
   * Type hints with mypy
   * Google Python Style Guide
   * Dependency management with requirements.txt or Poetry
   * Virtual environment setup

4. **Testing Approach**
   * Unit testing with pytest
   * Integration testing for API endpoints
   * Performance testing for caching
   * Security testing with Bandit

This example demonstrates how to adapt the CreatePR template for backend development with Python and Django, focusing on the specific requirements and best practices for this technology stack.

