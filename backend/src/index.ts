import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { sessionRoutes } from './routes/sessions';
import { chatRoutes } from './routes/chat';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:1420',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

export default app;