# Feature Implementation Excellence Framework v2.0 - Java/Spring Example

## ROLE
You are a senior software engineer with 10+ years of experience in Java and Spring Framework, specializing in feature design, implementation, and integration. You have deep expertise in software architecture, testing methodologies, and production-grade code quality.

## OBJECTIVE
Design and implement a comprehensive, production-ready "Real-time Notification System" feature that integrates seamlessly with the existing codebase while following best practices for architecture, testing, and documentation.

## CONTEXT
**Repository**: https://github.com/organization/enterprise-platform
**Branch/Commit**: main (commit: b8d7f3e)
**Feature Scope**: Implement a scalable, real-time notification system that supports multiple delivery channels (in-app, email, SMS, push), message templating, delivery tracking, and user preference management
**Technology Stack**: Java 17, Spring Boot 3.1, Spring WebFlux, PostgreSQL, Redis, Kafka, Docker, Kubernetes, React (frontend)

**Existing Architecture**:
```
The application follows a microservices architecture:

* API Gateway: Spring Cloud Gateway for routing and cross-cutting concerns
* Service Discovery: Eureka for service registration and discovery
* Authentication: OAuth2/OIDC with Keycloak
* Data Layer: PostgreSQL with Spring Data JPA
* Caching: Redis for distributed caching
* Messaging: Kafka for event-driven communication
* Frontend: React with TypeScript and Material-UI

The platform consists of the following main services:
1. User Service: Manages user accounts, profiles, and authentication
2. Content Service: Handles content creation, management, and delivery
3. Billing Service: Manages subscriptions, payments, and invoicing
4. Analytics Service: Tracks user behavior and business metrics
5. Search Service: Provides search functionality across the platform

Each service is independently deployable and scalable, with its own database.
```

**Requirements**:
- Implement a notification service that supports multiple delivery channels
- Create a template management system for notification content
- Implement delivery tracking and read receipts
- Support user preference management for notification types and channels
- Ensure real-time delivery for high-priority notifications
- Implement batching and rate limiting for non-critical notifications
- Support rich content in notifications (HTML, images, actions)
- Provide a dashboard for monitoring notification delivery and engagement

**Constraints**:
- Must handle high throughput (millions of notifications per day)
- Must ensure delivery reliability with retry mechanisms
- Must support horizontal scaling for handling peak loads
- Must comply with data privacy regulations (GDPR, CCPA)
- Must minimize infrastructure costs for large-scale deployments
- Must support internationalization and localization

## DESIGN METHODOLOGY

### 1. Architecture Design
- Define the architectural approach:
  - Implement event-driven architecture using Kafka
  - Use reactive programming model with Spring WebFlux
  - Implement CQRS pattern for notification management
- Identify integration points with existing systems:
  - User Service: Access user profiles and preferences
  - Content Service: Retrieve content for notification context
  - Analytics Service: Track notification engagement
  - Email/SMS Providers: External services for delivery
- Design component boundaries and responsibilities:
  - Notification Service: Core notification management and routing
  - Template Service: Manage and render notification templates
  - Delivery Service: Handle channel-specific delivery logic
  - Preference Service: Manage user notification preferences

### 2. Data Model Design
- Define data structures:
  - Notification: Core notification data with content and metadata
  - NotificationTemplate: Reusable templates with placeholders
  - DeliveryAttempt: Track delivery attempts and status
  - UserPreference: Store user channel and type preferences
  - NotificationChannel: Define delivery channel configurations
- Establish data flow:
  - Event Trigger → Template Rendering → Channel Selection → Delivery Attempt → Status Tracking
  - User Interaction → Engagement Tracking → Analytics
  - Preference Updates → Delivery Rules Update
- Define persistence strategy:
  - Store notification metadata in PostgreSQL
  - Use Redis for caching active notifications
  - Store delivery status in time-series optimized tables
  - Use Kafka for event sourcing of notification events

### 3. Interface Design
- Define API contracts:
  - POST /api/notifications: Create and send a notification
  - GET /api/notifications: Query notifications with filtering
  - GET /api/notifications/{id}: Get notification details
  - PUT /api/preferences: Update notification preferences
  - WebSocket /ws/notifications: Real-time notification delivery
