import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import pdfParse from 'pdf-parse';
import { spawn } from 'child_process';
import { FileWatcher } from '../types';
import { SSEManager } from './SSEManager';

export class FileService {
  private watchers: Map<string, FileWatcher> = new Map();
  private sseManager?: SSEManager;

  constructor(sseManager?: SSEManager) {
    this.sseManager = sseManager;
  }

  setSSEManager(sseManager: SSEManager) {
    this.sseManager = sseManager;
  }

  async readDirectory(folderPath: string): Promise<any[]> {
    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      
      return items.map(item => ({
        name: item.name,
        path: path.join(folderPath, item.name),
        isDirectory: item.isDirectory(),
        isFile: item.isFile(),
        size: item.isFile() ? fs.statSync(path.join(folderPath, item.name)).size : 0,
        modified: fs.statSync(path.join(folderPath, item.name)).mtime
      }));
    } catch (error) {
      console.error('Failed to read directory:', error);
      throw error;
    }
  }

  async getDefaultDirectories(): Promise<string[]> {
    const homeDir = os.homedir();
    const defaultDirs = [
      homeDir,
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Desktop'),
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'Development'),
      '/tmp',
      '/var/tmp'
    ];

    return defaultDirs.filter(dir => {
      try {
        return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });
  }

  async searchFiles(folderPath: string, query: string, extensions?: string[]): Promise<any[]> {
    try {
      const results: any[] = [];
      
      const searchRecursive = (dir: string) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory() && !item.name.startsWith('.')) {
            try {
              searchRecursive(fullPath);
            } catch {
              // Skip directories we can't read
            }
          } else if (item.isFile()) {
            const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
            const matchesExtension = !extensions || extensions.length === 0 || 
              extensions.some(ext => item.name.endsWith(ext));
            
            if (matchesQuery && matchesExtension) {
              results.push({
                name: item.name,
                path: fullPath,
                directory: dir,
                size: fs.statSync(fullPath).size,
                modified: fs.statSync(fullPath).mtime
              });
            }
          }
        }
      };

      searchRecursive(folderPath);
      return results.slice(0, 100); // Limit results
    } catch (error) {
      console.error('Failed to search files:', error);
      throw error;
    }
  }

  async canonicalizePath(filePath: string): Promise<string> {
    try {
      return fs.realpathSync(filePath);
    } catch (error) {
      return filePath;
    }
  }

  async calculateFileTokens(filePath: string): Promise<number> {
    try {
      const content = await this.readFile(filePath);
      // Simple approximation: 1 token ≈ 4 characters
      return Math.ceil(content.length / 4);
    } catch (error) {
      console.error('Failed to calculate file tokens:', error);
      return 0;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  }

  async readPdfContent(filePath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('Failed to read PDF content:', error);
      throw error;
    }
  }

  async readCsvContent(filePath: string): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data: any) => results.push(data))
          .on('end', () => {
            // Convert to formatted string
            const headers = Object.keys(results[0] || {});
            let content = headers.join(',') + '\n';
            
            for (const row of results) {
              content += headers.map(h => row[h] || '').join(',') + '\n';
            }
            
            resolve(content);
          })
          .on('error', reject);
      });
    } catch (error) {
      console.error('Failed to read CSV content:', error);
      throw error;
    }
  }

  async readXlsxContent(filePath: string): Promise<string> {
    try {
      const workbook = xlsx.readFile(filePath);
      let content = '';
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csvContent = xlsx.utils.sheet_to_csv(sheet);
        content += `Sheet: ${sheetName}\n${csvContent}\n\n`;
      }
      
      return content;
    } catch (error) {
      console.error('Failed to read XLSX content:', error);
      throw error;
    }
  }

  async getGitFileDiff(filePath: string): Promise<string | null> {
    try {
      return new Promise((resolve) => {
        const git = spawn('git', ['diff', 'HEAD', filePath], {
          cwd: path.dirname(filePath)
        });

        let diff = '';
        git.stdout.on('data', (data) => {
          diff += data.toString();
        });

        git.on('close', (code) => {
          if (code === 0 && diff.trim()) {
            resolve(diff);
          } else {
            resolve(null);
          }
        });

        git.on('error', () => {
          resolve(null);
        });
      });
    } catch (error) {
      return null;
    }
  }

  async getGitStatus(directory: string): Promise<any> {
    try {
      return new Promise((resolve) => {
        const git = spawn('git', ['status', '--porcelain'], {
          cwd: directory
        });

        let output = '';
        git.stdout.on('data', (data) => {
          output += data.toString();
        });

        git.on('close', (code) => {
          if (code === 0) {
            const files = output.split('\n')
              .filter(line => line.trim())
              .map(line => {
                const status = line.substring(0, 2);
                const filePath = line.substring(3);
                return { status, path: filePath };
              });
            resolve({ files });
          } else {
            resolve({ files: [] });
          }
        });

        git.on('error', () => {
          resolve({ files: [] });
        });
      });
    } catch (error) {
      return { files: [] };
    }
  }

  async startWatchDirectory(folderPath: string): Promise<void> {
    try {
      // Stop existing watcher if any
      await this.stopWatchDirectory(folderPath);

      const watcher = chokidar.watch(folderPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('all', (event, filePath) => {
        console.log(`📁 File system change: ${event} ${filePath}`);
        if (this.sseManager) {
          this.sseManager.broadcastFileSystemChange(filePath, event);
        }
      });

      this.watchers.set(folderPath, {
        path: folderPath,
        watcher
      });

      console.log(`👁️ Started watching directory: ${folderPath}`);
    } catch (error) {
      console.error('Failed to start directory watcher:', error);
      throw error;
    }
  }

  async stopWatchDirectory(folderPath: string): Promise<void> {
    try {
      const watcher = this.watchers.get(folderPath);
      if (watcher) {
        await watcher.watcher.close();
        this.watchers.delete(folderPath);
        console.log(`👁️ Stopped watching directory: ${folderPath}`);
      }
    } catch (error) {
      console.error('Failed to stop directory watcher:', error);
    }
  }

  shutdown() {
    console.log('🔄 Shutting down file watchers...');
    for (const [path, watcher] of this.watchers.entries()) {
      try {
        watcher.watcher.close();
      } catch (error) {
        console.error(`Failed to close watcher for ${path}:`, error);
      }
    }
    this.watchers.clear();
  }
}