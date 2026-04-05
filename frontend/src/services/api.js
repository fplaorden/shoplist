import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function getToken() {
  return await AsyncStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  // Lists
  getLists: () => request('/lists'),
  createList: (name) => request('/lists', { method: 'POST', body: { name } }),
  deleteList: (id) => request(`/lists/${id}`, { method: 'DELETE' }),
  getMembers: (id) => request(`/lists/${id}/members`),

  // Items
  getItems: (listId) => request(`/items/list/${listId}`),
  addItem: (body) => request('/items', { method: 'POST', body }),
  toggleItem: (id) => request(`/items/${id}/toggle`, { method: 'PATCH' }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  clearChecked: (listId) => request(`/items/list/${listId}/checked`, { method: 'DELETE' }),

  // Invitations
  createInvite: (list_id) => request('/invitations/create', { method: 'POST', body: { list_id } }),
  getInviteInfo: (token) => request(`/invitations/info/${token}`),
  acceptInvite: (token) => request(`/invitations/accept/${token}`, { method: 'POST' }),
};

export const BASE = BASE_URL;
