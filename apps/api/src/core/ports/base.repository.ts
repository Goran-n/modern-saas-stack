export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<void>
  delete(id: string): Promise<void>
}