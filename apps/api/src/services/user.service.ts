import type { UserRepository } from '../core/ports/user.repository'
import type { UserEntity } from '../core/domain/user'

export class UserService {
  constructor(
    private userRepository: UserRepository
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id)
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email)
  }

  async create(_data: any): Promise<UserEntity> {
    // Implementation needed
    throw new Error('Not implemented')
  }

  async update(_id: string, _data: any): Promise<UserEntity> {
    // Implementation needed
    throw new Error('Not implemented')
  }
}