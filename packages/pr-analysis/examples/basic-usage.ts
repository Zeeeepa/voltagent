/**
 * Basic usage example for @voltagent/pr-analysis
 */

import { PRAnalysisServer, createDefaultConfig, validateConfig } from '@voltagent/pr-analysis'

async function main() {
  // Create and validate configuration
  const config = createDefaultConfig()
  const errors = validateConfig(config)
  
  if (errors.length > 0) {
    console.error('Configuration errors:')
    errors.forEach(error => console.error(`- ${error}`))
    process.exit(1)
  }

  // Create and start the server
  const server = new PRAnalysisServer(config)
  
  try {
    await server.start()
    console.log('PR Analysis Server started successfully!')
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...')
      await server.stop()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

