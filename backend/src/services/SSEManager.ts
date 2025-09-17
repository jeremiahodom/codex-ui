import { Request, Response } from 'express';
import { CodexEvent } from '../types';

export class SSEManager {
  private clients: Map<string, Response> = new Map();

  handleSSE(req: Request, res: Response) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });

    // Send initial connection event
    this.sendEvent(res, 'connected', { clientId, timestamp: new Date().toISOString() });

    // Store client
    this.clients.set(clientId, res);

    // Handle client disconnect
    req.on('close', () => {
      console.log(`🔌 SSE client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    req.on('error', (err) => {
      console.error(`❌ SSE client error: ${clientId}`, err);
      this.clients.delete(clientId);
    });

    console.log(`🔗 SSE client connected: ${clientId} (total: ${this.clients.size})`);
  }

  private sendEvent(res: Response, event: string, data: any) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Failed to send SSE event:', error);
    }
  }

  // Send codex events to all connected clients
  broadcastCodexEvent(event: CodexEvent) {
    const eventData = {
      id: event.id,
      msg: event.msg,
      session_id: event.session_id
    };

    this.broadcast('codex-events', eventData);
  }

  // Send raw events to all connected clients
  broadcastRawEvent(sessionId: string, data: any) {
    const eventData = {
      type: 'raw',
      session_id: sessionId,
      data: data
    };

    this.broadcast('codex-raw-events', eventData);
  }

  // Send file system change events
  broadcastFileSystemChange(path: string, kind: string) {
    const eventData = {
      path,
      kind
    };

    this.broadcast('fs_change', eventData);
  }

  private broadcast(event: string, data: any) {
    const clients = Array.from(this.clients.values());
    console.log(`📡 Broadcasting ${event} to ${clients.length} clients`);

    for (const client of clients) {
      try {
        this.sendEvent(client, event, data);
      } catch (error) {
        console.error('Failed to send event to client:', error);
        // Remove failed client
        for (const [clientId, clientRes] of this.clients.entries()) {
          if (clientRes === client) {
            this.clients.delete(clientId);
            break;
          }
        }
      }
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}