import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

// Bus implementations
import { InMemoryCommandBus } from '../../core/application/shared/in-memory-command-bus'
import { InMemoryQueryBus } from '../../core/application/shared/in-memory-query-bus'

// Unit of Work
import { DrizzleUnitOfWork } from '../persistence/drizzle-unit-of-work'

// Command handlers
import { CreateUserCommandHandler } from '../../core/application/commands/user/create-user.handler'
import { ChangeUserEmailCommandHandler } from '../../core/application/commands/user/change-user-email.handler'

// Query handlers
import { GetUserQueryHandler } from '../../core/application/queries/user/get-user.handler'

export function setupCommandQueryBuses(db: PostgresJsDatabase<any>) {
  // Create buses
  const commandBus = new InMemoryCommandBus()
  const queryBus = new InMemoryQueryBus()
  
  // Create unit of work factory
  const createUnitOfWork = () => new DrizzleUnitOfWork(db)
  
  // Register command handlers
  commandBus.register('CreateUser', new CreateUserCommandHandler(createUnitOfWork()))
  commandBus.register('ChangeUserEmail', new ChangeUserEmailCommandHandler(createUnitOfWork()))
  
  // Register query handlers
  const getUserHandler = new GetUserQueryHandler(createUnitOfWork())
  queryBus.register('GetUser', getUserHandler)
  
  // Make buses globally available (for demo purposes)
  // In production, these would be injected via proper DI container
  ;(global as any).commandBus = commandBus
  ;(global as any).queryBus = queryBus
  
  console.log('Command/Query buses initialized with handlers:', {
    commands: commandBus.getRegisteredCommandTypes(),
    queries: queryBus.getRegisteredQueryTypes(),
  })
  
  return { commandBus, queryBus }
}