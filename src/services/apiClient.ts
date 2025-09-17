const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response;
  }

  async get(endpoint: string): Promise<any> {
    const response = await this.fetch(endpoint);
    return response.json();
  }

  async post(endpoint: string, data: any): Promise<any> {
    const response = await this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put(endpoint: string, data: any): Promise<any> {
    const response = await this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(endpoint: string): Promise<void> {
    await this.fetch(endpoint, {
      method: 'DELETE',
    });
  }

  // Server-Sent Events connection
  createEventSource(endpoint: string): EventSource {
    const url = `${this.baseUrl}${endpoint}`;
    return new EventSource(url);
  }
}

export const apiClient = new ApiClient();