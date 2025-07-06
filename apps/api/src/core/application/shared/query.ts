export interface Query<_TResult = any> {
  readonly type: string
  readonly id: string
  readonly timestamp: Date
}

export abstract class BaseQuery<TResult = any> implements Query<TResult> {
  public readonly id: string
  public readonly timestamp: Date

  constructor(public readonly type: string) {
    this.id = crypto.randomUUID()
    this.timestamp = new Date()
  }
}

export interface QueryHandler<TQuery extends Query<TResult>, TResult = any> {
  handle(query: TQuery): Promise<TResult>
}

export interface QueryBus {
  execute<TResult = any>(query: Query<TResult>): Promise<TResult>
  register<TQuery extends Query<TResult>, TResult = any>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void
}