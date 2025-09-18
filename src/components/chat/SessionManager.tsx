import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MessageSquare, X, SquarePen } from 'lucide-react';
import type { Conversation } from '@/types/chat';
import { sessionManager } from '@/services/sessionManager';

interface SessionManagerProps {
  conversations: Conversation[];
  activeSessionId: string | null;
  onCreateSession: () => void;
  onSelectSession: (conversationId: string) => void;
  onCloseSession: (conversationId: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  conversations,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onCloseSession,
}) => {
  
  const handleCloseSession = async (sessionId: string) => {
    try {
      // Use the new close_session method which properly shuts down the protocol connection
      await sessionManager.stopSession(sessionId);
      onCloseSession(sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
      // Still close it in the UI even if backend cleanup fails
      onCloseSession(sessionId);
    }
  };
  return (
    <div className="w-64 border-r bg-gray-50 h-full flex flex-col">
      {/* Header */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Chat Sessions</h2>
          <button
            onClick={onCreateSession}
            className="h-6 w-6"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chat conversations</p>
            <p className="text-xs">Click + to create one</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === conversation.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onSelectSession(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {conversation.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {conversation.messages.length} messages
                    </p>
                    {conversation.messages.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {conversation.messages[conversation.messages.length - 1].content.slice(0, 50)}
                        {conversation.messages[conversation.messages.length - 1].content.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {sessionManager.isSessionRunning(conversation.id) ? (
                      <Badge variant="secondary" className="text-xs py-0">
                        Running
                      </Badge>
                    ) : (
                      conversation.messages.length > 0 && (
                        <Badge variant="outline" className="text-xs py-0 text-gray-500">
                          View Only
                        </Badge>
                      )
                    )}
                    {conversation.isLoading && (
                      <Badge variant="outline" className="text-xs py-0">
                        Thinking
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseSession(conversation.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};