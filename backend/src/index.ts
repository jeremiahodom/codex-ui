import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { SessionManager } from './services/SessionManager';
import { ConfigService } from './services/ConfigService';
import { FileService } from './services/FileService';
import { SSEManager } from './services/SSEManager';
import { createSessionRoutes } from './routes/sessions';
import { createConfigRoutes } from './routes/config';
import { createFileRoutes } from './routes/files';

const app = express();
const server = createServer(app);

// Services
const sessionManager = new SessionManager();
const configService = new ConfigService();
const fileService = new FileService();
const sseManager = new SSEManager();

// Wire up services
sessionManager.setSSSEManager(sseManager);
fileService.setSSEManager(sseManager);

// Middleware
app.use(cors({
  origin: ['http://localhost:1420', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// SSE endpoint
app.get('/api/events', sseManager.handleSSE.bind(sseManager));

// API Routes
app.use('/api/sessions', createSessionRoutes(sessionManager, sseManager));
app.use('/api/config', createConfigRoutes(configService));
app.use('/api/files', createFileRoutes(fileService, sseManager));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Codex UI Backend running on port ${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/api/events`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📤 Shutting down gracefully...');
  sessionManager.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📤 Shutting down gracefully...');
  sessionManager.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});