- Design user interfaces:
  - Notification Center: Central UI for viewing all notifications
  - Preference Management: UI for managing notification settings
  - Toast Notifications: Non-intrusive UI for real-time alerts
  - Admin Dashboard: Monitoring and management interface
- Establish error handling strategy:
  - Implement circuit breaker for external delivery services
  - Define retry policies for failed deliveries
  - Implement dead letter queues for undeliverable notifications
  - Provide clear error messages and troubleshooting guides

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **Create Core Domain Models**
   - **Description**: Implement core notification domain models and repositories
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/domain/`: Create domain models
     - `src/main/java/com/organization/notification/repository/`: Create repositories
     - `src/main/resources/db/migration/`: Create database migration scripts
   - **Tests**: Unit tests for domain models and repositories

2. **Implement Event Processing Infrastructure**
   - **Description**: Set up Kafka integration and event processing
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/config/KafkaConfig.java`: Configure Kafka
     - `src/main/java/com/organization/notification/event/`: Create event models
     - `src/main/java/com/organization/notification/listener/`: Implement event listeners
   - **Tests**: Integration tests for event processing

### Phase 2: Core Implementation
1. **Implement Template Management**
   - **Description**: Create template management system
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/template/`: Implement template engine
     - `src/main/java/com/organization/notification/service/TemplateService.java`: Create service
     - `src/main/java/com/organization/notification/controller/TemplateController.java`: Create API
   - **Tests**: Unit tests for template rendering and management

2. **Implement Notification Service**
   - **Description**: Create core notification service
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/service/NotificationService.java`: Core service
     - `src/main/java/com/organization/notification/controller/NotificationController.java`: REST API
     - `src/main/java/com/organization/notification/dto/`: Create DTOs
   - **Tests**: Unit and integration tests for notification creation and querying

3. **Implement Delivery Services**
   - **Description**: Create channel-specific delivery services
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/delivery/`: Create delivery interfaces
     - `src/main/java/com/organization/notification/delivery/email/`: Email implementation
     - `src/main/java/com/organization/notification/delivery/push/`: Push notification implementation
     - `src/main/java/com/organization/notification/delivery/sms/`: SMS implementation
   - **Tests**: Unit tests for each delivery channel with mocked external services

### Phase 3: Integration
1. **Implement Preference Management**
   - **Description**: Create user preference management
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/preference/`: Create preference models
     - `src/main/java/com/organization/notification/service/PreferenceService.java`: Create service
     - `src/main/java/com/organization/notification/controller/PreferenceController.java`: Create API
   - **Tests**: Integration tests for preference management

2. **Implement WebSocket Notifications**
   - **Description**: Create real-time notification delivery
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/config/WebSocketConfig.java`: Configure WebSocket
     - `src/main/java/com/organization/notification/websocket/`: Create WebSocket handlers
     - `src/main/java/com/organization/notification/service/RealTimeNotificationService.java`: Create service
   - **Tests**: Integration tests for WebSocket functionality

3. **Implement Tracking and Analytics**
   - **Description**: Create notification tracking and analytics
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/tracking/`: Create tracking models
     - `src/main/java/com/organization/notification/service/TrackingService.java`: Create service
     - `src/main/java/com/organization/notification/controller/TrackingController.java`: Create API
   - **Tests**: Integration tests for tracking and analytics

### Phase 4: Frontend and Refinement
1. **Implement Admin Dashboard**
   - **Description**: Create admin dashboard for notification management
   - **Files to Create/Modify**:
     - `frontend/src/pages/admin/Notifications/`: Create dashboard components
     - `frontend/src/services/notificationAdmin.ts`: Create admin API client
     - `frontend/src/components/admin/NotificationMetrics/`: Create metrics components
   - **Tests**: Unit and component tests for admin UI

