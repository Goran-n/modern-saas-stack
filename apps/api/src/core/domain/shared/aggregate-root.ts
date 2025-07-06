import type { DomainEvent } from './domain-event'

export abstract class AggregateRoot<T extends Record<string, any>> {
  private uncommittedEvents: DomainEvent[] = []
  
  protected constructor(protected readonly props: T) {}

  protected addDomainEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event)
  }

  getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.uncommittedEvents]
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = []
  }

  protected touch(): void {
    if ('updatedAt' in this.props && typeof this.props.updatedAt !== 'undefined') {
      (this.props.updatedAt as any) = new Date()
    }
    if ('version' in this.props && typeof this.props.version === 'number') {
      (this.props.version as any) = this.props.version + 1
    }
  }
}