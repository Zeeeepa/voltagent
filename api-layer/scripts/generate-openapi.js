#!/usr/bin/env node

/**
 * Script to generate OpenAPI specification from code
 * using swagger-jsdoc.
 */

const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

// Define Swagger options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Workflow Orchestration API',
      version: '1.0.0',
      description: 'API for the Parallel Workflow Orchestration Framework',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Workflows',
        description: 'Workflow definition operations'
      },
      {
        name: 'Executions',
        description: 'Workflow execution operations'
      },
      {
        name: 'Tasks',
        description: 'Task execution operations'
      },
      {
        name: 'Progress',
        description: 'Progress tracking operations'
      },
      {
        name: 'Webhooks',
        description: 'Webhook operations'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../src/rest/routes.ts'),
    path.join(__dirname, '../src/rest/controllers/*.ts')
  ]
};

/**
 * Generate OpenAPI specification
 */
function generateOpenApiSpec() {
  console.log('Generating OpenAPI specification...');
  
  try {
    // Generate OpenAPI specification
    const swaggerSpec = swaggerJSDoc(swaggerOptions);
    
    // Write to file
    const outputPath = path.join(__dirname, '../openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
    
    console.log(`✅ OpenAPI specification generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error.message);
    process.exit(1);
  }
}

// Run the script
generateOpenApiSpec();

