import type { CommandHandler } from '../../shared/command'
import type { UnitOfWork } from '../../shared/unit-of-work'
import { ChangeUserEmailCommand } from './change-user-email.command'
import { UserEntity } from '../../../domain/user'

export class ChangeUserEmailCommandHandler implements CommandHandler<ChangeUserEmailCommand, UserEntity> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async handle(command: ChangeUserEmailCommand): Promise<UserEntity> {
    // Find the user
    const user = await this.unitOfWork.users.findById(command.userId)
    if (!user) {
      throw new Error(`User with ID ${command.userId} not found`)
    }
    
    // Business rule: Users can only change their own email unless admin
    if (command.userId !== command.requestedBy) {
      // TODO: Check if requestedBy is admin - this would require tenant membership lookup
      throw new Error('Users can only change their own email address')
    }
    
    // Check if new email is already taken
    const existingUser = await this.unitOfWork.users.findByEmail(command.newEmail)
    if (existingUser && !existingUser.id.equals(user.id)) {
      throw new Error(`Email ${command.newEmail} is already in use`)
    }
    
    // Use domain method to change email (includes business rules and events)
    user.changeEmail(command.newEmail)
    
    // Save the updated user
    await this.unitOfWork.users.save(user)
    
    // Commit transaction and publish events
    await this.unitOfWork.commit()
    await this.unitOfWork.publishDomainEvents()
    
    return user
  }
}