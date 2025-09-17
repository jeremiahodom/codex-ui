# Codex UI - Node.js Backend Version

A modern chat interface powered by Node.js backend with real-time streaming support via Server-Sent Events (SSE).

> **Note**: This project has been converted from a Tauri-based desktop application to a web-based application with Node.js backend, removing file tree, PDF/Excel viewers, and authentication features while keeping session and chat functionality.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Communication**: REST API + Server-Sent Events (SSE)
- **Features**: Session management, real-time chat streaming, notes

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation & Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd codex-ui
   npm install
   cd backend && npm install && cd ..
   ```

2. **Start the backend server**
   ```bash
   cd backend && npm run dev
   ```
   Backend runs on `http://localhost:3001`

3. **Start the frontend** (new terminal)
   ```bash
   npm run dev  
   ```
   Frontend runs on `http://localhost:1420`

## Features

### ✅ Implemented
- **Real-time Chat**: Send messages and receive streaming responses
- **Session Management**: Create and manage multiple chat sessions
- **SSE Streaming**: Server-Sent Events for real-time communication
- **Notes System**: Basic note-taking functionality
- **Dark/Light Theme**: Theme switching support
- **Responsive UI**: Works on different screen sizes

### ❌ Removed (as requested)
- File tree navigation
- PDF viewer
- Excel viewer
- Authentication/login system
- Tauri desktop functionality

## API Endpoints

- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get specific session
- `POST /api/chat/message` - Send message (non-streaming)
- `GET /api/chat/stream/:sessionId` - SSE endpoint for streaming chat
- `GET /api/health` - Backend health check

## Screenshots

### Main Interface
![Codex UI Main Interface](https://github.com/user-attachments/assets/1f6c322f-c006-4541-9c8d-9a768449687d)

### Working Chat with Streaming
![Working Chat Integration](https://github.com/user-attachments/assets/deaa6afd-ff36-4f73-9421-86f3ca4893e8)

## Project Structure

```
codex-ui/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── index.ts        # Server entry point
│   └── package.json
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── services/          # API client services
│   └── stores/            # State management
└── package.json
```

## Development Notes

- Session data is stored in memory (resets on server restart)
- Backend provides mock AI responses for demonstration
- CORS configured for frontend-backend communication
- Uses Zustand for state management on frontend

## Building for Production

```bash
npm run build              # Build frontend
cd backend && npm run build  # Build backend
cd backend && npm start      # Start production server
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.