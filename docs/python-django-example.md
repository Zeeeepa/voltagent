# Feature Implementation Excellence Framework v2.0 - Python/Django Example

## ROLE
You are a senior software engineer with 10+ years of experience in Python and Django, specializing in feature design, implementation, and integration. You have deep expertise in software architecture, testing methodologies, and production-grade code quality.

## OBJECTIVE
Design and implement a comprehensive, production-ready "Content Recommendation Engine" feature that integrates seamlessly with the existing codebase while following best practices for architecture, testing, and documentation.

## CONTEXT
**Repository**: https://github.com/organization/content-platform
**Branch/Commit**: main (commit: e4f2c1d)
**Feature Scope**: Implement a personalized content recommendation system that suggests relevant articles, videos, and courses to users based on their browsing history, preferences, and behavior
**Technology Stack**: Python 3.10, Django 4.2, PostgreSQL, Celery, Redis, React (frontend), pytest

**Existing Architecture**:
```
The application follows a Django-based architecture:

* Backend: Django with Django REST Framework for API endpoints
* Database: PostgreSQL with Django ORM
* Caching: Redis for caching and session management
* Task Queue: Celery for background processing
* Search: Elasticsearch for content indexing and search
* Frontend: React with TypeScript, using Apollo Client for GraphQL

The platform currently has the following main components:
1. Content Management System (CMS) for creating and managing content
2. User authentication and profile management
3. Content browsing and search functionality
4. Analytics system tracking user behavior
5. Subscription and payment processing

Content is organized into categories, tags, and collections. Users can browse, search, bookmark, and consume content.
```

**Requirements**:
- Develop a recommendation algorithm that suggests relevant content to users
- Implement both collaborative filtering and content-based recommendation approaches
- Create a feedback mechanism to improve recommendations over time
- Ensure recommendations are generated in real-time for active users
- Pre-compute recommendations for inactive users via background jobs
- Expose recommendations via REST and GraphQL APIs
- Implement A/B testing framework to evaluate different recommendation strategies
- Ensure recommendations respect content access permissions

**Constraints**:
- Must handle large volumes of user interaction data (millions of events per day)
- Must generate recommendations in under 200ms for real-time requests
- Must not significantly increase database load during peak hours
- Must comply with data privacy regulations (GDPR, CCPA)
- Must be scalable to accommodate growing user base and content library

## DESIGN METHODOLOGY

### 1. Architecture Design
- Define the architectural approach:
  - Implement a hybrid recommendation system combining multiple algorithms
  - Use a microservice architecture for the recommendation engine
  - Implement event-driven processing for real-time updates
- Identify integration points with existing systems:
  - User Activity Tracking: Capture user interactions for recommendation inputs
  - Content Service: Access content metadata and relationships
  - User Profile Service: Access user preferences and demographics
  - API Gateway: Expose recommendation endpoints
- Design component boundaries and responsibilities:
  - Recommendation Service: Core recommendation generation logic
  - Feature Extraction: Process content and user data into feature vectors
  - Model Training: Periodically train and update recommendation models
  - Recommendation Delivery: Serve and cache recommendations

### 2. Data Model Design
- Define data structures:
  - UserInteraction: Store user-content interactions with timestamps and context
  - ContentFeatures: Store extracted features from content for similarity matching
  - UserProfile: Extended user profile with preference data
  - RecommendationResult: Store generated recommendations for caching
- Establish data flow:
  - User Activity → Feature Extraction → Model Input → Recommendation Generation → API Response
  - Periodic Model Training → Model Evaluation → Model Deployment
  - Feedback Collection → Model Refinement
- Define persistence strategy:
  - Store interaction data in time-series optimized tables
  - Use Redis for caching frequent recommendation requests
  - Store pre-computed recommendations in PostgreSQL
  - Use feature flags to control recommendation strategies

### 3. Interface Design
- Define API contracts:
  - GET /api/recommendations/: Get personalized recommendations
  - GET /api/recommendations/similar/{content_id}/: Get similar content
  - POST /api/recommendations/feedback/: Submit feedback on recommendations
  - GraphQL Query: recommendations(count: Int, contentType: String): [Content]
