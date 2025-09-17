import { apiClient } from './apiClient';
import type { Conversation } from '@/types/chat';

export interface Session {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

class SessionService {
  async getAllSessions(): Promise<Session[]> {
    return apiClient.get('/sessions');
  }

  async getSession(id: string): Promise<Session> {
    return apiClient.get(`/sessions/${id}`);
  }

  async createSession(title?: string): Promise<Session> {
    return apiClient.post('/sessions', { title });
  }

  async updateSession(id: string, updates: { title?: string; isActive?: boolean }): Promise<Session> {
    return apiClient.put(`/sessions/${id}`, updates);
  }

  async deleteSession(id: string): Promise<void> {
    return apiClient.delete(`/sessions/${id}`);
  }

  async getSessionMessages(id: string): Promise<any[]> {
    return apiClient.get(`/sessions/${id}/messages`);
  }

  // Convert backend Session to frontend Conversation format
  sessionToConversation(session: Session): Conversation {
    return {
      id: session.id,
      title: session.title,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isLoading: false,
      projectPath: '', // Not used in new backend
      resumePath: null, // Not used in new backend
    };
  }

  // Convert frontend Conversation to backend Session format
  conversationToSession(conversation: Conversation): Session {
    return {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      createdAt: conversation.createdAt || Date.now(),
      updatedAt: conversation.updatedAt || Date.now(),
      isActive: true,
    };
  }
}

export const sessionService = new SessionService();