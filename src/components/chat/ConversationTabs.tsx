// Simple ConversationTabs component for the new interface
import React from 'react';
import type { Conversation } from "@/types/chat";
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface ConversationTabsProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSetCategory: (conversationId: string, categoryId: string | null) => void;
  categories: { id: string; name: string }[];
}

export const ConversationTabs: React.FC<ConversationTabsProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
}) => {
  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1 p-2 overflow-x-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={onCreateConversation}
          className="flex-shrink-0"
        >
          <Plus size={16} />
        </Button>
        
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`flex items-center gap-1 px-3 py-1 rounded-md cursor-pointer flex-shrink-0 ${
              conversation.id === activeConversationId
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            <span className="text-sm truncate max-w-[150px]">
              {conversation.title}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conversation.id);
              }}
            >
              <X size={12} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};