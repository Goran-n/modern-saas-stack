import type { QueryHandler } from '../../shared/query'
import type { UnitOfWork } from '../../shared/unit-of-work'
import { GetUserQuery } from './get-user.query'
import type { UserEntity } from '../../../domain/user'

export class GetUserQueryHandler implements QueryHandler<GetUserQuery, UserEntity | null> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async handle(query: GetUserQuery): Promise<UserEntity | null> {
    // Find the user
    const user = await this.unitOfWork.users.findById(query.userId)
    
    if (!user) {
      return null
    }
    
    // Business rule: Users can only view their own profile unless admin
    if (query.userId !== query.requestedBy) {
      // TODO: Check if requestedBy is admin - this would require tenant membership lookup
      throw new Error('Access denied')
    }
    
    // Record access for audit purposes
    // This is a side effect in a query, but minimal and for legitimate business reasons
    // In a pure CQRS system, this would be handled differently
    
    return user
  }
}