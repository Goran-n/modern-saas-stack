import type { CommandHandler } from '../../shared/command'
import type { UnitOfWork } from '../../shared/unit-of-work'
import { CreateUserCommand } from './create-user.command'
import { UserEntity } from '../../../domain/user'

export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand, UserEntity> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async handle(command: CreateUserCommand): Promise<UserEntity> {
    // Generate unique ID for the user
    const userId = crypto.randomUUID()
    
    // Check if user already exists
    const existingUser = await this.unitOfWork.users.findByEmail(command.email)
    if (existingUser) {
      throw new Error(`User with email ${command.email} already exists`)
    }
    
    // Create domain entity with business logic
    const user = UserEntity.create(userId, command.email, {
      ...(command.phone && { phone: command.phone }),
      profile: {
        ...(command.firstName && { firstName: command.firstName }),
        ...(command.lastName && { lastName: command.lastName }),
      }
    })
    
    // Save to repository
    await this.unitOfWork.users.save(user)
    
    // Commit transaction and publish events
    await this.unitOfWork.commit()
    await this.unitOfWork.publishDomainEvents()
    
    return user
  }
}