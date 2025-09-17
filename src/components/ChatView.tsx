import React, { useState, useEffect, useMemo } from "react";
import { ChatInterface } from "./chat/ChatInterface";
import { ConversationTabs } from "@/components/chat/ConversationTabs";
import { useConversationStore } from "@/stores/ConversationStore";
import type { Conversation } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { invoke } from "@/services/apiClient";
import { useFolderStore } from "@/stores/FolderStore";

interface ChatViewProps {
  selectedConversation?: Conversation | null;
  showChatTabs?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ selectedConversation, showChatTabs = false }) => {
  const {
    currentConversationId,
    getCurrentProjectConversations,
    deleteConversation,
    setCurrentConversation,
    selectHistoryConversation,
    pendingNewConversation,
    toggleFavorite,
    categories,
    selectedCategoryId,
    addCategory,
    deleteCategory,
    setSelectedCategory,
  } = useConversationStore();
  
  // Get conversations filtered by current project
  const activeConversations = getCurrentProjectConversations();

  const [searchQuery, setSearchQuery] = useState("");
  const [internalSelectedConversation, setInternalSelectedConversation] = useState<Conversation | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeCandidates, setResumeCandidates] = useState<Conversation[]>([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeOnlyProject, setResumeOnlyProject] = useState(true);
  const [resumeSelectMode, setResumeSelectMode] = useState(false);
  const [resumeSelected, setResumeSelected] = useState<Record<string, boolean>>({});
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Generate favorite statuses from the persisted store data
  const favoriteStatuses = useMemo(() => {
    const statuses: Record<string, boolean> = {};
    activeConversations.forEach(conv => {
      statuses[conv.id] = conv.isFavorite || false;
    });
    return statuses;
  }, [activeConversations]);

  const handleConversationSelect = (conversation: Conversation) => {
    const conversationCopy = { ...conversation };
    setInternalSelectedConversation(conversationCopy);
    console.log("🔄 ChatView: Calling selectHistoryConversation", conversation.id);
    selectHistoryConversation(conversationCopy);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentConversation(sessionId);
  };

  const handleDeleteConversation = async (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      deleteConversation(conversationId);
    } catch (error) {
      console.error("Failed to delete conversation and session file:", error);
    }
  };

  const handleToggleFavorite = async (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      // Use the store's toggleFavorite method directly for persistence
      toggleFavorite(conversationId);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  // Clear selected conversation when starting a new conversation
  useEffect(() => {
    if (pendingNewConversation) {
      setInternalSelectedConversation(null);
    }
  }, [pendingNewConversation]);

  // Also clear when currentConversationId changes to a new codex-event format (from toolbar button)
  useEffect(() => {
    if (currentConversationId && currentConversationId.startsWith('codex-event-')) {
      // Check if this is a new conversation (no messages)
      const currentConv = activeConversations.find(conv => conv.id === currentConversationId);
      if (currentConv && currentConv.messages.length === 0) {
        setInternalSelectedConversation(null);
      }
    }
  }, [currentConversationId, activeConversations]);

  // Use either the passed selectedConversation or internal one
  const displayedConversation = selectedConversation || internalSelectedConversation;

  if (showChatTabs) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCategoryOpen(true)}>
              Category: {selectedCategoryId ? (categories.find(c => c.id === selectedCategoryId)?.name || "Unknown") : "All"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  setResumeLoading(true);
                  const list = (await invoke<Conversation[]>("load_sessions_from_disk")) || [];
                  console.log("[Resume] loaded sessions from disk:", list.length, list);
                  const normalize = (p?: string | null) => {
                    if (!p) return p || '';
                    return p.endsWith('/') ? p.slice(0, -1) : p;
                  };
                  const project = normalize(useFolderStore.getState().currentFolder || '');
                  console.log("[Resume] current project:", project);
                  const annotated = list.map((c) => ({
                    id: c.id,
                    title: c.title,
                    filePath: (c as any).filePath,
                    projectRealpath: (c as any).projectRealpath,
                  }));
                  console.log("[Resume] candidates (id,title,file,project):", annotated);
                  const filtered = resumeOnlyProject && project
                    ? list.filter((c) => {
                        const pr = normalize((c as any).projectRealpath || '');
                        const match = pr === project;
                        if (!match) {
                          console.log("[Resume] filtered out (project mismatch)", { id: c.id, pr, project });
                        }
                        return match;
                      })
                    : list;
                  console.log("[Resume] filtered count:", filtered.length);
                  setResumeCandidates(filtered);
                  setResumeOpen(true);
                } catch (e) {
                  console.error("Failed to load sessions:", e);
                } finally {
                  setResumeLoading(false);
                }
              }}
            >
              {resumeLoading ? "Loading…" : "Resume…"}
            </Button>
          </div>
        </div>
        <ConversationTabs
          favoriteStatuses={favoriteStatuses}
          activeConversations={activeConversations}
          currentConversationId={currentConversationId}
          activeSessionId={currentConversationId || ''}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectConversation={handleConversationSelect}
          onToggleFavorite={handleToggleFavorite}
          onDeleteConversation={handleDeleteConversation}
          onSelectSession={handleSelectSession}
        />

        {/* Category selection & management */}
        <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      addCategory(newCategoryName.trim());
                      setNewCategoryName("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    addCategory(name);
                    setNewCategoryName("");
                  }}
                >Add</Button>
              </div>
              <div className="border rounded divide-y">
                <button
                  className={`w-full text-left p-3 hover:bg-accent ${!selectedCategoryId ? 'bg-accent/50' : ''}`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setCategoryOpen(false);
                  }}
                >
                  All
                </button>
                {categories.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No categories yet.</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center">
                      <button
                        className={`flex-1 text-left p-3 hover:bg-accent ${selectedCategoryId === cat.id ? 'bg-accent/50' : ''}`}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setCategoryOpen(false);
                        }}
                      >
                        {cat.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-muted-foreground"
                        onClick={() => deleteCategory(cat.id)}
                        title="Delete category"
                      >
                        ×
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle>Resume a previous session</DialogTitle>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={resumeSelectMode}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setResumeSelectMode(enabled);
                        if (!enabled) setResumeSelected({});
                      }}
                    />
                    Select mode
                  </label>
                  {resumeSelectMode && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (resumeCandidates.length === 0) return;
                          const allSelected: Record<string, boolean> = {};
                          for (const c of resumeCandidates) {
                            const fp = (c as any).filePath as string | undefined;
                            if (fp) allSelected[fp] = true;
                          }
                          setResumeSelected(allSelected);
                        }}
                      >
                        Select all
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={Object.values(resumeSelected).filter(Boolean).length === 0}
                        onClick={async () => {
                          const selectedPaths = resumeCandidates
                            .map((c) => (c as any).filePath as string | undefined)
                            .filter((fp): fp is string => !!fp && resumeSelected[fp]);
                          if (selectedPaths.length === 0) return;
                          try {
                            // Delete files in parallel
                            await Promise.all(
                              selectedPaths.map((filePath) =>
                                invoke("delete_session_file", { filePath })
                                  .catch((err) => {
                                    console.error("Failed to delete session file:", filePath, err);
                                  })
                              )
                            );
                            const selectedSet = new Set(selectedPaths);
                            setResumeCandidates((prev) => prev.filter((c) => !selectedSet.has((c as any).filePath)));
                            setResumeSelected({});
                            setResumeSelectMode(false);
                          } catch (err) {
                            console.error("Bulk delete failed:", err);
                          }
                        }}
                      >
                        Delete ({Object.values(resumeSelected).filter(Boolean).length})
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Current project: {useFolderStore.getState().currentFolder || '(none)'}
              </div>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto divide-y rounded border">
              {resumeCandidates.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No recorded sessions {resumeOnlyProject ? 'for this project' : ''}.
                  {resumeOnlyProject && (
                    <button
                      className="ml-2 underline hover:no-underline"
                      onClick={() => setResumeOnlyProject(false)}
                    >
                      Show all
                    </button>
                  )}
                </div>
              ) : (
                resumeCandidates.map((c) => {
                  const fp = (c as any).filePath as string | undefined;
                  const selected = fp ? !!resumeSelected[fp] : false;
                  return (
                    <div
                      key={c.id + (fp || "")}
                      className={`w-full text-left p-3 hover:bg-accent flex items-center gap-3 ${selected ? 'bg-accent/50' : ''}`}
                      onClick={() => {
                        if (resumeSelectMode) {
                          if (!fp) return;
                          setResumeSelected((prev) => ({ ...prev, [fp]: !prev[fp] }));
                          return;
                        }
                        // Route through existing handler which also sets resumePath via store
                        handleConversationSelect(c);
                        setResumeOpen(false);
                      }}
                    >
                      {resumeSelectMode && (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (!fp) return;
                            const checked = e.target.checked;
                            setResumeSelected((prev) => ({ ...prev, [fp]: checked }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.projectRealpath || "(unknown project)"}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full min-w-0">
      <ChatInterface
        sessionId={currentConversationId || ''}
        selectedConversation={displayedConversation}
      />
    </div>
  );
};
