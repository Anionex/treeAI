import Dexie, { Table } from 'dexie';
import { Session, Model, ChatNode } from '../types';

class TreeChatDatabase extends Dexie {
  sessions!: Table<Session, string>;
  models!: Table<Model, string>;

  constructor() {
    super('TreeChatDatabase');
    this.version(1).stores({
      sessions: 'id, title, createdAt, updatedAt',
      models: 'id, name'
    });
  }

  async getAllSessions(): Promise<Session[]> {
    return this.sessions.toArray();
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async saveSession(session: Session): Promise<void> {
    await this.sessions.put(session);
  }

  async deleteSession(id: string): Promise<void> {
    await this.sessions.delete(id);
  }

  async searchSessions(query: string): Promise<Session[]> {
    return this.sessions
      .filter(session => 
        session.title.toLowerCase().includes(query.toLowerCase())
      )
      .toArray();
  }

  async getAllModels(): Promise<Model[]> {
    return this.models.toArray();
  }

  async saveModel(model: Model): Promise<void> {
    await this.models.put(model);
  }

  async deleteModel(id: string): Promise<void> {
    await this.models.delete(id);
  }

  async getModel(id: string): Promise<Model | undefined> {
    return this.models.get(id);
  }
}

const db = new TreeChatDatabase();
export default db;