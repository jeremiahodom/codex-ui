import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import which from 'which';
import { CodexConfig, SessionInfo, CodexEvent } from '../types';
import { SSEManager } from './SSEManager';

export class SessionManager {
  private sessions: Map<string, SessionInfo> = new Map();
  private sseManager?: SSEManager;

  constructor(sseManager?: SSEManager) {
    this.sseManager = sseManager;
  }

  setSSSEManager(sseManager: SSEManager) {
    this.sseManager = sseManager;
  }

  async startSession(sessionId: string, config: CodexConfig): Promise<void> {
    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      console.log(`Session ${sessionId} already exists, skipping`);
      return;
    }

    try {
      // Discover codex command
      const codexCommand = await this.discoverCodexCommand();
      if (!codexCommand) {
        throw new Error('Codex CLI not found in PATH');
      }

      // Build command arguments
      const args = this.buildCodexArgs(config);
      
      console.log(`🚀 Starting Codex session: ${sessionId}`);
      console.log(`📋 Command: ${codexCommand} ${args.join(' ')}`);
      console.log(`📁 Working directory: ${config.working_directory}`);

      // Spawn codex process
      const childProcess = spawn(codexCommand, args, {
        cwd: config.working_directory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...(config.api_key && { API_KEY: config.api_key })
        }
      });

      // Store session info
      const sessionInfo: SessionInfo = {
        id: sessionId,
        config,
        isRunning: true,
        process: childProcess
      };
      this.sessions.set(sessionId, sessionInfo);

      // Handle process events
      this.setupProcessHandlers(sessionId, childProcess);

      // Send session configured event
      this.emitEvent(sessionId, {
        id: uuidv4(),
        msg: {
          type: 'session_configured',
          session_id: sessionId
        },
        session_id: sessionId
      });

    } catch (error) {
      console.error(`Failed to start session ${sessionId}:`, error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process) {
      throw new Error(`Session ${sessionId} not found or not running`);
    }

    try {
      // Send message to codex process via stdin
      const messageData = JSON.stringify({
        type: 'user_message',
        message: message
      }) + '\n';

      session.process.stdin?.write(messageData);
      console.log(`📤 Sent message to session ${sessionId}: ${message.substring(0, 100)}...`);
    } catch (error) {
      console.error(`Failed to send message to session ${sessionId}:`, error);
      throw error;
    }
  }

  async approveExecution(sessionId: string, approvalId: string, approved: boolean): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process) {
      throw new Error(`Session ${sessionId} not found or not running`);
    }

    try {
      const approvalData = JSON.stringify({
        type: 'approval_response',
        approval_id: approvalId,
        approved: approved
      }) + '\n';

      session.process.stdin?.write(approvalData);
      console.log(`✅ Sent approval for session ${sessionId}: ${approved}`);
    } catch (error) {
      console.error(`Failed to send approval to session ${sessionId}:`, error);
      throw error;
    }
  }

  async approvePatch(sessionId: string, approvalId: string, approved: boolean): Promise<void> {
    return this.approveExecution(sessionId, approvalId, approved);
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process) {
      throw new Error(`Session ${sessionId} not found or not running`);
    }

    try {
      session.process.kill('SIGTERM');
      session.isRunning = false;
      console.log(`⏸️ Paused session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to pause session ${sessionId}:`, error);
      throw error;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return; // Session doesn't exist, nothing to close
    }

    try {
      if (session.process && session.isRunning) {
        session.process.kill('SIGKILL');
      }
      this.sessions.delete(sessionId);
      console.log(`🔚 Closed session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to close session ${sessionId}:`, error);
      throw error;
    }
  }

  getRunninSessions(): string[] {
    return Array.from(this.sessions.keys()).filter(sessionId => {
      const session = this.sessions.get(sessionId);
      return session?.isRunning;
    });
  }

  private async discoverCodexCommand(): Promise<string | null> {
    try {
      // Try to find codex in PATH
      return await which('codex');
    } catch (error) {
      console.warn('Codex not found in PATH, trying common locations...');
      
      // Try common installation paths
      const commonPaths = [
        '/usr/local/bin/codex',
        '/usr/bin/codex',
        `${os.homedir()}/.cargo/bin/codex`,
        `${os.homedir()}/.local/bin/codex`
      ];

      for (const codexPath of commonPaths) {
        if (fs.existsSync(codexPath)) {
          return codexPath;
        }
      }

      return null;
    }
  }

  private buildCodexArgs(config: CodexConfig): string[] {
    const args: string[] = [];

    // Add model
    if (config.model) {
      args.push('-m', config.model);
    }

    // Add provider
    if (config.provider) {
      args.push('--provider', config.provider);
    }

    // Add OSS flag
    if (config.use_oss) {
      args.push('--oss');
    }

    // Add approval policy
    if (config.approval_policy) {
      args.push('--approve', config.approval_policy);
    }

    // Add sandbox mode
    if (config.sandbox_mode) {
      args.push('--sandbox');
    }

    // Add reasoning effort
    if (config.reasoning_effort) {
      args.push('--reasoning-effort', config.reasoning_effort);
    }

    // Add web search
    if (config.tools_web_search) {
      args.push('--tools-web-search');
    }

    // Add resume path
    if (config.resume_path) {
      args.push('--resume', config.resume_path);
    }

    // Add custom args
    if (config.custom_args) {
      args.push(...config.custom_args.split(' '));
    }

    // Add protocol flag for JSON communication
    args.push('--protocol');

    return args;
  }

  private setupProcessHandlers(sessionId: string, process: ChildProcess) {
    // Handle stdout (codex events)
    process.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          this.emitEvent(sessionId, {
            id: uuidv4(),
            msg: event,
            session_id: sessionId
          });
        } catch (error) {
          // Handle non-JSON output
          this.emitRawEvent(sessionId, {
            type: 'raw_output',
            data: line
          });
        }
      }
    });

    // Handle stderr
    process.stderr?.on('data', (data) => {
      console.error(`Session ${sessionId} stderr:`, data.toString());
      this.emitEvent(sessionId, {
        id: uuidv4(),
        msg: {
          type: 'error',
          message: data.toString()
        },
        session_id: sessionId
      });
    });

    // Handle process exit
    process.on('exit', (code, signal) => {
      console.log(`Session ${sessionId} exited with code ${code}, signal ${signal}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isRunning = false;
      }
      
      this.emitEvent(sessionId, {
        id: uuidv4(),
        msg: {
          type: 'shutdown_complete',
          code,
          signal
        },
        session_id: sessionId
      });
    });

    // Handle process error
    process.on('error', (error) => {
      console.error(`Session ${sessionId} process error:`, error);
      this.emitEvent(sessionId, {
        id: uuidv4(),
        msg: {
          type: 'error',
          message: error.message
        },
        session_id: sessionId
      });
    });
  }

  private emitEvent(sessionId: string, event: CodexEvent) {
    if (this.sseManager) {
      this.sseManager.broadcastCodexEvent(event);
    }
  }

  private emitRawEvent(sessionId: string, data: any) {
    if (this.sseManager) {
      this.sseManager.broadcastRawEvent(sessionId, data);
    }
  }

  shutdown() {
    console.log('🔄 Shutting down all sessions...');
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.process && session.isRunning) {
        try {
          session.process.kill('SIGTERM');
        } catch (error) {
          console.error(`Failed to kill session ${sessionId}:`, error);
        }
      }
    }
    this.sessions.clear();
  }
}