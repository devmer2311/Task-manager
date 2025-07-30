const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    const data = isJson ? await response.json() : await response.text();
    
    if (!response.ok) {
      const errorMessage = isJson ? (data.message || data.error || 'An error occurred') : data;
      throw new Error(errorMessage);
    }
    
    return data;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<T>(response);
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    
    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient(`${API_BASE_URL}/api`);

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post<{ token: string; user: any }>('/auth/login', credentials),
  
  getCurrentUser: () =>
    api.get<any>('/auth/me'),
  
  refreshToken: () =>
    api.post<{ token: string }>('/auth/refresh'),
};

// Agents API
export const agentsApi = {
  getAll: () =>
    api.get<any[]>('/agents'),
  
  create: (agentData: any) =>
    api.post<any>('/agents', agentData),
  
  update: (id: string, agentData: any) =>
    api.put<any>(`/agents/${id}`, agentData),
  
  delete: (id: string) =>
    api.delete(`/agents/${id}`),
};

// Tasks API
export const tasksApi = {
  getAll: () =>
    api.get<any[]>('/tasks'),
  
  create: (taskData: any) =>
    api.post<any>('/tasks', taskData),
  
  update: (id: string, taskData: any) =>
    api.put<any>(`/tasks/${id}`, taskData),
  
  getStats: () =>
    api.get<any>('/tasks/stats'),
};

// Upload API
export const uploadApi = {
  uploadFile: (file: File) =>
    api.uploadFile<any>('/upload', file),
  
  getHistory: () =>
    api.get<any[]>('/upload/history'),
};
