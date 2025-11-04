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
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me')
};

// Document API
export const documentAPI = {
  getDocuments: () => api.get('/documents'),
  createDocument: (data) => api.post('/documents', data),
  getDocument: (id) => api.get(`/documents/${id}`),
  updateDocument: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  shareDocument: (id) => api.post(`/documents/${id}/share`),
  getSharedDocument: (shareLink) => api.get(`/documents/share/${shareLink}`)
};

// AI API
export const aiAPI = {
  grammarCheck: (text) => api.post('/ai/grammar-check', { text }),
  enhance: (text) => api.post('/ai/enhance', { text }),
  summarize: (text) => api.post('/ai/summarize', { text }),
  complete: (text, context) => api.post('/ai/complete', { text, context }),
  getSuggestions: (text, type) => api.post('/ai/suggestions', { text, type })
};

export default api;


