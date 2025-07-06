import { BaseCommand } from '../../shared/command'

export class ChangeUserEmailCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
    public readonly requestedBy: string
  ) {
    super('ChangeUserEmail')
  }
}