- Design user interfaces:
  - Recommendation Carousel: Display personalized recommendations on homepage
  - "You May Also Like" Section: Show related content on content detail pages
  - Recommendation Settings: Allow users to customize recommendation preferences
- Establish error handling strategy:
  - Fallback to popularity-based recommendations if personalized ones fail
  - Graceful degradation during high load periods
  - Clear error messages for debugging and monitoring

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **Set Up Data Collection**
   - **Description**: Implement comprehensive user activity tracking
   - **Files to Create/Modify**:
     - `apps/analytics/models.py`: Add UserInteraction model
     - `apps/analytics/services.py`: Create interaction tracking service
     - `apps/analytics/tasks.py`: Add background processing tasks
   - **Tests**: Unit tests for data collection and processing

2. **Create Recommendation Models**
   - **Description**: Implement data models for recommendation system
   - **Files to Create/Modify**:
     - `apps/recommendations/models.py`: Create recommendation models
     - `apps/recommendations/admin.py`: Set up admin interface
     - `apps/recommendations/migrations/`: Create database migrations
   - **Tests**: Unit tests for model validation and methods

### Phase 2: Core Implementation
1. **Implement Content-Based Filtering**
   - **Description**: Create content similarity algorithm
   - **Files to Create/Modify**:
     - `apps/recommendations/services/content_based.py`: Implement content-based filtering
     - `apps/recommendations/utils/feature_extraction.py`: Create feature extraction utilities
     - `apps/recommendations/tasks.py`: Add periodic feature extraction tasks
   - **Tests**: Unit tests for content similarity algorithms

2. **Implement Collaborative Filtering**
   - **Description**: Create user-based recommendation algorithm
   - **Files to Create/Modify**:
     - `apps/recommendations/services/collaborative.py`: Implement collaborative filtering
     - `apps/recommendations/utils/matrix_factorization.py`: Create matrix factorization utilities
     - `apps/recommendations/tasks.py`: Add model training tasks
   - **Tests**: Unit tests for collaborative filtering algorithms

3. **Implement Hybrid Recommendation Engine**
   - **Description**: Create service to combine multiple recommendation approaches
   - **Files to Create/Modify**:
     - `apps/recommendations/services/hybrid.py`: Implement hybrid recommendation logic
     - `apps/recommendations/services/ranking.py`: Create result ranking and filtering
     - `apps/recommendations/config.py`: Add configuration options
   - **Tests**: Unit tests for hybrid recommendation logic

### Phase 3: API Integration
1. **Create REST API Endpoints**
   - **Description**: Implement API endpoints for recommendations
   - **Files to Create/Modify**:
     - `apps/recommendations/views.py`: Create API views
     - `apps/recommendations/serializers.py`: Create serializers
     - `apps/recommendations/urls.py`: Define URL patterns
   - **Tests**: Integration tests for API endpoints

2. **Create GraphQL Integration**
   - **Description**: Add recommendation queries to GraphQL schema
   - **Files to Create/Modify**:
     - `apps/api/schema.py`: Add recommendation types and queries
     - `apps/recommendations/graphql/`: Create GraphQL resolvers
     - `apps/recommendations/graphql/types.py`: Define GraphQL types
   - **Tests**: Integration tests for GraphQL queries

3. **Implement Caching Layer**
   - **Description**: Add caching for recommendation results
   - **Files to Create/Modify**:
     - `apps/recommendations/cache.py`: Implement caching logic
     - `apps/recommendations/services/base.py`: Add cache integration
     - `settings/base.py`: Configure cache settings
   - **Tests**: Performance tests for cached vs. non-cached requests

### Phase 4: Frontend and Refinement
1. **Implement Frontend Components**
   - **Description**: Create UI components for displaying recommendations
   - **Files to Create/Modify**:
     - `frontend/src/components/Recommendations/`: Create recommendation components
     - `frontend/src/pages/Home.tsx`: Integrate recommendations on homepage
     - `frontend/src/pages/ContentDetail.tsx`: Add similar content section
   - **Tests**: Unit and component tests for UI elements

