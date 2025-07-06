export interface Command {
  readonly type: string
  readonly id: string
  readonly timestamp: Date
}

export abstract class BaseCommand implements Command {
  public readonly id: string
  public readonly timestamp: Date

  constructor(public readonly type: string) {
    this.id = crypto.randomUUID()
    this.timestamp = new Date()
  }
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>
}

export interface CommandBus {
  execute<TResult = void>(command: Command): Promise<TResult>
  register<TCommand extends Command, TResult = void>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void
}