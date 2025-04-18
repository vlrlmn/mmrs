import { IStorage } from '../../pkg/storage/storage'

export class Storage implements IStorage {
  async testRequestToDB(): Promise<string> {
    // Пример тестового обращения к базе данных SQLite
    return 'connected to database'
  }
}
