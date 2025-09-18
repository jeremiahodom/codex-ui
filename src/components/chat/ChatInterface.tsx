import React, { useState, useEffect } from "react";
import type { Conversation, ChatMessage } from "@/types/chat";
import { useConversationStore } from "@/stores/ConversationStore";
import { useCodexStore } from "@/stores/CodexStore";
import { useModelStore } from "@/stores/ModelStore";
import { sessionManager } from "@/services/sessionManager";
import { sessionService } from "@/services/sessionService";
import { chatService } from "@/services/chatService";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { generateUniqueId } from "@/utils/genUniqueId";

interface ChatInterfaceProps {
  sessionId: string;
  selectedConversation?: Conversation | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  selectedConversation = null,
}) => {
  const { currentModel } = useModelStore();
  const [activeSessionId, setActiveSessionId] = useState<string>(sessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const { config } = useCodexStore();
  const {
    addMessage,
    createConversation,
    setCurrentConversation,
  } = useConversationStore();

  // Simplified: Use session_id to find conversation data
  const currentConversation = selectedConversation;

  // Convert conversation messages to chat messages format
  const sessionMessages = currentConversation
    ? currentConversation.messages.map((msg, index) => ({
        id: msg.id || `${currentConversation.id}-msg-${index}`,
        role: msg.role,
        content: msg.content,
        title: msg.title,
        timestamp: typeof msg.timestamp === "number" ? msg.timestamp : Date.now(),
        model: msg.role === "assistant" ? currentModel : undefined,
        isStreaming: msg.id === streamingMessageId,
      }))
    : messages;

  // Initialize session when component mounts
  useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId]);

  const handleSendMessage = async (messageContent: string) => {
    let currentSessionId = activeSessionId;
    
    if (!currentSessionId) {
      // Create a new conversation if none exists
      const newConversationId = createConversation();
      setCurrentConversation(newConversationId);
      currentSessionId = newConversationId;
      setActiveSessionId(newConversationId);
    }

    try {
      // Create or get session via API first
      let backendSessionId;
      try {
        const session = await sessionService.getSession(currentSessionId);
        backendSessionId = session.id;
      } catch (error) {
        // Session doesn't exist, create it
        const newSession = await sessionService.createSession(`Session ${new Date().toLocaleString()}`);
        backendSessionId = newSession.id;
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: generateUniqueId(),
        role: 'user',
        content: messageContent,
        timestamp: Date.now(),
        isStreaming: false,
      };

      // Add user message to local state
      setMessages(prev => [...prev, userMessage]);
      
      // Add to conversation store
      addMessage(currentSessionId, userMessage);

      // Start streaming chat using the backend session ID
      const cleanup = chatService.streamChat(
        backendSessionId,
        messageContent,
        currentModel,
        {
          onUserMessage: (message) => {
            console.log('User message confirmed:', message);
          },
          onAssistantStart: (message) => {
            setStreamingMessageId(message.id);
            setMessages(prev => [...prev, message]);
            addMessage(currentSessionId, message);
          },
          onAssistantChunk: (data) => {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === data.id 
                  ? { ...msg, content: data.content, isStreaming: true }
                  : msg
              )
            );
          },
          onComplete: (data) => {
            setStreamingMessageId(null);
            setMessages(prev => 
              prev.map(msg => 
                msg.id === data.message.id 
                  ? { ...data.message, isStreaming: false }
                  : msg
              )
            );
            // Update conversation store with final message
            addMessage(currentSessionId, data.message);
          },
          onError: (error) => {
            console.error('Chat error:', error);
            setStreamingMessageId(null);
            // Add error message
            const errorMessage: ChatMessage = {
              id: generateUniqueId(),
              role: 'assistant',
              content: `Error: ${error}`,
              timestamp: Date.now(),
              isStreaming: false,
            };
            setMessages(prev => [...prev, errorMessage]);
            addMessage(currentSessionId, errorMessage);
          }
        }
      );

      // Store cleanup function if needed
      return cleanup;

    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateUniqueId(),
        role: 'assistant',
        content: `Failed to send message: ${error}`,
        timestamp: Date.now(),
        isStreaming: false,
      };
      setMessages(prev => [...prev, errorMessage]);
      addMessage(currentSessionId, errorMessage);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={sessionMessages} 
          onApproval={() => {}}
        />
      </div>

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={!!streamingMessageId}
      />
    </div>
  );
};