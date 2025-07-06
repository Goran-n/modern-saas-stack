import { router } from '../lib/trpc'
import { healthRouter } from './health'
import { tenantRouter } from './tenant'
import { enhancedUserRouter } from './enhanced-user.router'
import { integrationRouter } from './integration'
import { syncRouter } from './sync'
import { accountRouter } from './account'
import { bankFeedRouter } from './bank-feed'
import { transactionRouter } from './transaction'
import { supplierRouter } from './supplier'
import { userChannelRouter } from './user-channel'
import { conversationRouter } from './conversation'
import { orchestrationRouter } from './orchestration'

export const appRouter = router({
  health: healthRouter,
  tenant: tenantRouter,
  user: enhancedUserRouter,
  integration: integrationRouter,
  sync: syncRouter,
  account: accountRouter,
  bankFeed: bankFeedRouter,
  transaction: transactionRouter,
  supplier: supplierRouter,
  userChannel: userChannelRouter,
  conversation: conversationRouter,
  orchestration: orchestrationRouter,
})

export type AppRouter = typeof appRouter