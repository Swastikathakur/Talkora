import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Users
export const getMe = () =>
  api.get('/api/users/me');

export const searchUsers = (q) =>
  api.get(
    `/api/users/search?q=${encodeURIComponent(q)}`
  );

// Conversations
export const getConversations = () =>
  api.get('/api/conversations');

export const createConversation = (participantId) =>
  api.post('/api/conversations', {
    participantId,
  });

// Messages
export const getMessages = (
  conversationId,
  limit = 50
) =>
  api.get(
    `/api/conversations/${conversationId}/messages?limit=${limit}`
  );

export const sendMessage = (
  conversationId,
  text,
  attachments = [],
  replyTo = null
) =>
  api.post(
    `/api/conversations/${conversationId}/messages`,
    {
      text,
      attachments,
      replyTo,
    }
  );

// Message actions
export const editMessage = (
  messageId,
  text
) =>
  api.patch(`/api/messages/${messageId}`, {
    text,
  });

export const deleteMessage = (
  messageId,
  forEveryone = false
) =>
  api.delete(`/api/messages/${messageId}`, {
    params: {
      forEveryone,
    },
  });

export const addReaction = (
  messageId,
  emoji
) =>
  api.post(
    `/api/messages/${messageId}/reactions`,
    { emoji }
  );

export const removeReaction = (messageId) =>
  api.delete(
    `/api/messages/${messageId}/reactions`
  );

export const markMessageRead = (messageId) =>
  api.post(`/api/messages/${messageId}/read`);

export const markMessageDelivered = (messageId) =>
  api.post(`/api/messages/${messageId}/delivered`);

export default api;