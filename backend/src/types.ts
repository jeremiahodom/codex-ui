export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  title?: string;
  timestamp: number;
  model?: string;
  isStreaming?: boolean;
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  model?: string;
}

export interface SSEEvent {
  type: 'message' | 'error' | 'complete';
  data: any;
}