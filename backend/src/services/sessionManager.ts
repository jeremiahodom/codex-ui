import { Session, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  createSession(title?: string): Session {
    const session: Session = {
      id: uuidv4(),
      title: title || `Session ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  updateSession(id: string, updates: Partial<Session>): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates, updatedAt: Date.now() };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  addMessage(sessionId: string, message: ChatMessage): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.messages.push(message);
    session.updatedAt = Date.now();
    return session;
  }

  getMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }
}

export const sessionManager = new SessionManager();