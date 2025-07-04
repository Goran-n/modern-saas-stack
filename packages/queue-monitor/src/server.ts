import express from 'express'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { ExpressAdapter } from '@bull-board/express'
import { queues, queueMetadata, closeQueues } from './config/queues.js'

const app = express()
const port = process.env.QUEUE_MONITOR_PORT || 3001

// Create bull-board server adapter
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/')

// Create bull-board with queue adapters
const { addQueue, removeQueue } = createBullBoard({
  queues: queues.map(queue => new BullMQAdapter(queue)) as any,
  serverAdapter,
})

// Set up middleware
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    queues: Object.keys(queueMetadata),
  })
})

// Mount bull-board UI
app.use('/', serverAdapter.getRouter())

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Graceful shutdown handling
const shutdown = async () => {
  console.log('Shutting down queue monitor...')
  try {
    await closeQueues()
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { app, port }