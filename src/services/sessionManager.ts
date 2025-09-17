import { CodexConfig } from '@/types/codex';
import { useFolderStore } from '@/stores/FolderStore';
import { useProvidersStore } from '@/stores/ProvidersStore';
import { useConversationStore } from '@/stores/ConversationStore';
import { invoke } from '@/services/apiClient';

class SessionManager {
  private sessionConfigs: Map<string, CodexConfig> = new Map();
  private runningSessions: Set<string> = new Set();
  async ensureSessionRunning(sessionId: string, config: CodexConfig): Promise<void> {
    // If session is already running, do nothing
    if (this.runningSessions.has(sessionId)) {
      return;
    }

    try {
      // Extract raw session ID for backend process management
      const rawSessionId = sessionId.startsWith('codex-event-') 
        ? sessionId.replace('codex-event-', '') 
        : sessionId;
      
      console.log(`🚀 Starting backend session: ${rawSessionId} (from frontend: ${sessionId})`);

      // Get current folder
      const currentFolder = useFolderStore.getState().currentFolder;
      
      console.log(`📁 currentFolder: ${currentFolder})`);

      // Get API key from providers store
      const providersStore = useProvidersStore.getState();
      const providerConfig = providersStore.providers[config.provider as keyof typeof providersStore.providers];
      const apiKey = providerConfig?.apiKey || null;
      
      console.log(`🔑 API key debug - Provider: ${config.provider}, Has API key: ${!!apiKey}, Length: ${apiKey?.length || 0}`);

      // Start the session (backend will check if already exists)
      // If this conversation has a resume path, include it
      const conv = useConversationStore.getState().conversations.find(c => c.id === sessionId);
      const resumePath = conv?.resumePath || null;

      await invoke('start_codex_session', {
        sessionId: rawSessionId,
        config: {
          working_directory: currentFolder,
          model: config.model,
          provider: config.provider,
          use_oss: config.useOss,
          custom_args: config.customArgs || null,
          approval_policy: config.approvalPolicy,
          sandbox_mode: config.sandboxMode,
          api_key: apiKey,
          reasoning_effort: config.reasoningEffort,
          resume_path: resumePath,
          // Pass through web search toggle to backend (default false)
          tools_web_search: !!config.webSearchEnabled,
        },
      });

      this.runningSessions.add(sessionId);
      this.sessionConfigs.set(sessionId, config);
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }


  async closeSession(sessionId: string): Promise<void> {
    try {
      // Extract raw session ID for backend process management
      const rawSessionId = sessionId.startsWith('codex-event-') 
        ? sessionId.replace('codex-event-', '') 
        : sessionId;
      
      // Use the new close_session command which properly shuts down the protocol connection
      await invoke('close_session', { sessionId: rawSessionId });
      this.sessionConfigs.delete(sessionId);
      this.runningSessions.delete(sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
      throw error;
    }
  }

  async restartSession(sessionId: string, config: CodexConfig): Promise<void> {
    try {
      console.log('Restarting session:', sessionId, 'with config:', config);
      
      // Close the existing session
      if (this.runningSessions.has(sessionId)) {
        await this.closeSession(sessionId);
      }
      
      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start with new config
      await this.ensureSessionRunning(sessionId, config);
      
      console.log('Session restarted successfully:', sessionId);
    } catch (error) {
      console.error('Failed to restart session:', error);
      throw error;
    }
  }

  isSessionRunning(sessionId: string): boolean {
    return this.runningSessions.has(sessionId);
  }

  getLocalRunningSessions(): string[] {
    return Array.from(this.runningSessions);
  }
  
  async closeAllSessions(): Promise<void> {
    const sessions = Array.from(this.runningSessions);
    const promises = sessions.map(sessionId => 
      this.closeSession(sessionId).catch(error => {
        console.error(`Failed to close session ${sessionId}:`, error);
        return null; // Don't let one failure close the others
      })
    );
    
    await Promise.all(promises);
    console.log(`Closed ${sessions.length} sessions`);
  }


  getSessionConfig(sessionId: string): CodexConfig | undefined {
    return this.sessionConfigs.get(sessionId);
  }

  // Update session ID mapping when the real session ID is discovered
  updateSessionId(oldSessionId: string, newSessionId: string): void {
    const config = this.sessionConfigs.get(oldSessionId);
    if (config) {
      // Remove old mapping
      this.sessionConfigs.delete(oldSessionId);
      this.runningSessions.delete(oldSessionId);
      
      // Add new mapping
      this.sessionConfigs.set(newSessionId, config);
      this.runningSessions.add(newSessionId);
      
      console.log(`Session ID updated from ${oldSessionId} to ${newSessionId}`);
    }
  }
}

export const sessionManager = new SessionManager();
