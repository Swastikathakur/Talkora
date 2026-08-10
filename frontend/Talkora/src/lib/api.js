import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getMe = () => api.get('/api/users/me');
export const searchUsers = (q) => api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
export const getConversations = () => api.get('/api/conversations');
export const createConversation = (participantId) =>
  api.post('/api/conversations', { participantId });
export const getMessages = (conversationId, page = 1, limit = 50) =>
  api.get(`/api/messages/${conversationId}?page=${page}&limit=${limit}`);
export const sendMessage = (conversationId, content) =>
  api.post('/api/messages', { conversationId, content });

export default api;
