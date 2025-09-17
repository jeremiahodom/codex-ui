import { Request, Response } from 'express';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

class ChatService {
  // Simulate AI response generation
  async generateResponse(message: string, model?: string): Promise<string> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simple mock responses based on input
    const responses = [
      `I understand you're asking about: "${message}". Let me help you with that.`,
      `That's an interesting question about "${message}". Here's what I think...`,
      `Based on your message "${message}", I can provide some insights.`,
      `You mentioned "${message}". Let me elaborate on that topic.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Simulate streaming response
  async* generateStreamingResponse(message: string, model?: string): AsyncGenerator<string, void, unknown> {
    const fullResponse = await this.generateResponse(message, model);
    const words = fullResponse.split(' ');
    
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
  }

  createMessage(role: 'user' | 'assistant' | 'system', content: string, model?: string): ChatMessage {
    return {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      model,
      isStreaming: false
    };
  }
}

export const chatService = new ChatService();