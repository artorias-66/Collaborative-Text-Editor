import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me')
};

// Document API
export const documentAPI = {
  getDocuments: () => api.get('/documents'),
  createDocument: (data: any) => api.post('/documents', data),
  getDocument: (id: string) => api.get(`/documents/${id}`),
  updateDocument: (id: string, data: any) => api.put(`/documents/${id}`, data),
  deleteDocument: (id: string) => api.delete(`/documents/${id}`),
  shareDocument: (id: string) => api.post(`/documents/${id}/share`),
  getSharedDocument: (shareLink: string) => api.get(`/documents/share/${shareLink}`)
};

// AI API
export const aiAPI = {
  grammarCheck: (text: string) => api.post('/ai/grammar-check', { text }),
  enhance: (text: string) => api.post('/ai/enhance', { text }),
  summarize: (text: string) => api.post('/ai/summarize', { text }),
  complete: (text: string, context: string) => api.post('/ai/complete', { text, context }),
  getSuggestions: (text: string, type: string) => api.post('/ai/suggestions', { text, type }),

  // Streaming helper
  stream: async (endpoint: string, data: any, onChunk: (data: any) => void) => {
    let token = Cookies.get('token');
    if (!token) {
      token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    }

    const response = await fetch(`${API_URL}/ai${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ ...data, stream: true })
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') return; // OpenAI style, just in case
            const data = JSON.parse(jsonStr);
            onChunk(data);
          } catch (e) {
            // Partial JSON or error
          }
        }
      }
    }
  }
};

export default api;


