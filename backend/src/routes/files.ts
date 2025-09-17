import { Router } from 'express';
import { FileService } from '../services/FileService';
import { SSEManager } from '../services/SSEManager';

export function createFileRoutes(fileService: FileService, sseManager: SSEManager): Router {
  const router = Router();

  // Read directory
  router.get('/directory', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const items = await fileService.readDirectory(path);
      res.json(items);
    } catch (error) {
      console.error('Failed to read directory:', error);
      res.status(500).json({ error: 'Failed to read directory' });
    }
  });

  // Get default directories
  router.get('/default-directories', async (req, res) => {
    try {
      const directories = await fileService.getDefaultDirectories();
      res.json(directories);
    } catch (error) {
      console.error('Failed to get default directories:', error);
      res.status(500).json({ error: 'Failed to get default directories' });
    }
  });

  // Search files
  router.get('/search', async (req, res) => {
    try {
      const { path, query, extensions } = req.query;
      
      if (!path || typeof path !== 'string' || !query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Missing path or query parameter' });
      }

      const exts = extensions ? (extensions as string).split(',') : undefined;
      const results = await fileService.searchFiles(path, query, exts);
      res.json(results);
    } catch (error) {
      console.error('Failed to search files:', error);
      res.status(500).json({ error: 'Failed to search files' });
    }
  });

  // Canonicalize path
  router.get('/canonicalize', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const canonicalPath = await fileService.canonicalizePath(path);
      res.json({ path: canonicalPath });
    } catch (error) {
      console.error('Failed to canonicalize path:', error);
      res.status(500).json({ error: 'Failed to canonicalize path' });
    }
  });

  // Calculate file tokens
  router.get('/tokens', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const tokens = await fileService.calculateFileTokens(path);
      res.json({ tokens });
    } catch (error) {
      console.error('Failed to calculate file tokens:', error);
      res.status(500).json({ error: 'Failed to calculate file tokens' });
    }
  });

  // Read file
  router.get('/content', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const content = await fileService.readFile(path);
      res.json({ content });
    } catch (error) {
      console.error('Failed to read file:', error);
      res.status(500).json({ error: 'Failed to read file' });
    }
  });

  // Write file
  router.post('/content', async (req, res) => {
    try {
      const { path, content } = req.body;
      
      if (!path || typeof content !== 'string') {
        return res.status(400).json({ error: 'Missing path or content' });
      }

      await fileService.writeFile(path, content);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to write file:', error);
      res.status(500).json({ error: 'Failed to write file' });
    }
  });

  // Read PDF content
  router.get('/pdf-content', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const content = await fileService.readPdfContent(path);
      res.json({ content });
    } catch (error) {
      console.error('Failed to read PDF content:', error);
      res.status(500).json({ error: 'Failed to read PDF content' });
    }
  });

  // Read CSV content
  router.get('/csv-content', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const content = await fileService.readCsvContent(path);
      res.json({ content });
    } catch (error) {
      console.error('Failed to read CSV content:', error);
      res.status(500).json({ error: 'Failed to read CSV content' });
    }
  });

  // Read XLSX content
  router.get('/xlsx-content', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const content = await fileService.readXlsxContent(path);
      res.json({ content });
    } catch (error) {
      console.error('Failed to read XLSX content:', error);
      res.status(500).json({ error: 'Failed to read XLSX content' });
    }
  });

  // Get git file diff
  router.get('/git-diff', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const diff = await fileService.getGitFileDiff(path);
      res.json({ diff });
    } catch (error) {
      console.error('Failed to get git diff:', error);
      res.status(500).json({ error: 'Failed to get git diff' });
    }
  });

  // Get git status
  router.get('/git-status', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      const status = await fileService.getGitStatus(path);
      res.json(status);
    } catch (error) {
      console.error('Failed to get git status:', error);
      res.status(500).json({ error: 'Failed to get git status' });
    }
  });

  // Start watching directory
  router.post('/watch', async (req, res) => {
    try {
      const { path } = req.body;
      
      if (!path) {
        return res.status(400).json({ error: 'Missing path' });
      }

      await fileService.startWatchDirectory(path);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to start watching directory:', error);
      res.status(500).json({ error: 'Failed to start watching directory' });
    }
  });

  // Stop watching directory
  router.delete('/watch', async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
      }

      await fileService.stopWatchDirectory(path);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to stop watching directory:', error);
      res.status(500).json({ error: 'Failed to stop watching directory' });
    }
  });

  return router;
}