2. **Implement A/B Testing Framework**
   - **Description**: Create system for testing different recommendation strategies
   - **Files to Create/Modify**:
     - `apps/experiments/models.py`: Create experiment models
     - `apps/experiments/services.py`: Implement experiment assignment
     - `apps/recommendations/services/experiment.py`: Add experiment integration
   - **Tests**: Integration tests for A/B testing framework

3. **Implement Feedback Collection**
   - **Description**: Create system for collecting user feedback on recommendations
   - **Files to Create/Modify**:
     - `apps/recommendations/views.py`: Add feedback endpoints
     - `frontend/src/components/Recommendations/Feedback.tsx`: Create feedback UI
     - `apps/recommendations/tasks.py`: Add feedback processing tasks
   - **Tests**: Integration tests for feedback collection and processing

## TESTING STRATEGY
- **Unit Testing**:
  - Test individual recommendation algorithms
  - Test feature extraction and processing
  - Test caching and performance optimizations
  - Use pytest fixtures for consistent test data
- **Integration Testing**:
  - Test end-to-end recommendation flow
  - Test API endpoints with various parameters
  - Test database interactions and query performance
  - Verify correct integration with existing systems
- **Performance Testing**:
  - Benchmark recommendation generation time
  - Test system under various load conditions
  - Verify caching effectiveness
  - Test with production-scale datasets
- **A/B Testing**:
  - Compare different recommendation algorithms
  - Measure engagement metrics (CTR, time spent)
  - Analyze user satisfaction and feedback
  - Validate statistical significance of results

## DOCUMENTATION PLAN
- **Code Documentation**:
  - Add docstrings to all functions and classes
  - Document algorithm implementation details
  - Create architecture diagrams for the recommendation system
  - Document configuration options and tuning parameters
- **API Documentation**:
  - Create OpenAPI/Swagger documentation for REST endpoints
  - Document GraphQL schema and queries
  - Include request/response examples
  - Document error codes and handling
- **User Documentation**:
  - Create documentation for content creators on how recommendations work
  - Document recommendation settings for end users
  - Create internal documentation on monitoring and maintaining the system

## DEPLOYMENT STRATEGY
- **Feature Flags**:
  - Implement feature flags for each recommendation strategy
  - Enable gradual rollout to user segments
  - Allow quick disabling of problematic algorithms
- **Database Migrations**:
  - Create migrations for new models
  - Plan for data backfilling
  - Include rollback scripts for emergencies
- **Monitoring and Alerting**:
  - Track recommendation quality metrics
  - Monitor performance and response times
  - Alert on recommendation generation failures
  - Track user engagement with recommendations

## RISK MANAGEMENT
- **Identified Risks**:
  - Cold start problem for new users/content: High impact, high probability
  - Performance degradation with scale: High impact, medium probability
  - Recommendation quality issues: Medium impact, medium probability
  - Data privacy concerns: High impact, low probability
- **Mitigation Strategies**:
  - Implement fallback to popularity-based recommendations for cold start
  - Design for horizontal scaling and caching from the beginning
  - Implement comprehensive metrics and A/B testing
  - Ensure all personal data is anonymized and protected
- **Fallback Plans**:
  - Ability to quickly switch to simpler recommendation algorithms
  - Cached popular content recommendations as backup
  - Manual content curation as last resort

## DELIVERABLES
1. Complete implementation of Content Recommendation Engine
2. Comprehensive test suite with 85% coverage
3. API and code documentation
4. Performance benchmarks and optimization report
5. A/B testing framework and initial test results

## ACCEPTANCE CRITERIA
- Recommendations are personalized and relevant to user interests
- System generates recommendations in under 200ms for real-time requests
- A/B testing framework allows comparison of different strategies
- User engagement metrics show improvement over non-personalized content
- System scales to handle production load without performance degradation
- All code passes code quality checks and security reviews

## ADDITIONAL CONSIDERATIONS
- Consider implementing explainable recommendations ("Recommended because...")
- Plan for internationalization and localization of recommendations
- Consider ethical implications of recommendation algorithms
- Evaluate potential for machine learning model improvements over time

