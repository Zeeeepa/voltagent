import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { setupRestRoutes } from './rest/routes';
import { setupWebhooks } from './webhooks/webhookManager';
import { setupAuthMiddleware } from './auth/authMiddleware';
import { setupRateLimiting } from './rate-limiting/rateLimiter';
import { logger } from './common/logger';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Apply middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('combined'));

// Setup authentication middleware
setupAuthMiddleware(app);

// Setup rate limiting
setupRateLimiting(app);

// Setup REST API routes
setupRestRoutes(app);

// Setup GraphQL server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Context for GraphQL resolvers
    return {
      user: req.user, // Assuming auth middleware adds user to request
    };
  },
});

// Start Apollo server and apply middleware
async function startApolloServer() {
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });
  
  // Setup webhook handlers
  setupWebhooks(app);
  
  // Start the server
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`REST API available at http://localhost:${PORT}/api`);
    logger.info(`GraphQL API available at http://localhost:${PORT}${apolloServer.graphqlPath}`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

startApolloServer().catch((error) => {
  logger.error('Failed to start server:', error);
});

// Export for testing purposes
export { app };

