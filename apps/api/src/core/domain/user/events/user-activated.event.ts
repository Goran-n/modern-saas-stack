import { BaseDomainEvent } from '../../shared/domain-event'

export class UserActivatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    version: number = 1
  ) {
    super(aggregateId, 'UserActivated', version)
  }
}