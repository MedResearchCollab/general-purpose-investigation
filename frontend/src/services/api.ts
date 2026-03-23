import axios from 'axios';

const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const inferRailwayBackendUrl = (): string | null => {
  const { protocol, hostname } = window.location;
  if (!hostname.endsWith('.up.railway.app') || !hostname.includes('frontend')) {
    return null;
  }
  return `${protocol}//${hostname.replace('frontend', 'backend')}`;
};

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (isLocalHost ? 'http://localhost:8000' : inferRailwayBackendUrl() || `${window.location.protocol}//${window.location.hostname}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // send httpOnly auth cookie with every request
});

// Handle 401: redirect to login only for real API calls, not for the initial session check
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isSessionCheck = error.config?.url?.includes?.('/api/auth/me');
      if (!isSessionCheck) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

