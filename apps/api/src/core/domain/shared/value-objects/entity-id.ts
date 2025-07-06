export class EntityId {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEntityIdError(value)
    }
  }

  static from(value: string): EntityId {
    return new EntityId(value)
  }

  static generate(): EntityId {
    return new EntityId(crypto.randomUUID())
  }

  equals(other: EntityId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  private isValid(value: string): boolean {
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }
}

export class InvalidEntityIdError extends Error {
  constructor(value: string) {
    super(`Invalid entity ID: ${value}`)
    this.name = 'InvalidEntityIdError'
  }
}