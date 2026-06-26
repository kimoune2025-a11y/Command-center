import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Auth API
export const authAPI = {
  login: (data) => axios.post(`${API}/auth/login`, data),
  register: (data) => axios.post(`${API}/auth/register`, data),
  getMe: () => axios.get(`${API}/auth/me`),
};

// Users API (Admin only)
export const usersAPI = {
  getAll: () => axios.get(`${API}/users`),
  updateRole: (userId, role) => axios.put(`${API}/users/${userId}/role?role=${role}`),
  delete: (userId) => axios.delete(`${API}/users/${userId}`),
};

// Projects API
export const projectsAPI = {
  getAll: () => axios.get(`${API}/projects`),
  getOne: (id) => axios.get(`${API}/projects/${id}`),
  create: (data) => axios.post(`${API}/projects`, data),
  update: (id, data) => axios.put(`${API}/projects/${id}`, data),
  delete: (id) => axios.delete(`${API}/projects/${id}`),
};

// Entities API
export const entitiesAPI = {
  getAll: () => axios.get(`${API}/entities`),
  getOne: (id) => axios.get(`${API}/entities/${id}`),
  create: (data) => axios.post(`${API}/entities`, data),
  update: (id, data) => axios.put(`${API}/entities/${id}`, data),
  delete: (id) => axios.delete(`${API}/entities/${id}`),
};

// Tasks API
export const tasksAPI = {
  getAll: (projectId) => axios.get(`${API}/tasks${projectId ? `?project_id=${projectId}` : ''}`),
  getOne: (id) => axios.get(`${API}/tasks/${id}`),
  create: (data) => axios.post(`${API}/tasks`, data),
  update: (id, data) => axios.put(`${API}/tasks/${id}`, data),
  delete: (id) => axios.delete(`${API}/tasks/${id}`),
};

// Finance API
export const financeAPI = {
  getAll: (projectId) => axios.get(`${API}/finance${projectId ? `?project_id=${projectId}` : ''}`),
  create: (data) => axios.post(`${API}/finance`, data),
  update: (id, data) => axios.put(`${API}/finance/${id}`, data),
  delete: (id) => axios.delete(`${API}/finance/${id}`),
};

// Contacts API
export const contactsAPI = {
  getAll: (type) => axios.get(`${API}/contacts${type ? `?type=${type}` : ''}`),
  getOne: (id) => axios.get(`${API}/contacts/${id}`),
  create: (data) => axios.post(`${API}/contacts`, data),
  update: (id, data) => axios.put(`${API}/contacts/${id}`, data),
  delete: (id) => axios.delete(`${API}/contacts/${id}`),
};

// Events API
export const eventsAPI = {
  getAll: (projectId) => axios.get(`${API}/events${projectId ? `?project_id=${projectId}` : ''}`),
  getOne: (id) => axios.get(`${API}/events/${id}`),
  create: (data) => axios.post(`${API}/events`, data),
  update: (id, data) => axios.put(`${API}/events/${id}`, data),
  delete: (id) => axios.delete(`${API}/events/${id}`),
};

// Documents API
export const documentsAPI = {
  getAll: (projectId, category) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (category) params.append('category', category);
    return axios.get(`${API}/documents?${params.toString()}`);
  },
  upload: (formData) => axios.post(`${API}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => axios.delete(`${API}/documents/${id}`),
};

// KPIs API
export const kpisAPI = {
  getAll: (category) => axios.get(`${API}/kpis${category ? `?category=${category}` : ''}`),
  create: (data) => axios.post(`${API}/kpis`, data),
  update: (id, data) => axios.put(`${API}/kpis/${id}`, data),
  delete: (id) => axios.delete(`${API}/kpis/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => axios.get(`${API}/dashboard/stats`),
};

export default {
  auth: authAPI,
  users: usersAPI,
  projects: projectsAPI,
  entities: entitiesAPI,
  tasks: tasksAPI,
  finance: financeAPI,
  contacts: contactsAPI,
  events: eventsAPI,
  documents: documentsAPI,
  kpis: kpisAPI,
  dashboard: dashboardAPI,
};
