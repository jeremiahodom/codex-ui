import { Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionManager';

const router = Router();

// Get all sessions
router.get('/', (req: Request, res: Response) => {
  try {
    const sessions = sessionManager.getAllSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get specific session
router.get('/:id', (req: Request, res: Response) => {
  try {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Create new session
router.post('/', (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const session = sessionManager.createSession(title);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, isActive } = req.body;
    const session = sessionManager.updateSession(req.params.id, { title, isActive });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = sessionManager.deleteSession(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get session messages
router.get('/:id/messages', (req: Request, res: Response) => {
  try {
    const messages = sessionManager.getMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export { router as sessionRoutes };