export interface DomainEvent {
  readonly aggregateId: string
  readonly eventId: string
  readonly eventType: string
  readonly occurredOn: Date
  readonly version: number
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string
  public readonly occurredOn: Date
  public readonly version: number

  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string,
    version: number = 1
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredOn = new Date()
    this.version = version
  }
}