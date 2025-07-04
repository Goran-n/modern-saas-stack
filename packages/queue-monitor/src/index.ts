import { app, port } from './server.js'

const server = app.listen(port, () => {
  console.log(`🚀 Queue Monitor running at http://localhost:${port}`)
  console.log(`📊 Bull Board UI available at http://localhost:${port}`)
})

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Failed to start queue monitor:', error)
  process.exit(1)
})

export default app