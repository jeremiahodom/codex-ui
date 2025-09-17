import React, { useState, useEffect } from "react";
import type { Conversation } from "@/types/chat";
import { useConversationStore } from "@/stores/ConversationStore";
import { useCodexStore } from "@/stores/CodexStore";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useModelStore } from "@/stores/ModelStore";
import { sessionManager } from "@/services/sessionManager";
import { chatService } from "@/services/chatService";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { generateUniqueId } from "@/utils/genUniqueId";
import { ModelSelector } from "./ModelSelector";

interface ChatInterfaceProps {
  sessionId: string;
  selectedConversation?: Conversation | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  selectedConversation = null,
}) => {
  const { inputValue, setInputValue, editingTarget } = useChatInputStore();
  const { currentModel, currentProvider, reasoningEffort } = useModelStore();
  const [isConnected, setIsConnected] = useState(false);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessionId);
  const [sessionStarting, setSessionStarting] = useState(false);

  const { config, updateConfig } = useCodexStore();
  const {
    getCurrentProjectConversations,
    addMessage,
    setSessionLoading,
    createConversation,
    pendingNewConversation,
    setPendingNewConversation,
    setCurrentConversation,
    getCurrentConversation,
  } = useConversationStore();
  
  // Get conversations filtered by current project
  const conversations = getCurrentProjectConversations();
  
  const setSandboxMode = (mode: typeof config.sandboxMode) => {
    updateConfig({ sandboxMode: mode });
  };

  // Simplified: Use session_id to find conversation data
  // Priority: selectedConversation (from disk/history) > store currentConversation (unfiltered)
  const currentConversation =
    selectedConversation ||
    getCurrentConversation();

  // Convert conversation messages to chat messages format
  const sessionMessages = currentConversation
    ? currentConversation.messages.map((msg, index) => {
        return {
          id: msg.id || `${currentConversation.id}-msg-${index}`,
          role: msg.role,
          content: msg.content,
          title: msg.title,
          timestamp: typeof msg.timestamp === "number" ? msg.timestamp : Date.now(),
          model: msg.role === "assistant" ? currentModel : undefined,
          approvalRequest: msg.approvalRequest,
          // Preserve optional rendering metadata
          ...(msg as any).messageType && { messageType: (msg as any).messageType },
          ...(msg as any).eventType && { eventType: (msg as any).eventType },
          // Preserve structured plan payload for plan_update messages
          ...(msg as any).plan && { plan: (msg as any).plan },
        };
      })
    : [];

  const handleStopStreaming = async () => {
    try {
      // Extract raw session ID for backend communication
      const rawSessionId = sessionId.startsWith("codex-event-")
        ? sessionId.replace("codex-event-", "")
        : sessionId;

      await invoke("pause_session", {
        sessionId: rawSessionId,
      });

      // Immediately set loading to false after successful pause
      setSessionLoading(sessionId, false);
    } catch (error) {
      console.error("Failed to pause streaming:", error);
      // On error, also set loading to false
      setSessionLoading(sessionId, false);
    }
  };

  useCodexEvents({
    sessionId: activeSessionId,
    onStopStreaming: handleStopStreaming,
  });

  const messages = [...sessionMessages];
  const isLoading = currentConversation?.isLoading || false;
  const fileDiffMap = useEphemeralStore((s) => s.sessionFileDiffs[activeSessionId]);

  // Update activeSessionId when sessionId prop changes
  useEffect(() => {
    if (
      sessionId &&
      sessionId !== activeSessionId &&
      !tempSessionId &&
      sessionId.startsWith("codex-event-")
    ) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, activeSessionId, tempSessionId]);

  // When creating a new conversation (empty sessionId) or pending new conversation,
  // clear any previous per-turn diffs (parsedFiles) and reset view state.
  useEffect(() => {
    const isCreating = pendingNewConversation || !sessionId.trim();
    if (isCreating) {
      try {
        if (activeSessionId) {
          useEphemeralStore.getState().clearTurnDiffs(activeSessionId);
        }
      } catch (e) {
        console.error('Failed to clear diffs during new conversation setup:', e);
      }
      // Ensure we don't keep showing old diffs
      if (activeSessionId !== sessionId) {
        setActiveSessionId(sessionId);
      }
    }
  }, [pendingNewConversation, sessionId]);

  useEffect(() => {
    if (sessionId) {
      const isRunning = sessionManager.isSessionRunning(sessionId);
      setIsConnected(isRunning);

      // NEVER auto-start session for historical conversations
      // Only auto-start if:
      // 1. Not viewing history (selectedConversation is null)
      // 2. No messages exist (truly new conversation)
      // 3. Not pending new conversation
      // 4. Session is not already starting
      // 5. Session ID looks like current timestamp format (not old UUID format)
      const isTimestampFormat =
        sessionId.startsWith("codex-event-") &&
        /\d{13}-[a-z0-9]+$/.test(sessionId.replace("codex-event-", ""));

      if (
        !isRunning &&
        !sessionStarting &&
        messages.length === 0 &&
        !selectedConversation &&
        !pendingNewConversation &&
        isTimestampFormat &&
        sessionId.trim()
      ) {
        // Additional check: Only auto-start if this session was created very recently (within last 5 seconds)
        const timestampMatch = sessionId.match(/codex-event-(\d{13})-/);
        if (timestampMatch) {
          const sessionTimestamp = parseInt(timestampMatch[1]);
          const now = Date.now();
          const isRecentSession = now - sessionTimestamp < 5000; // 5 seconds

          if (isRecentSession) {
            const startSession = async () => {
              try {
                setSessionLoading(sessionId, true);
                // Create updated config with current model selection
                const updatedConfig = {
                  ...config,
                  model: currentModel,
                  provider: currentProvider,
                  useOss: currentProvider.toLowerCase() === "ollama",
                  reasoningEffort,
                };
                await sessionManager.ensureSessionRunning(
                  sessionId,
                  updatedConfig,
                );
                setIsConnected(true);
                setSessionLoading(sessionId, false);
              } catch (error) {
                console.error("Failed to auto-start session:", error);
                const errorMessage = {
                  id: `${sessionId}-auto-start-error-${generateUniqueId()}`,
                  role: "system" as const,
                  content: `Failed to start Codex session: ${error}`,
                  timestamp: Date.now(),
                };
                addMessage(sessionId, errorMessage);
                setSessionLoading(sessionId, false);
              }
            };

            startSession();
          } else {
          }
        }
      } else {
      }
    }
  }, [
    sessionId,
    selectedConversation,
    pendingNewConversation,
    sessionStarting,
  ]);

  const handleSendMessage = async (message: string) => {
    console.log("isConnected", isConnected);

    // NEW: Simple text message - view_image tool will handle any image paths
    let messageContent = message;

    if (!messageContent.trim() || isLoading) {
      return;
    }

    // Prevent sending messages when viewing historical conversations
    if (selectedConversation) {
      return;
    }

    let actualSessionId = sessionId;

    // Establish or reuse a session only when there is no valid sessionId
    let isPendingSession = false;
    const hasValidSessionId = !!sessionId.trim();
    if (!hasValidSessionId) {
      // Check if there's already a conversation waiting to be used
      const existingNewConversation = conversations.find(
        (conv) =>
          conv.id.startsWith("codex-event-") &&
          conv.messages.length === 0 &&
          /\d{13}-[a-z0-9]+$/.test(conv.id.replace("codex-event-", "")),
      );

      if (existingNewConversation) {
        // Use the existing empty conversation
        actualSessionId = existingNewConversation.id;
        setCurrentConversation(actualSessionId);
        setActiveSessionId(actualSessionId);
        setPendingNewConversation(false);
      } else {
        // Create a brand new session ID; do not close running sessions here
        actualSessionId = `codex-event-${generateUniqueId()}`;
        setTempSessionId(actualSessionId);
        setPendingNewConversation(false);
        isPendingSession = true;
      }
    } else if (pendingNewConversation) {
      // We already have a sessionId: just clear the pending flag and reuse it
      setPendingNewConversation(false);
    }

    // Clear any carryover diffs for the session we are about to use
    try {
      if (actualSessionId) {
        useEphemeralStore.getState().clearTurnDiffs(actualSessionId);
      }
    } catch (e) {
      console.error('Failed to clear diffs before sending in new conversation:', e);
    }

    // Ensure session is running before sending message
    try {
      if (!sessionManager.isSessionRunning(actualSessionId)) {
        setSessionStarting(true);
        setSessionLoading(actualSessionId, true);
        // Create updated config with current model selection
        const updatedConfig = {
          ...config,
          model: currentModel,
          provider: currentProvider,
          useOss: currentProvider.toLowerCase() === "ollama",
          reasoningEffort,
        };
        await sessionManager.ensureSessionRunning(
          actualSessionId,
          updatedConfig,
        );
        setIsConnected(true);

        if (isPendingSession) {
          createConversation("New Chat", actualSessionId);
          setCurrentConversation(actualSessionId);
          setActiveSessionId(actualSessionId);
          setTempSessionId(null);
        }

        setSessionLoading(actualSessionId, false);
        setSessionStarting(false);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
      setSessionStarting(false);
      const errorMessage = {
        id: `${actualSessionId}-startup-error-${generateUniqueId()}`,
        role: "system" as const,
        content: `Failed to start Codex session: ${error}`,
        timestamp: Date.now(),
      };
      addMessage(actualSessionId, errorMessage);
      setSessionLoading(actualSessionId, false);
      return;
    }

    // If this is a forked conversation and not yet applied, prepend context
    if (currentConversation?.forkMeta && !currentConversation.forkMeta.applied) {
      try {
        const meta = currentConversation.forkMeta;
        const historyText = meta.history
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role}:\n${m.content}`)
          .join("\n\n");
        const forkHeader = `parentId: ${meta.parentMessageId}\nsourceSession: ${meta.fromConversationId}`;
        const combined = `${forkHeader}\n\nConversation history:\n${historyText}\n\nUser:\n${messageContent}`;
        messageContent = combined;
      } catch (e) {
        console.error('Failed to build fork context:', e);
      }
    }

    // If resending from an edited message, truncate messages from that point
    try {
      const { editingTarget, clearEditingTarget } = useChatInputStore.getState();
      if (editingTarget && editingTarget.conversationId === actualSessionId) {
        useConversationStore.getState().truncateMessagesFrom(actualSessionId, editingTarget.messageId);
        clearEditingTarget();
      }
    } catch (e) {
      console.error('Failed to handle edit-resend truncation:', e);
    }

    // Add user message to conversation store
    const userMessage = {
      id: `${actualSessionId}-user-${generateUniqueId()}`,
      role: "user" as const,
      // Keep UI clean: store only the typed message
      content: message,
      timestamp: Date.now(),
    };
    addMessage(actualSessionId, userMessage);
    setSessionLoading(actualSessionId, true);

    try {
      // Extract raw session ID for backend communication
      const rawSessionId = actualSessionId.startsWith("codex-event-")
        ? actualSessionId.replace("codex-event-", "")
        : actualSessionId;

      // NEW: Always send as regular text message - view_image tool handles images
      await invoke("send_message", {
        sessionId: rawSessionId,
        message: messageContent,
      });
      console.log("📤 ChatInterface: Sending text message:", messageContent);

      // Mark fork context as applied so future sends don't include it
      if (currentConversation?.forkMeta && !currentConversation.forkMeta.applied) {
        useConversationStore.getState().setForkMetaApplied(actualSessionId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: `${actualSessionId}-send-error-${generateUniqueId()}`,
        role: "system" as const,
        content: `Failed to send message: ${error}`,
        timestamp: Date.now(),
      };
      addMessage(actualSessionId, errorMessage);
      setSessionLoading(actualSessionId, false);
    }
  };

  const handleApproval = async (approved: boolean, approvalRequest: ApprovalRequest) => {
    try {
      // Extract raw session ID for backend communication
      const rawSessionId = sessionId.startsWith("codex-event-")
        ? sessionId.replace("codex-event-", "")
        : sessionId;

      // Handle different approval types with appropriate backend calls
      switch (approvalRequest.type) {
        case 'exec':
          await invoke("approve_execution", {
            sessionId: rawSessionId,
            approvalId: approvalRequest.id,
            approved,
          });
          break;
          
        case 'patch':
          await invoke("approve_patch", {
            sessionId: rawSessionId,
            approvalId: approvalRequest.id,
            approved,
          });
          break;
          
        case 'apply_patch':
          await invoke("approve_patch", {
            sessionId: rawSessionId,
            approvalId: approvalRequest.id,
            approved,
          });
          break;
          
        default:
          console.error('Unknown approval request type:', approvalRequest.type);
          return;
      }
      
      console.log(`✅ Approval ${approved ? 'granted' : 'denied'} for ${approvalRequest.type} request ${approvalRequest.id}`);
      
      // If denied, pause the session to stop further execution
      if (!approved) {
        console.log('🛑 Pausing session due to denied approval');
        await invoke("pause_session", {
          sessionId: rawSessionId,
        });
      }
    } catch (error) {
      console.error("Failed to send approval:", error);
      
      // Add error message to conversation
      const errorMessage = {
        id: `${sessionId}-approval-error-${generateUniqueId()}`,
        role: "system" as const,
        content: `Failed to process approval: ${error}`,
        timestamp: Date.now(),
      };
      addMessage(sessionId, errorMessage);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {currentConversation?.forkMeta && (
          <ForkOriginBanner
            fromConversationId={currentConversation.forkMeta.fromConversationId}
            parentMessageId={currentConversation.forkMeta.parentMessageId}
          />
        )}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isPendingNewConversation={pendingNewConversation || !sessionId.trim()}
          onApproval={handleApproval}
        />

        {/* Compact latest changes summary + collapsible diff */}
        <ChangesSummary diffs={fileDiffMap} />

        <ChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          disabled={!!selectedConversation && !selectedConversation.filePath}
          isLoading={isLoading}
          placeholderOverride={editingTarget ? 'Editing message and resending from here' : undefined}
        />
        
        <div className="flex px-2 pt-0.5">
          <Sandbox 
            sandboxMode={config.sandboxMode}
            onModeChange={setSandboxMode}
          />
          <ModelSelector />
          <ReasoningEffortSelector />
          </div>
      </div>
    </div>
  );
};
