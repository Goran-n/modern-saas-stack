// Query Abstraction Layer - No ORM dependencies here

export interface Query {
  readonly type: string
}

export class FindByIdQuery implements Query {
  readonly type = 'findById'
  
  constructor(
    public readonly table: string,
    public readonly id: string
  ) {}
}

export class FindOneQuery implements Query {
  readonly type = 'findOne'
  
  constructor(
    public readonly table: string,
    public readonly conditions: Record<string, any>
  ) {}
}

export class FindManyQuery implements Query {
  readonly type = 'findMany'
  
  constructor(
    public readonly table: string,
    public readonly conditions?: Record<string, any>,
    public readonly options?: {
      limit?: number
      offset?: number
      orderBy?: { field: string; direction: 'asc' | 'desc' }
    }
  ) {}
}

export class ExistsQuery implements Query {
  readonly type = 'exists'
  
  constructor(
    public readonly table: string,
    public readonly conditions: Record<string, any>
  ) {}
}

export class CountQuery implements Query {
  readonly type = 'count'
  
  constructor(
    public readonly table: string,
    public readonly conditions?: Record<string, any>
  ) {}
}

export class InsertQuery implements Query {
  readonly type = 'insert'
  
  constructor(
    public readonly table: string,
    public readonly data: Record<string, any>
  ) {}
}

export class UpdateQuery implements Query {
  readonly type = 'update'
  
  constructor(
    public readonly table: string,
    public readonly conditions: Record<string, any>,
    public readonly data: Record<string, any>
  ) {}
}

export class DeleteQuery implements Query {
  readonly type = 'delete'
  
  constructor(
    public readonly table: string,
    public readonly conditions: Record<string, any>
  ) {}
}

// Query Executor Interface
export interface QueryExecutor {
  execute<T = any>(query: Query): Promise<T | null>
  executeMany<T = any>(query: Query): Promise<T[]>
  executeCount(query: CountQuery): Promise<number>
  executeExists(query: ExistsQuery): Promise<boolean>
  executeInsert<T = any>(query: InsertQuery): Promise<T>
  executeUpdate<T = any>(query: UpdateQuery): Promise<T | null>
  executeDelete(query: DeleteQuery): Promise<void>
}

// Transaction support
export interface TransactionExecutor extends QueryExecutor {
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}

// Unit of Work interface for managing transactions
export interface UnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  getExecutor(): TransactionExecutor
}