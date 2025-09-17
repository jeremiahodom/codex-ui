const SSE_ENDPOINT = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:8080/api/events' 
  : 'http://localhost:8080/api/events';

type EventCallback<T = any> = (event: { payload: T }) => void;
type UnlistenFn = () => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempt = 0;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(SSE_ENDPOINT, {
          withCredentials: true
        });

        this.eventSource.onopen = () => {
          console.log('🔗 SSE connected to backend');
          this.reconnectAttempt = 0;
          resolve();
        };

        this.eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error);
          this.handleReconnect();
        };

        this.eventSource.onmessage = (event) => {
          console.log('📨 SSE message:', event);
        };

        // Handle specific event types
        this.eventSource.addEventListener('connected', (event) => {
          console.log('✅ SSE connection confirmed:', JSON.parse(event.data));
        });

        this.eventSource.addEventListener('codex-events', (event) => {
          const data = JSON.parse(event.data);
          this.notifyListeners('codex-events', data);
        });

        this.eventSource.addEventListener('codex-raw-events', (event) => {
          const data = JSON.parse(event.data);
          this.notifyListeners('codex-raw-events', data);
        });

        this.eventSource.addEventListener('fs_change', (event) => {
          const data = JSON.parse(event.data);
          this.notifyListeners('fs_change', data);
        });

      } catch (error) {
        console.error('Failed to connect SSE:', error);
        reject(error);
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempt++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
    
    console.log(`🔄 Attempting to reconnect SSE in ${delay}ms (attempt ${this.reconnectAttempt})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.disconnect();
      this.connect().catch(console.error);
    }, delay);
  }

  private notifyListeners<T>(eventType: string, data: T) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback({ payload: data });
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }
  }

  listen<T>(eventType: string, callback: EventCallback<T>): Promise<UnlistenFn> {
    return new Promise((resolve) => {
      // Ensure we're connected
      if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
        this.connect().then(() => {
          this.addListener(eventType, callback);
          resolve(() => this.removeListener(eventType, callback));
        }).catch(console.error);
      } else {
        this.addListener(eventType, callback);
        resolve(() => this.removeListener(eventType, callback));
      }
    });
  }

  private addListener<T>(eventType: string, callback: EventCallback<T>) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  private removeListener<T>(eventType: string, callback: EventCallback<T>) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.listeners.clear();
    console.log('🔌 SSE disconnected');
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Global SSE client instance
const sseClient = new SSEClient();

// Auto-connect when the module loads
sseClient.connect().catch(console.error);

// Helper function to replace Tauri's listen
export async function listen<T>(eventType: string, callback: EventCallback<T>): Promise<UnlistenFn> {
  return sseClient.listen(eventType, callback);
}

// Export for manual control
export { sseClient };

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sseClient.disconnect();
  });
}