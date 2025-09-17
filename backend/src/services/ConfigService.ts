import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from 'toml';
import { Project, ModelProvider, Profile } from '../types';

export class ConfigService {
  private configDir: string;
  private projectsFile: string;
  private providersFile: string;
  private profilesFile: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.codex');
    this.projectsFile = path.join(this.configDir, 'projects.toml');
    this.providersFile = path.join(this.configDir, 'providers.toml');
    this.profilesFile = path.join(this.configDir, 'profiles.toml');
    
    this.ensureConfigDir();
  }

  private ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  async readCodexConfig(): Promise<Project[]> {
    try {
      if (!fs.existsSync(this.projectsFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.projectsFile, 'utf-8');
      const config = toml.parse(content);
      
      return Object.entries(config.projects || {}).map(([path, data]: [string, any]) => ({
        path,
        trust_level: data.trust_level || 'untrusted'
      }));
    } catch (error) {
      console.error('Failed to read codex config:', error);
      return [];
    }
  }

  async setProjectTrust(projectPath: string, trustLevel: string): Promise<void> {
    try {
      let config: any = { projects: {} };
      
      if (fs.existsSync(this.projectsFile)) {
        const content = fs.readFileSync(this.projectsFile, 'utf-8');
        config = toml.parse(content);
      }

      config.projects = config.projects || {};
      config.projects[projectPath] = { trust_level: trustLevel };

      const tomlContent = this.objectToToml(config);
      fs.writeFileSync(this.projectsFile, tomlContent);
    } catch (error) {
      console.error('Failed to set project trust:', error);
      throw error;
    }
  }

  async isVersionControlled(projectPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(projectPath, '.git');
      return fs.existsSync(gitDir);
    } catch (error) {
      return false;
    }
  }

  async getProjectName(projectPath: string): Promise<string> {
    return path.basename(projectPath);
  }

  async readModelProviders(): Promise<Record<string, ModelProvider>> {
    try {
      if (!fs.existsSync(this.providersFile)) {
        return this.getDefaultProviders();
      }
      
      const content = fs.readFileSync(this.providersFile, 'utf-8');
      const config = toml.parse(content);
      
      return config.providers || this.getDefaultProviders();
    } catch (error) {
      console.error('Failed to read model providers:', error);
      return this.getDefaultProviders();
    }
  }

  async addOrUpdateModelProvider(providerName: string, provider: ModelProvider): Promise<void> {
    try {
      let config: any = { providers: {} };
      
      if (fs.existsSync(this.providersFile)) {
        const content = fs.readFileSync(this.providersFile, 'utf-8');
        config = toml.parse(content);
      }

      config.providers = config.providers || {};
      config.providers[providerName] = provider;

      const tomlContent = this.objectToToml(config);
      fs.writeFileSync(this.providersFile, tomlContent);
    } catch (error) {
      console.error('Failed to add/update model provider:', error);
      throw error;
    }
  }

  async readProfiles(): Promise<Record<string, Profile>> {
    try {
      if (!fs.existsSync(this.profilesFile)) {
        return {};
      }
      
      const content = fs.readFileSync(this.profilesFile, 'utf-8');
      const config = toml.parse(content);
      
      return config.profiles || {};
    } catch (error) {
      console.error('Failed to read profiles:', error);
      return {};
    }
  }

  async addOrUpdateProfile(profileName: string, profile: Profile): Promise<void> {
    try {
      let config: any = { profiles: {} };
      
      if (fs.existsSync(this.profilesFile)) {
        const content = fs.readFileSync(this.profilesFile, 'utf-8');
        config = toml.parse(content);
      }

      config.profiles = config.profiles || {};
      config.profiles[profileName] = profile;

      const tomlContent = this.objectToToml(config);
      fs.writeFileSync(this.profilesFile, tomlContent);
    } catch (error) {
      console.error('Failed to add/update profile:', error);
      throw error;
    }
  }

  async deleteProfile(profileName: string): Promise<void> {
    try {
      if (!fs.existsSync(this.profilesFile)) {
        return;
      }
      
      const content = fs.readFileSync(this.profilesFile, 'utf-8');
      const config = toml.parse(content);
      
      if (config.profiles && config.profiles[profileName]) {
        delete config.profiles[profileName];
        
        const tomlContent = this.objectToToml(config);
        fs.writeFileSync(this.profilesFile, tomlContent);
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  }

  async getProviderConfig(providerName: string): Promise<[ModelProvider, Profile | null] | null> {
    try {
      const providers = await this.readModelProviders();
      const provider = providers[providerName];
      
      if (!provider) {
        return null;
      }

      return [provider, null]; // Simplified for now
    } catch (error) {
      console.error('Failed to get provider config:', error);
      return null;
    }
  }

  async getProfileConfig(profileName: string): Promise<Profile | null> {
    try {
      const profiles = await this.readProfiles();
      return profiles[profileName] || null;
    } catch (error) {
      console.error('Failed to get profile config:', error);
      return null;
    }
  }

  async updateProfileModel(profileName: string, model: string): Promise<void> {
    try {
      const profile = await this.getProfileConfig(profileName);
      if (profile) {
        profile.model = model;
        await this.addOrUpdateProfile(profileName, profile);
      }
    } catch (error) {
      console.error('Failed to update profile model:', error);
      throw error;
    }
  }

  private getDefaultProviders(): Record<string, ModelProvider> {
    return {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
      },
      anthropic: {
        name: 'Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
      },
      ollama: {
        name: 'Ollama',
        models: ['llama2', 'codellama', 'mistral']
      }
    };
  }

  private objectToToml(obj: any): string {
    // Simple TOML serialization - in production you'd use a proper TOML library
    let result = '';
    
    for (const [section, content] of Object.entries(obj)) {
      if (typeof content === 'object' && content !== null) {
        for (const [key, value] of Object.entries(content as any)) {
          result += `[${section}.${key}]\n`;
          if (typeof value === 'object' && value !== null) {
            for (const [prop, val] of Object.entries(value as any)) {
              if (typeof val === 'string') {
                result += `${prop} = "${val}"\n`;
              } else {
                result += `${prop} = ${val}\n`;
              }
            }
          }
          result += '\n';
        }
      }
    }
    
    return result;
  }
}