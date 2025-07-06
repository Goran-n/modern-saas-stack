import type { EntityId } from './shared/value-objects/entity-id'

export abstract class BaseEntity<T extends Record<string, any>> {
  protected constructor(protected readonly props: T) {}
  
  abstract get id(): EntityId
  
  protected touch(): void {
    if ('updatedAt' in this.props && typeof this.props.updatedAt !== 'undefined') {
      (this.props.updatedAt as any) = new Date()
    }
    if ('version' in this.props && typeof this.props.version === 'number') {
      (this.props.version as any) = this.props.version + 1
    }
  }

  equals(other: BaseEntity<T>): boolean {
    return this.id.equals(other.id)
  }
}