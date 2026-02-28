import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  // Prefer access_token (backend issues it), fall back to legacy token key
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export default api;
