const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:8080/api' 
  : 'http://localhost:8080/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Session management
  async startCodexSession(sessionId: string, config: any): Promise<void> {
    await this.request('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ sessionId, config }),
    });
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    await this.request(`/sessions/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async approveExecution(sessionId: string, approvalId: string, approved: boolean): Promise<void> {
    await this.request(`/sessions/${sessionId}/approve-execution`, {
      method: 'POST',
      body: JSON.stringify({ approvalId, approved }),
    });
  }

  async approvePatch(sessionId: string, approvalId: string, approved: boolean): Promise<void> {
    await this.request(`/sessions/${sessionId}/approve-patch`, {
      method: 'POST',
      body: JSON.stringify({ approvalId, approved }),
    });
  }

  async pauseSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}/pause`, {
      method: 'POST',
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getRunninSessions(): Promise<string[]> {
    const response = await this.request<{ sessions: string[] }>('/sessions/running');
    return response.sessions;
  }

  // Configuration
  async readCodexConfig(): Promise<any[]> {
    return this.request('/config/projects');
  }

  async setProjectTrust(projectPath: string, trustLevel: string): Promise<void> {
    await this.request(`/config/projects/${encodeURIComponent(projectPath)}/trust`, {
      method: 'POST',
      body: JSON.stringify({ trustLevel }),
    });
  }

  async isVersionControlled(path: string): Promise<boolean> {
    const response = await this.request<{ isVersionControlled: boolean }>(
      `/config/projects/${encodeURIComponent(path)}/version-controlled`
    );
    return response.isVersionControlled;
  }

  async getProjectName(path: string): Promise<string> {
    const response = await this.request<{ name: string }>(
      `/config/projects/${encodeURIComponent(path)}/name`
    );
    return response.name;
  }

  async readModelProviders(): Promise<Record<string, any>> {
    return this.request('/config/providers');
  }

  async addOrUpdateModelProvider(providerName: string, provider: any): Promise<void> {
    await this.request(`/config/providers/${providerName}`, {
      method: 'PUT',
      body: JSON.stringify(provider),
    });
  }

  async readProfiles(): Promise<Record<string, any>> {
    return this.request('/config/profiles');
  }

  async addOrUpdateProfile(profileName: string, profile: any): Promise<void> {
    await this.request(`/config/profiles/${profileName}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  async deleteProfile(profileName: string): Promise<void> {
    await this.request(`/config/profiles/${profileName}`, {
      method: 'DELETE',
    });
  }

  async getProviderConfig(providerName: string): Promise<any> {
    return this.request(`/config/providers/${providerName}/config`);
  }

  async getProfileConfig(profileName: string): Promise<any> {
    return this.request(`/config/profiles/${profileName}/config`);
  }

  async updateProfileModel(profileName: string, model: string): Promise<void> {
    await this.request(`/config/profiles/${profileName}/model`, {
      method: 'PATCH',
      body: JSON.stringify({ model }),
    });
  }

  // File operations
  async readDirectory(path: string): Promise<any[]> {
    return this.request(`/files/directory?path=${encodeURIComponent(path)}`);
  }

  async getDefaultDirectories(): Promise<string[]> {
    return this.request('/files/default-directories');
  }

  async searchFiles(path: string, query: string, extensions?: string[]): Promise<any[]> {
    const params = new URLSearchParams({
      path,
      query,
      ...(extensions && { extensions: extensions.join(',') })
    });
    return this.request(`/files/search?${params}`);
  }

  async canonicalizePath(path: string): Promise<string> {
    const response = await this.request<{ path: string }>(
      `/files/canonicalize?path=${encodeURIComponent(path)}`
    );
    return response.path;
  }

  async calculateFileTokens(path: string): Promise<number> {
    const response = await this.request<{ tokens: number }>(
      `/files/tokens?path=${encodeURIComponent(path)}`
    );
    return response.tokens;
  }

  async readFile(path: string): Promise<string> {
    const response = await this.request<{ content: string }>(
      `/files/content?path=${encodeURIComponent(path)}`
    );
    return response.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.request('/files/content', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  async readPdfContent(filePath: string): Promise<string> {
    const response = await this.request<{ content: string }>(
      `/files/pdf-content?path=${encodeURIComponent(filePath)}`
    );
    return response.content;
  }

  async readCsvContent(filePath: string): Promise<string> {
    const response = await this.request<{ content: string }>(
      `/files/csv-content?path=${encodeURIComponent(filePath)}`
    );
    return response.content;
  }

  async readXlsxContent(filePath: string): Promise<string> {
    const response = await this.request<{ content: string }>(
      `/files/xlsx-content?path=${encodeURIComponent(filePath)}`
    );
    return response.content;
  }

  async getGitFileDiff(filePath: string): Promise<string | null> {
    const response = await this.request<{ diff: string | null }>(
      `/files/git-diff?path=${encodeURIComponent(filePath)}`
    );
    return response.diff;
  }

  async getGitStatus(path: string): Promise<any> {
    return this.request(`/files/git-status?path=${encodeURIComponent(path)}`);
  }

  async startWatchDirectory(folderPath: string): Promise<void> {
    await this.request('/files/watch', {
      method: 'POST',
      body: JSON.stringify({ path: folderPath }),
    });
  }

  async stopWatchDirectory(folderPath: string): Promise<void> {
    await this.request(`/files/watch?path=${encodeURIComponent(folderPath)}`, {
      method: 'DELETE',
    });
  }

  // Additional methods that may be needed
  async checkCodexVersion(): Promise<string> {
    // Implementation depends on backend endpoint
    return 'v1.0.0';
  }

  async loadSessionsFromDisk(): Promise<any[]> {
    // Implementation depends on backend endpoint
    return [];
  }

  async deleteSessionFile(filePath: string): Promise<void> {
    // Implementation depends on backend endpoint
  }

  async getLatestSessionId(): Promise<string | null> {
    // Implementation depends on backend endpoint
    return null;
  }

  async getSessionFiles(): Promise<string[]> {
    // Implementation depends on backend endpoint
    return [];
  }

  async readSessionFile(filePath: string): Promise<string> {
    // Implementation depends on backend endpoint
    return '';
  }

  async readHistoryFile(): Promise<string> {
    // Implementation depends on backend endpoint
    return '';
  }

  async findRolloutPathForSession(sessionUuid: string): Promise<string | null> {
    // Implementation depends on backend endpoint
    return null;
  }
}

export const apiClient = new ApiClient();

// Helper function to replace Tauri's invoke
export async function invoke<T = any>(command: string, payload?: any): Promise<T> {
  // Map Tauri commands to API client methods
  switch (command) {
    case 'start_codex_session':
      return apiClient.startCodexSession(payload.sessionId, payload.config) as T;
    
    case 'send_message':
      return apiClient.sendMessage(payload.sessionId, payload.message) as T;
    
    case 'approve_execution':
      return apiClient.approveExecution(payload.sessionId, payload.approvalId, payload.approved) as T;
    
    case 'approve_patch':
      return apiClient.approvePatch(payload.sessionId, payload.approvalId, payload.approved) as T;
    
    case 'pause_session':
      return apiClient.pauseSession(payload.sessionId) as T;
    
    case 'close_session':
      return apiClient.closeSession(payload.sessionId) as T;
    
    case 'get_running_sessions':
      return apiClient.getRunninSessions() as T;
    
    case 'read_codex_config':
      return apiClient.readCodexConfig() as T;
    
    case 'set_project_trust':
      return apiClient.setProjectTrust(payload.path, payload.trustLevel) as T;
    
    case 'is_version_controlled':
      return apiClient.isVersionControlled(payload.path) as T;
    
    case 'get_project_name':
      return apiClient.getProjectName(payload.path) as T;
    
    case 'read_model_providers':
      return apiClient.readModelProviders() as T;
    
    case 'add_or_update_model_provider':
      return apiClient.addOrUpdateModelProvider(payload.providerName, payload.provider) as T;
    
    case 'read_profiles':
      return apiClient.readProfiles() as T;
    
    case 'add_or_update_profile':
      return apiClient.addOrUpdateProfile(payload.profileName, payload.profile) as T;
    
    case 'delete_profile':
      return apiClient.deleteProfile(payload.profileName) as T;
    
    case 'get_provider_config':
      return apiClient.getProviderConfig(payload.providerName) as T;
    
    case 'get_profile_config':
      return apiClient.getProfileConfig(payload.profileName) as T;
    
    case 'update_profile_model':
      return apiClient.updateProfileModel(payload.profileName, payload.model) as T;
    
    case 'read_directory':
      return apiClient.readDirectory(payload.folderPath) as T;
    
    case 'get_default_directories':
      return apiClient.getDefaultDirectories() as T;
    
    case 'search_files':
      return apiClient.searchFiles(payload.folderPath, payload.query, payload.extensions) as T;
    
    case 'canonicalize_path':
      return apiClient.canonicalizePath(payload.path) as T;
    
    case 'calculate_file_tokens':
      return apiClient.calculateFileTokens(payload.filePath) as T;
    
    case 'read_file':
      return apiClient.readFile(payload.filePath) as T;
    
    case 'write_file':
      return apiClient.writeFile(payload.filePath, payload.content) as T;
    
    case 'read_pdf_content':
      return apiClient.readPdfContent(payload.filePath) as T;
    
    case 'read_csv_content':
      return apiClient.readCsvContent(payload.filePath) as T;
    
    case 'read_xlsx_content':
      return apiClient.readXlsxContent(payload.filePath) as T;
    
    case 'get_git_file_diff':
      return apiClient.getGitFileDiff(payload.filePath) as T;
    
    case 'get_git_status':
      return apiClient.getGitStatus(payload.path) as T;
    
    case 'start_watch_directory':
      return apiClient.startWatchDirectory(payload.folderPath) as T;
    
    case 'stop_watch_directory':
      return apiClient.stopWatchDirectory(payload.folderPath) as T;
    
    case 'check_codex_version':
      return apiClient.checkCodexVersion() as T;
    
    case 'load_sessions_from_disk':
      return apiClient.loadSessionsFromDisk() as T;
    
    case 'delete_session_file':
      return apiClient.deleteSessionFile(payload.filePath) as T;
    
    case 'get_latest_session_id':
      return apiClient.getLatestSessionId() as T;
    
    case 'get_session_files':
      return apiClient.getSessionFiles() as T;
    
    case 'read_session_file':
      return apiClient.readSessionFile(payload.filePath) as T;
    
    case 'read_history_file':
      return apiClient.readHistoryFile() as T;
    
    case 'find_rollout_path_for_session':
      return apiClient.findRolloutPathForSession(payload.sessionUuid) as T;
    
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}