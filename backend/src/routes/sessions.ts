import { Router } from 'express';
import { SessionManager } from '../services/SessionManager';
import { SSEManager } from '../services/SSEManager';
import { CodexConfig } from '../types';

export function createSessionRoutes(sessionManager: SessionManager, sseManager: SSEManager): Router {
  const router = Router();

  // Start a new session
  router.post('/start', async (req, res) => {
    try {
      const { sessionId, config }: { sessionId: string; config: CodexConfig } = req.body;
      
      if (!sessionId || !config) {
        return res.status(400).json({ error: 'Missing sessionId or config' });
      }

      await sessionManager.startSession(sessionId, config);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to start session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  });

  // Send a message to a session
  router.post('/:sessionId/message', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Missing message' });
      }

      await sessionManager.sendMessage(sessionId, message);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to send message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Approve execution
  router.post('/:sessionId/approve-execution', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { approvalId, approved } = req.body;
      
      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'Missing or invalid approved flag' });
      }

      await sessionManager.approveExecution(sessionId, approvalId, approved);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to approve execution:', error);
      res.status(500).json({ error: 'Failed to approve execution' });
    }
  });

  // Approve patch
  router.post('/:sessionId/approve-patch', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { approvalId, approved } = req.body;
      
      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'Missing or invalid approved flag' });
      }

      await sessionManager.approvePatch(sessionId, approvalId, approved);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to approve patch:', error);
      res.status(500).json({ error: 'Failed to approve patch' });
    }
  });

  // Pause session
  router.post('/:sessionId/pause', async (req, res) => {
    try {
      const { sessionId } = req.params;
      await sessionManager.pauseSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to pause session:', error);
      res.status(500).json({ error: 'Failed to pause session' });
    }
  });

  // Close session
  router.delete('/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      await sessionManager.closeSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to close session:', error);
      res.status(500).json({ error: 'Failed to close session' });
    }
  });

  // Get running sessions
  router.get('/running', async (req, res) => {
    try {
      const sessions = sessionManager.getRunninSessions();
      res.json({ sessions });
    } catch (error) {
      console.error('Failed to get running sessions:', error);
      res.status(500).json({ error: 'Failed to get running sessions' });
    }
  });

  return router;
}