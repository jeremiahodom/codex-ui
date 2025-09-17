import React, { useState, useMemo } from "react";
import { ChatInterface } from "./chat/ChatInterface";
import { ConversationTabs } from "@/components/chat/ConversationTabs";
import { useConversationStore } from "@/stores/ConversationStore";
import type { Conversation } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ChatViewProps {
  selectedConversation?: Conversation | null;
  showChatTabs?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ selectedConversation, showChatTabs = false }) => {
  const {
    currentConversationId,
    getCurrentProjectConversations,
    createConversation,
    setCurrentConversation,
    categories,
    selectedCategoryId,
    setSelectedCategory,
    deleteConversation,
    addCategory,
    setConversationCategory,
  } = useConversationStore();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Get conversations filtered by current project and category
  const conversations = useMemo(() => {
    let list = getCurrentProjectConversations();
    
    if (selectedCategoryId) {
      list = list.filter((c) => {
        const category = (c as any).categoryId;
        return category === selectedCategoryId;
      });
    }

    return list;
  }, [getCurrentProjectConversations, selectedCategoryId]);

  const createNewConversation = () => {
    const conversationId = createConversation();
    setCurrentConversation(conversationId);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName("");
      setShowCategoryForm(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation.id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category Filter */}
      <div className="flex items-center justify-between px-2 py-1 border-b bg-background/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Category: {selectedCategoryId ? (categories.find(c => c.id === selectedCategoryId)?.name || "Unknown") : "All"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryId || ""}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="text-xs border rounded px-1 py-0.5"
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCategoryForm(true)}
            className="text-xs h-6"
          >
            + Category
          </Button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        {showChatTabs ? (
          <div className="h-full flex flex-col">
            <ConversationTabs
              conversations={conversations}
              activeConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onCreateConversation={createNewConversation}
              onDeleteConversation={deleteConversation}
              onSetCategory={setConversationCategory}
              categories={categories}
            />
            {currentConversationId && (
              <div className="flex-1 min-h-0">
                <ChatInterface
                  sessionId={currentConversationId}
                  selectedConversation={selectedConversation}
                />
              </div>
            )}
          </div>
        ) : (
          <ChatInterface
            sessionId={currentConversationId || ''}
            selectedConversation={selectedConversation}
          />
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCategory();
                }
              }}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Add
              </Button>
              <Button variant="outline" onClick={() => setShowCategoryForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};