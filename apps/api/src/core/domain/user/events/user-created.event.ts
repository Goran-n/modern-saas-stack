import { BaseDomainEvent } from '../../shared/domain-event'

export class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly email: string,
    version: number = 1
  ) {
    super(aggregateId, 'UserCreated', version)
  }
}