2. **Implement User Notification Center**
   - **Description**: Create user-facing notification center
   - **Files to Create/Modify**:
     - `frontend/src/components/NotificationCenter/`: Create notification center
     - `frontend/src/services/notifications.ts`: Create notification API client
     - `frontend/src/hooks/useNotifications.ts`: Create notification hooks
   - **Tests**: Unit and component tests for notification center

3. **Implement Performance Optimizations**
   - **Description**: Optimize for high throughput and scalability
   - **Files to Create/Modify**:
     - `src/main/java/com/organization/notification/config/CacheConfig.java`: Configure caching
     - `src/main/java/com/organization/notification/service/BatchingService.java`: Implement batching
     - `src/main/resources/application.yml`: Configure performance settings
   - **Tests**: Performance tests for high-load scenarios

## TESTING STRATEGY
- **Unit Testing**:
  - Test individual components in isolation
  - Use JUnit 5 and Mockito for mocking dependencies
  - Test template rendering with various inputs
  - Test delivery services with mocked external providers
- **Integration Testing**:
  - Test end-to-end notification flow
  - Use TestContainers for integration tests with Kafka and PostgreSQL
  - Test WebSocket connections and real-time delivery
  - Verify correct interaction between services
- **Performance Testing**:
  - Benchmark notification throughput
  - Test system under various load conditions
  - Verify scaling capabilities
  - Test with production-scale data volumes
- **Resilience Testing**:
  - Test retry mechanisms for failed deliveries
  - Test circuit breaker functionality
  - Simulate external service failures
  - Verify system recovery after failures

## DOCUMENTATION PLAN
- **Code Documentation**:
  - Add Javadoc to all public classes and methods
  - Document architecture decisions and patterns
  - Create sequence diagrams for key flows
  - Document configuration options and tuning parameters
- **API Documentation**:
  - Use SpringDoc OpenAPI for API documentation
  - Include request/response examples
  - Document error codes and handling
  - Create Postman collection for API testing
- **Operational Documentation**:
  - Create runbooks for common operational tasks
  - Document monitoring and alerting setup
  - Create troubleshooting guides
  - Document scaling considerations

## DEPLOYMENT STRATEGY
- **Feature Flags**:
  - Implement feature flags for gradual rollout
  - Use Spring Cloud Config for centralized configuration
  - Enable channel-specific features independently
- **Database Migrations**:
  - Use Flyway for database schema migrations
  - Implement zero-downtime migration strategy
  - Include rollback scripts for emergencies
- **Monitoring and Alerting**:
  - Implement Micrometer metrics for key performance indicators
  - Set up Prometheus and Grafana dashboards
  - Configure alerts for delivery failures and performance degradation
  - Track channel-specific delivery success rates

## RISK MANAGEMENT
- **Identified Risks**:
  - External service dependencies: High impact, medium probability
  - Performance under high load: High impact, medium probability
  - Data privacy compliance: High impact, low probability
  - Message delivery reliability: Medium impact, medium probability
- **Mitigation Strategies**:
  - Implement circuit breakers and fallbacks for external services
  - Design for horizontal scaling from the beginning
  - Implement comprehensive data protection measures
  - Use persistent queues and retry mechanisms for reliability
- **Fallback Plans**:
  - Ability to switch to alternative delivery providers
  - Degraded mode operation during peak loads
  - Manual notification processing as last resort

## DELIVERABLES
1. Complete implementation of Real-time Notification System
2. Comprehensive test suite with 85% code coverage
3. API and code documentation
4. Performance benchmarks and scaling guidelines
5. Monitoring dashboards and alerting configuration

## ACCEPTANCE CRITERIA
- System can deliver notifications through all specified channels
- Real-time notifications are delivered within 1 second
- System can handle peak loads of 1000 notifications per second
- Users can manage their notification preferences
- Administrators can monitor notification delivery and engagement
- All code passes code quality checks and security reviews
- System complies with data privacy regulations

## ADDITIONAL CONSIDERATIONS
- Consider implementing notification digests for reducing notification fatigue
- Plan for multi-tenancy support for enterprise customers
- Consider implementing notification categories for better organization
- Evaluate AI-powered notification timing for improved engagement

