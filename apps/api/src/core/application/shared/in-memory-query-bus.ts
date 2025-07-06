import type { Query, QueryHandler, QueryBus } from './query'

export class InMemoryQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>()

  register<TQuery extends Query<TResult>, TResult = any>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler for query type '${queryType}' is already registered`)
    }
    
    this.handlers.set(queryType, handler)
  }

  async execute<TResult = any>(query: Query<TResult>): Promise<TResult> {
    const handler = this.handlers.get(query.type)
    
    if (!handler) {
      throw new Error(`No handler registered for query type '${query.type}'`)
    }
    
    try {
      return await handler.handle(query)
    } catch (error) {
      // Log the error with query context
      console.error(`Query execution failed`, {
        queryType: query.type,
        queryId: query.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: query.timestamp
      })
      
      throw error
    }
  }

  getRegisteredQueryTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}