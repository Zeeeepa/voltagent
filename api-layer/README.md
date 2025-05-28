# Workflow Orchestration API Layer

This is the Integration & API Layer for the Parallel Workflow Orchestration Framework. It provides RESTful and GraphQL APIs, event-based integration mechanisms, SDK libraries, and webhook support for interacting with the workflow orchestration framework.

## Features

- **RESTful API**: Comprehensive REST API for all workflow orchestration operations
- **GraphQL API**: Flexible GraphQL API for querying and mutating workflow data
- **Event-based Integration**: Publish-subscribe pattern for real-time event notifications
- **SDK Libraries**: Generated client libraries for multiple programming languages
- **Webhook Support**: Register webhooks to receive event notifications
- **Authentication & Authorization**: Secure API access with JWT-based authentication
- **API Versioning**: Support for backward compatibility
- **Rate Limiting**: Prevent API abuse with configurable rate limits
- **Comprehensive Documentation**: Auto-generated API documentation

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd api-layer
npm install
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
JWT_SECRET=your-secret-key
LOG_LEVEL=info
```

### Running the API

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## API Documentation

Once the server is running, you can access the API documentation at:

- Swagger UI: http://localhost:3000/api-docs
- GraphQL Playground: http://localhost:3000/graphql

## SDK Libraries

The API layer provides SDK libraries for multiple programming languages:

- TypeScript/JavaScript
- Python
- Java
- Go
- C#

To generate the SDK libraries:

```bash
npm run generate:sdks
```

The generated SDKs will be available in the `sdks` directory.

## Architecture

The API layer is designed with a modular architecture:

- **REST API**: Express.js-based RESTful API
- **GraphQL API**: Apollo Server for GraphQL support
- **Adapters**: Integration with other components of the framework
- **Events**: Event emitter for real-time notifications
- **Webhooks**: Webhook registration and delivery system
- **Authentication**: JWT-based authentication and authorization
- **Rate Limiting**: Configurable rate limiting for API endpoints

## Component Integration

The API layer integrates with the following components of the workflow orchestration framework:

- **Workflow Definition & Modeling System**: For defining and managing workflow definitions
- **Parallel Execution Engine**: For executing workflows and tasks
- **Synchronization Management System**: For managing synchronization points
- **Resource Management System**: For allocating and managing resources
- **Progress Tracking & Reporting System**: For tracking workflow progress
- **Workflow Context Management**: For managing workflow context
- **Dependency Management System**: For managing dependencies between tasks

## API Versioning

The API supports versioning to ensure backward compatibility:

- **URL-based Versioning**: `/api/v1/...`, `/api/v2/...`
- **Header-based Versioning**: `Accept: application/vnd.workflow-orchestration.v1+json`

## Security

The API layer implements several security measures:

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Rate Limiting**: Prevent API abuse
- **CORS**: Configurable CORS settings
- **Helmet**: HTTP security headers

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

