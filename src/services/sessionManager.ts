import { sessionService } from '@/services/sessionService';
import { CodexConfig } from '@/types/codex';

class SessionManager {
  private sessionConfigs: Map<string, CodexConfig> = new Map();
  private runningSessions: Set<string> = new Set();

  async ensureSessionRunning(sessionId: string, config: CodexConfig): Promise<void> {
    // If session is already running, do nothing
    if (this.runningSessions.has(sessionId)) {
      return;
    }

    try {
      console.log(`🚀 Starting session: ${sessionId}`);

      // Create session via API  
      const session = await sessionService.createSession(`Session ${new Date().toLocaleString()}`);
      
      this.runningSessions.add(session.id);
      this.sessionConfigs.set(session.id, config);
      
      console.log(`✅ Session ${session.id} is now running`);
      return session.id;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      console.log(`🛑 Stopping session: ${sessionId}`);
      
      this.runningSessions.delete(sessionId);
      this.sessionConfigs.delete(sessionId);
      
      console.log(`✅ Session ${sessionId} stopped`);
    } catch (error) {
      console.error('Failed to stop session:', error);
      throw error;
    }
  }

  isSessionRunning(sessionId: string): boolean {
    return this.runningSessions.has(sessionId);
  }

  getSessionConfig(sessionId: string): CodexConfig | undefined {
    return this.sessionConfigs.get(sessionId);
  }

  getRunningSessions(): string[] {
    return Array.from(this.runningSessions);
  }
}

export const sessionManager = new SessionManager();
