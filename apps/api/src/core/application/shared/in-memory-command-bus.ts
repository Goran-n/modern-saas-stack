import type { Command, CommandHandler, CommandBus } from './command'

export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>()

  register<TCommand extends Command, TResult = void>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler for command type '${commandType}' is already registered`)
    }
    
    this.handlers.set(commandType, handler)
  }

  async execute<TResult = void>(command: Command): Promise<TResult> {
    const handler = this.handlers.get(command.type)
    
    if (!handler) {
      throw new Error(`No handler registered for command type '${command.type}'`)
    }
    
    try {
      return await handler.handle(command)
    } catch (error) {
      // Log the error with command context
      console.error(`Command execution failed`, {
        commandType: command.type,
        commandId: command.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: command.timestamp
      })
      
      throw error
    }
  }

  getRegisteredCommandTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}