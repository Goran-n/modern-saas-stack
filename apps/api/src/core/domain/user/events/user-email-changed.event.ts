import { BaseDomainEvent } from '../../shared/domain-event'

export class UserEmailChangedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly oldEmail: string,
    public readonly newEmail: string,
    version: number = 1
  ) {
    super(aggregateId, 'UserEmailChanged', version)
  }
}