export interface CodexConfig {
  working_directory: string;
  model: string;
  provider: string;
  use_oss?: boolean;
  custom_args?: string | null;
  approval_policy: string;
  sandbox_mode?: boolean;
  api_key?: string | null;
  reasoning_effort?: string;
  resume_path?: string | null;
  tools_web_search?: boolean;
}

export interface CodexEvent {
  id: string;
  msg: any;
  session_id?: string;
}

export interface ApprovalRequest {
  id: string;
  type: 'exec' | 'patch' | 'apply_patch';
  command?: string;
  cwd?: string;
  call_id?: string;
  patch?: string;
  files?: string[];
  changes?: any;
  reason?: string;
  grant_root?: string;
}

export interface SessionInfo {
  id: string;
  config: CodexConfig;
  isRunning: boolean;
  process?: any;
}

export interface Conversation {
  id: string;
  title: string;
  messages: any[];
  config?: CodexConfig;
  resumePath?: string;
}

export interface Project {
  path: string;
  trust_level: string;
}

export interface ModelProvider {
  name: string;
  apiKey?: string;
  models?: string[];
}

export interface Profile {
  name: string;
  model: string;
  provider: string;
  [key: string]: any;
}

export interface FileWatcher {
  path: string;
  watcher: any;
}