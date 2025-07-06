import { BaseQuery } from '../../shared/query'
import type { UserEntity } from '../../../domain/user'

export class GetUserQuery extends BaseQuery<UserEntity | null> {
  constructor(
    public readonly userId: string,
    public readonly requestedBy: string
  ) {
    super('GetUser')
  }
}