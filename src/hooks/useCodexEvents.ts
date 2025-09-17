import { useEffect, useRef, useCallback } from 'react';
import { CodexEvent, ApprovalRequest } from '@/types/codex';
import { useConversationStore } from '../stores/ConversationStore';
import { StreamController, StreamControllerSink } from '@/utils/streamController';
import { generateUniqueId } from '@/utils/genUniqueId';
import { ChatMessage } from '@/types/chat';
import { useEphemeralStore } from '@/stores/EphemeralStore';
import { listen } from '@/services/sseClient';
import { invoke } from '@/services/apiClient';

interface UseCodexEventsProps {
  sessionId: string;
  onStopStreaming?: () => void;
}

export const useCodexEvents = ({ 
  sessionId,
  onStopStreaming
}: UseCodexEventsProps) => {
  const { addMessage, updateMessage, setSessionLoading, createConversation, conversations, setResumeMeta } = useConversationStore();
  const streamController = useRef<StreamController>(new StreamController());
  const currentStreamingMessageId = useRef<string | null>(null);
  const currentCommandMessageId = useRef<string | null>(null);
  const currentCommandInfo = useRef<{ command: string[], cwd: string } | null>(null);
  const lastTurnDiffRef = useRef<string | null>(null);

  const addMessageToStore = (message: ChatMessage) => {
    // Ensure conversation exists
    const conversationExists = conversations.find(conv => conv.id === sessionId);
    if (!conversationExists) {
      console.log(`Creating conversation for session ${sessionId} from event`);
      createConversation('New Chat', sessionId);
    }
    
    // Convert message format and add to store
    const conversationMessage = {
      id: message.id,
      role: message.role === 'user' ? 'user' as const : 
            message.role === 'assistant' ? 'assistant' as const : 
            message.role === 'approval' ? 'approval' as const : 'system' as const,
      content: message.content,
      title: message.title,
      timestamp: message.timestamp,
      // Preserve approval request data if present
      ...(message.approvalRequest && { approvalRequest: message.approvalRequest }),
      ...(message.messageType && { messageType: message.messageType }),
      ...(message.eventType && { eventType: message.eventType }),
      ...(message.plan && { plan: message.plan }),
    };
    
    addMessage(sessionId, conversationMessage);
  };

  // Create streaming sink for the controller
  const createStreamSink = useCallback((messageId: string): StreamControllerSink => {
    let accumulatedContent = '';
    
    return {
      insertLines: (lines: string[]) => {
        // Append new lines to accumulated content
        const newContent = lines.join('\n');
        if (accumulatedContent) {
          accumulatedContent += '\n' + newContent;
        } else {
          accumulatedContent = newContent;
        }
        updateMessage(sessionId, messageId, { content: accumulatedContent });
      },
      startAnimation: () => {
        // Animation started - could add visual indicators here
      },
      stopAnimation: () => {
        // Animation finished
      }
    };
  }, [sessionId, updateMessage]);

  const handleCodexEvent = (event: CodexEvent) => {
    // If event has session_id, route only matching session
    if (event.session_id) {
      const rawSessionId = sessionId.startsWith('codex-event-')
        ? sessionId.replace('codex-event-', '')
        : sessionId;

      if (event.session_id !== sessionId && event.session_id !== rawSessionId) {
        return; // Ignore events for other sessions
      }
    }
    const { msg } = event;
    
    switch (msg.type) {
      case 'session_configured': {
        // Store backend session UUID and try to discover rollout path for resume
        const backendSessionId = (msg as any).session_id as string;
        if (backendSessionId) {
          setResumeMeta(sessionId, { codexSessionId: backendSessionId });
          // Ask backend to find the rollout path for this session UUID
          // We do not block UI if it fails
          // Use static import to avoid Vite dynamic import mixing warning
          invoke<string | null>('find_rollout_path_for_session', { sessionUuid: backendSessionId })
            .then((path) => {
              if (path) {
                setResumeMeta(sessionId, { resumePath: path });
              }
            })
            .catch(() => {});
        }
        break;
      }
        
      case 'task_started':
        setSessionLoading(sessionId, true);
        // Clear any previous streaming state
        streamController.current.clearAll();
        currentStreamingMessageId.current = null;
        break;
        
      case 'task_complete':
        setSessionLoading(sessionId, false);
        // Finalize any ongoing stream
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        break;

      case 'turn_complete':
        // Some backends emit turn_complete instead of task_complete
        setSessionLoading(sessionId, false);
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        break;
        
      case 'agent_message':
        // Handle complete message
        if (msg.message) {
          // Clean up any streaming state silently - complete message takes precedence
          if (currentStreamingMessageId.current) {
            streamController.current.finalize(false); // Don't commit partial content
            currentStreamingMessageId.current = null;
          }
          // dont add message because avoid dup message
        }
        break;
        
      case 'agent_reasoning':
      case 'agent_reasoning_raw_content':
        // Summarized reasoning message (TUI-like)
        {
          const reasoningContent =
            (msg as any).text ??
            (msg as any).reasoning ??
            (msg as any).content;
          if (reasoningContent) {
            const reasoningMessage: ChatMessage = {
              id: `${sessionId}-reasoning-${generateUniqueId()}`,
              role: 'system',
              content: reasoningContent,
              timestamp: new Date().getTime(),
              messageType: 'reasoning',
              eventType: msg.type,
            };
            addMessageToStore(reasoningMessage);
          }
        }
        break;
        
      case 'agent_reasoning_delta':
      case 'agent_reasoning_raw_content_delta':
        // Do not render reasoning deltas into chat to reduce noise.
        console.log(msg)
        break;
        
      case 'plan_update': {
        // Use structured payload as-is; avoid altering step text
        const planPayload: ChatMessage['plan'] = {
          explanation: (msg as any).explanation ?? null,
          plan: Array.isArray((msg as any).plan) ? (msg as any).plan : [],
        };

        const planMessage: ChatMessage = {
          id: `${sessionId}-plan-${generateUniqueId()}`,
          role: 'system',
          content: '', // renderer uses structured plan
          timestamp: new Date().getTime(),
          messageType: 'plan_update',
          eventType: msg.type,
          plan: planPayload,
        };
        addMessageToStore(planMessage);
        break;
      }
        
      case 'mcp_tool_call_begin':
        // Only show important tool calls like Read/Edit/Write, skip internal tools
        const toolName = msg.invocation?.tool || 'Unknown Tool';
        if (['read', 'edit', 'write', 'glob', 'grep'].some(t => toolName.toLowerCase().includes(t))) {
          const toolCallMessage: ChatMessage = {
            id: `${sessionId}-mcp-${generateUniqueId()}`,
            role: 'system',
            title: `🔧 ${toolName}`,
            content: '',
            timestamp: new Date().getTime(),
            messageType: 'tool_call',
            eventType: msg.type,
          };
          addMessageToStore(toolCallMessage);
        }
        break;
        
      case 'mcp_tool_call_end':
        // Skip tool call end messages - they're too noisy
        break;
        
      case 'patch_apply_begin':
        // Skip patch begin - too noisy, turn_diff will show the changes
        break;
        
      case 'patch_apply_end':
        // Skip patch end - turn_diff shows what actually changed
        break;
        
      case 'web_search_begin':
        // Show web search activity
        const searchBeginMessage: ChatMessage = {
          id: `${sessionId}-search-begin-${generateUniqueId()}`,
          role: 'system',
          title: `🔍 ${msg.query}`,
          content: 'Searching web...',
          timestamp: new Date().getTime(),
          eventType: msg.type,
        };
        addMessageToStore(searchBeginMessage);
        break;
        
      case 'web_search_end':
        // Skip search end - begin is enough
        break;
        
      case 'agent_message_delta':
        // Handle streaming delta
        if (!currentStreamingMessageId.current) {
          // Start new streaming message
          const messageId = `${sessionId}-stream-${generateUniqueId()}`;
          currentStreamingMessageId.current = messageId;
          
          const streamingMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: '',
            timestamp: new Date().getTime(),
            isStreaming: true,
            eventType: msg.type,
          };
          addMessageToStore(streamingMessage);
          
          // Begin streaming with sink
          const sink = createStreamSink(messageId);
          streamController.current.begin(sink);
        }
        
        // Push delta to stream controller
        if (currentStreamingMessageId.current && msg.delta) {
          streamController.current.pushAndMaybeCommit(msg.delta);
        }
        break;
        
      case 'exec_approval_request':
        // Add approval message to chat
        const execApprovalRequest: ApprovalRequest = {
          // Backend expects the Task sub_id for approvals (the Event.id)
          id: event.id,
          type: 'exec',
          command: Array.isArray(msg.command) ? msg.command.join(' ') : msg.command,
          cwd: msg.cwd,
          call_id: (msg as any).call_id,
        };
        
        const execMessage: ChatMessage = {
          id: event.id, // Use the original event ID, not a generated one
          role: 'approval',
          title: `🔧 Execute: ${execApprovalRequest.command}`,
          content: `Working directory: ${execApprovalRequest.cwd}`,
          timestamp: new Date().getTime(),
          approvalRequest: execApprovalRequest,
          eventType: msg.type,
        };
        addMessageToStore(execMessage);
        break;
        
      case 'patch_approval_request':
        // Add approval message to chat
        const patchApprovalRequest: ApprovalRequest = {
          id: event.id, // Use event.id for patch approvals
          type: 'patch',
          patch: msg.patch,
          files: msg.files,
        };
        
        const patchMessage: ChatMessage = {
          id: event.id, // Use the original event ID, not a generated one
          role: 'approval',
          title: `📝 Patch: ${msg.files?.join(', ') || 'unknown files'}`,
          content: `Requesting approval to apply patch`,
          timestamp: new Date().getTime(),
          approvalRequest: patchApprovalRequest,
          eventType: msg.type,
        };
        addMessageToStore(patchMessage);
        break;
        
      case 'apply_patch_approval_request':
        // Add approval message to chat
        const applyPatchApprovalRequest: ApprovalRequest = {
          // Use Task sub_id (Event.id); core matches approvals by sub_id
          id: event.id,
          type: 'apply_patch',
          call_id: (msg as any).call_id,
          changes: (msg as any).changes,
          reason: (msg as any).reason,
          grant_root: (msg as any).grant_root,
        };

        // Create detailed content with changes info across schemas
        const makeChangeSummary = (file: string, change: any): string => {
          try {
            // Support multiple backend schemas: add/remove/modify, update{unified_diff,move_path}
            if (change.add) {
              const content = change.add.content || change.add.unified_diff || JSON.stringify(change.add, null, 2);
              return `Add ${file}\n${content}`;
            }
            if (change.remove) {
              const content = change.remove.content || change.remove.unified_diff || JSON.stringify(change.remove, null, 2);
              return `Remove ${file}\n${content}`;
            }
            if (change.modify) {
              const content = change.modify.content || change.modify.unified_diff || JSON.stringify(change.modify, null, 2);
              return `Modify ${file}\n${content}`;
            }
            if (change.update) {
              const mv = change.update.move_path ? `Move to: ${change.update.move_path}\n` : '';
              const diff = change.update.unified_diff || change.update.content || '';
              return `Update ${file}\n${mv}${diff}`.trim();
            }
            // Fallback: show JSON
            return `${file}\n${JSON.stringify(change, null, 2)}`;
          } catch {
            return `Change ${file}`;
          }
        };

        // Determine files and build summary
        let changesText = 'No change details available';
        let titleFiles = '';
        if (msg.changes && typeof msg.changes === 'object' && !Array.isArray(msg.changes)) {
          const entries = Object.entries(msg.changes as Record<string, any>);
          if (entries.length > 0) {
            const rel = (p: string) => {
              const root = (msg as any).grant_root as string | undefined;
              if (root && p.startsWith(root)) {
                const trimmed = p.slice(root.length);
                return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
              }
              return p;
            };
            changesText = entries.map(([file, change]) => makeChangeSummary(rel(file), change)).join('\n\n');
            titleFiles = entries.map(([file]) => rel(file)).join(', ');
          }
        } else if (Array.isArray(msg.changes)) {
          // If changes come as an array, stringify concisely
          changesText = (msg.changes as any[]).map((c, idx) => makeChangeSummary(`change #${idx + 1}`, c)).join('\n\n');
        }

        const applyPatchMessage: ChatMessage = {
          id: event.id, // Use the original event ID, not a generated one
          role: 'approval',
          title: `🔄 Apply Patch${titleFiles ? `: ${titleFiles}` : ''}`,
          content: `${(msg as any).reason ? `Reason: ${(msg as any).reason}\n\n` : ''}Changes:\n${changesText}`,
          timestamp: new Date().getTime(),
          approvalRequest: applyPatchApprovalRequest,
          eventType: msg.type,
        };
        addMessageToStore(applyPatchMessage);
        break;
        
      case 'error':
        // Clean up any ongoing stream on error
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        
        const errorMessage: ChatMessage = {
          id: `${sessionId}-error-${generateUniqueId()}`,
          role: 'system',
          content: `Error: ${msg.message}`,
          timestamp: new Date().getTime(),
          eventType: msg.type,
        };
        addMessageToStore(errorMessage);
        setSessionLoading(sessionId, false);
        break;
        
      case 'shutdown_complete':
        // Clean up streaming state on shutdown
        streamController.current.clearAll();
        currentStreamingMessageId.current = null;
        break;
        
      case 'background_event':
        // Background events are informational
        break;
        
      case 'turn_diff': {
        // De-duplicate identical consecutive diffs (raw + structured double delivery)
        const diffText = msg.unified_diff || '';
        if (lastTurnDiffRef.current === diffText) {
          break;
        }
        lastTurnDiffRef.current = diffText;

        // Store latest diff in ephemeral store for UI to summarize near ChatInput
        try {
          useEphemeralStore.getState().setTurnDiff(sessionId, diffText);
        } catch {}
        break;
      }
        
      case 'exec_command_begin':
        // Create initial command message and store command info
        {
          const cmdMessageId = `${sessionId}-cmd-${generateUniqueId()}`;
          const commandArr = Array.isArray(msg.command) ? msg.command : [msg.command];
          const commandStr = commandArr.join(' ');
          currentCommandMessageId.current = cmdMessageId;
          currentCommandInfo.current = { command: commandArr, cwd: msg.cwd };

          const commandMessage: ChatMessage = {
            id: cmdMessageId,
            role: 'system',
            title: `▶ ${commandStr}`,
            content: `cwd: ${msg.cwd}`,
            timestamp: new Date().getTime(),
            messageType: 'exec_command',
            eventType: msg.type,
          };
          addMessageToStore(commandMessage);
        }
        break;
        
      case 'exec_command_output_delta':
        // Command output streaming - message is chunk
        break;
        
      case 'exec_command_end':
        // Update the existing command message with completion info
        {
          const msgId = currentCommandMessageId.current;
          const info = currentCommandInfo.current;
          if (msgId && info) {
            const command = info.command.join(' ');
            const status = msg.exit_code === 0 ? '✅' : '❌';
            const statusText = msg.exit_code === 0 ? '' : ` (exit ${msg.exit_code})`;

            // Build output details when present
            const stdoutBlock = msg.stdout?.trim() ? `\n\`\`\`\n${msg.stdout}\n\`\`\`` : '';
            const stderrBlock = msg.stderr?.trim() ? `${msg.stdout?.trim() ? '\n\n' : ''}Errors:\n\`\`\`\n${msg.stderr}\n\`\`\`` : '';
            const outputContent = `${stdoutBlock}${stderrBlock}`;

            updateMessage(sessionId, msgId, {
              title: `${command} ${status}${statusText}`,
              content: outputContent,
              timestamp: new Date().getTime(),
            });

            currentCommandMessageId.current = null;
            currentCommandInfo.current = null;
          }
        }
        break;

      case 'turn_aborted':
        // Handle turn abortion - add system message to indicate the turn was stopped
        const abortMessage: ChatMessage = {
          id: `${sessionId}-aborted-${generateUniqueId()}`,
          role: 'system',
          title: '🛑 Turn Stopped',
          content: msg.reason ? `Reason: ${msg.reason}` : 'The current turn has been aborted.',
          timestamp: new Date().getTime(),
          eventType: msg.type,
        };
        addMessageToStore(abortMessage);
        // Mark session idle
        setSessionLoading(sessionId, false);
        
        // Clean up any ongoing streaming
        if (currentStreamingMessageId.current) {
          streamController.current.finalize();
          currentStreamingMessageId.current = null;
        }
        
        // Clean up any ongoing command execution tracking
        if (currentCommandMessageId.current) {
          currentCommandMessageId.current = null;
          currentCommandInfo.current = null;
        }
        
        // Signal that streaming should be stopped (handled by ChatInterface)
        if (onStopStreaming) {
          onStopStreaming();
        }
        break;

      case 'token_count':
        console.log(msg)
        break;

      default:
        console.log('Unhandled event type:', msg.type);
        console.log(JSON.stringify(msg, null, 2));
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    // Listen to the global codex-events channel - process all events for approval to work
    const eventUnlisten = listen<CodexEvent>("codex-events", (event) => {
      const codexEvent = event.payload;
      
      // Log non-delta events for debugging
      if (codexEvent.msg.type !== "agent_message_delta" && codexEvent.msg.type !== "agent_reasoning_delta") {
        console.log(`📨 Codex structured event [${sessionId}]:`, codexEvent.msg);
      }
      handleCodexEvent(codexEvent);
    });
    
    // Listen to raw events that failed structured parsing - process all events for approval to work
    const rawEventUnlisten = listen<{type: string, session_id: string, data: any}>("codex-raw-events", (event) => {
      const rawEvent = event.payload;
      
      const rawMsgType = rawEvent.data.msg.type
      if (rawMsgType !== 'exec_command_output_delta') {
        console.log(`📨 Raw codex event [${sessionId}]:`, rawEvent.data);
      }
      
      // Try to convert raw event to structured event
      if (rawEvent.data && typeof rawEvent.data === 'object') {
        // Extract msg and normalize common field name differences across backends
        const baseMsg: any = rawEvent.data.msg || rawEvent.data;
        let normalizedMsg: any = baseMsg;

        if (baseMsg && typeof baseMsg === 'object') {
          const t = baseMsg.type;
          switch (t) {
            case 'agent_reasoning': {
              // Some backends send { type, text } instead of { reasoning }
              if (typeof baseMsg.text === 'string' && typeof baseMsg.reasoning !== 'string') {
                normalizedMsg = { ...baseMsg, reasoning: baseMsg.text };
              }
              break;
            }
            case 'agent_reasoning_delta': {
              // Map { text } to { delta }
              if (typeof baseMsg.text === 'string' && typeof baseMsg.delta !== 'string') {
                normalizedMsg = { ...baseMsg, delta: baseMsg.text };
              }
              break;
            }
            case 'agent_reasoning_raw_content': {
              // Map { text } to { content }
              if (typeof baseMsg.text === 'string' && typeof baseMsg.content !== 'string') {
                normalizedMsg = { ...baseMsg, content: baseMsg.text };
              }
              break;
            }
            case 'agent_message_delta': {
              // Map { text } to { delta }
              if (typeof baseMsg.text === 'string' && typeof baseMsg.delta !== 'string') {
                normalizedMsg = { ...baseMsg, delta: baseMsg.text };
              }
              break;
            }
            case 'turn_diff': {
              // Map { diff } to { unified_diff }
              if (typeof baseMsg.diff === 'string' && typeof baseMsg.unified_diff !== 'string') {
                normalizedMsg = { ...baseMsg, unified_diff: baseMsg.diff };
              }
              break;
            }
            default:
              break;
          }
        }

        const convertedEvent: CodexEvent = {
          id: rawEvent.data.id || `raw-${Date.now()}`,
          msg: normalizedMsg,
          session_id: rawEvent.session_id
        };
        
        handleCodexEvent(convertedEvent);
      }
    });
    
    // Cleanup function
    return () => {
      eventUnlisten.then(fn => fn());
      rawEventUnlisten.then(fn => fn());
      // Clear streaming state when component unmounts or sessionId changes
      streamController.current.clearAll();
      currentStreamingMessageId.current = null;
    };
  }, [sessionId, createStreamSink]);

  return {};
};
