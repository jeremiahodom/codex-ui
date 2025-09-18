import { Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionManager';
import { chatService } from '../services/chatService';

const router = Router();

// Send message and get response
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message, model } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Check if session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message
    const userMessage = chatService.createMessage('user', message, model);
    sessionManager.addMessage(sessionId, userMessage);

    // Generate AI response
    const responseContent = await chatService.generateResponse(message, model);
    const assistantMessage = chatService.createMessage('assistant', responseContent, model);
    sessionManager.addMessage(sessionId, assistantMessage);

    res.json({
      userMessage,
      assistantMessage,
      session: sessionManager.getSession(sessionId)
    });

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Server-Sent Events endpoint for streaming chat
router.get('/stream/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { message, model } = req.query;

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Check if session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'Session not found' })}\n\n`);
      return res.end();
    }

    if (!message) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'Message is required' })}\n\n`);
      return res.end();
    }

    // Add user message
    const userMessage = chatService.createMessage('user', message as string, model as string);
    sessionManager.addMessage(sessionId, userMessage);

    // Send user message event
    res.write(`data: ${JSON.stringify({ 
      type: 'user_message', 
      data: userMessage 
    })}\n\n`);

    // Start streaming response
    const assistantMessage = chatService.createMessage('assistant', '', model as string);
    assistantMessage.isStreaming = true;
    
    let responseContent = '';
    
    // Send initial assistant message
    res.write(`data: ${JSON.stringify({ 
      type: 'assistant_start', 
      data: assistantMessage 
    })}\n\n`);

    // Stream the response
    for await (const chunk of chatService.generateStreamingResponse(message as string, model as string)) {
      responseContent += chunk;
      assistantMessage.content = responseContent;
      
      res.write(`data: ${JSON.stringify({ 
        type: 'assistant_chunk', 
        data: { id: assistantMessage.id, content: responseContent } 
      })}\n\n`);
    }

    // Finalize the message
    assistantMessage.isStreaming = false;
    sessionManager.addMessage(sessionId, assistantMessage);

    // Send completion event
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      data: { 
        message: assistantMessage,
        session: sessionManager.getSession(sessionId)
      } 
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Error in chat stream:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: 'Failed to process message' })}\n\n`);
    res.end();
  }
});

export { router as chatRoutes };