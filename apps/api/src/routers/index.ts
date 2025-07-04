import { router } from '../lib/trpc'
import { healthRouter } from './health'
import { tenantRouter } from './tenant'
import { userRouter } from './user'
import { integrationRouter } from './integration'
import { syncRouter } from './sync'
import { accountRouter } from './account'
import { bankFeedRouter } from './bank-feed'
import { transactionRouter } from './transaction'
import { supplierRouter } from './supplier'

export const appRouter = router({
  health: healthRouter,
  tenant: tenantRouter,
  user: userRouter,
  integration: integrationRouter,
  sync: syncRouter,
  account: accountRouter,
  bankFeed: bankFeedRouter,
  transaction: transactionRouter,
  supplier: supplierRouter,
})

export type AppRouter = typeof appRouter