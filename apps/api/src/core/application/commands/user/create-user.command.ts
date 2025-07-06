import { BaseCommand } from '../../shared/command'

export class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly email: string,
    public readonly phone?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly password?: string
  ) {
    super('CreateUser')
  }
}