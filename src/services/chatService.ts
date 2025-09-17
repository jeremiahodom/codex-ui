import { apiClient } from './apiClient';
import type { ChatMessage } from '@/types/chat';

export interface ChatResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  session: any;
}

export interface StreamEvent {
  type: 'user_message' | 'assistant_start' | 'assistant_chunk' | 'complete' | 'error';
  data: any;
}

class ChatService {
  async sendMessage(sessionId: string, message: string, model?: string): Promise<ChatResponse> {
    return apiClient.post('/chat/message', {
      sessionId,
      message,
      model
    });
  }

  // Create a streaming connection for chat
  createChatStream(sessionId: string, message: string, model?: string): EventSource {
    const params = new URLSearchParams({
      message,
      ...(model && { model })
    });
    
    return apiClient.createEventSource(`/chat/stream/${sessionId}?${params}`);
  }

  // Helper to handle streaming chat with callbacks
  streamChat(
    sessionId: string, 
    message: string, 
    model: string | undefined,
    callbacks: {
      onUserMessage?: (message: ChatMessage) => void;
      onAssistantStart?: (message: ChatMessage) => void;
      onAssistantChunk?: (data: { id: string; content: string }) => void;
      onComplete?: (data: { message: ChatMessage; session: any }) => void;
      onError?: (error: string) => void;
    }
  ): () => void {
    const eventSource = this.createChatStream(sessionId, message, model);

    eventSource.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);
        
        switch (streamEvent.type) {
          case 'user_message':
            callbacks.onUserMessage?.(streamEvent.data);
            break;
          case 'assistant_start':
            callbacks.onAssistantStart?.(streamEvent.data);
            break;
          case 'assistant_chunk':
            callbacks.onAssistantChunk?.(streamEvent.data);
            break;
          case 'complete':
            callbacks.onComplete?.(streamEvent.data);
            eventSource.close();
            break;
          case 'error':
            callbacks.onError?.(streamEvent.data);
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('Error parsing stream event:', error);
        callbacks.onError?.('Failed to parse server response');
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      callbacks.onError?.('Connection error');
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }
}

export const chatService = new ChatService();