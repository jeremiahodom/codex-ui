import { ChatView } from "@/components/ChatView";
import { NotesView } from "@/components/NotesView";
import { useLayoutStore } from "@/stores/layoutStore";
import { useNoteStore } from "@/stores/NoteStore";
import { useState } from "react";
import { ConfigDialog } from "@/components/dialogs/ConfigDialog";
import { AppToolbar } from "@/components/layout/AppToolbar";
import { useConversationStore } from "@/stores/ConversationStore";
import { useCodexStore } from "@/stores/CodexStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bot, NotebookPen } from "lucide-react";
import { NoteList } from "@/components/notes";

export default function ChatPage() {
  const {
    showChatPane,
    selectedLeftPanelTab,
    setSelectedLeftPanelTab,
  } = useLayoutStore();

  const { config, setConfig } = useCodexStore();
  const {} = useConversationStore();

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - Chat Sessions and Notes */}
      <div className="w-64 border-r h-full flex-shrink-0">
        <Tabs value={selectedLeftPanelTab} onValueChange={setSelectedLeftPanelTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <Bot size={16} />
              Chat
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <NotebookPen size={16} />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 overflow-y-auto mt-0">
            <ChatView showChatTabs={true} />
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
            <NoteList />
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 h-full flex min-w-0 overflow-hidden">
        {/* Main Panel - Chat/Notes */}
        {showChatPane && (
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <AppToolbar
              onOpenConfig={() => setIsConfigOpen(true)}
              currentTab={selectedLeftPanelTab}
              onSwitchToTab={setSelectedLeftPanelTab}
            />
            {selectedLeftPanelTab === "notes" ? (
              <NotesView />
            ) : (
              <ChatView />
            )}
          </div>
        )}
      </div>

      <ConfigDialog
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
        }}
      />
    </div>
  );
}