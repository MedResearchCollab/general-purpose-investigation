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

// Railway cold starts and first DB connection can exceed 10s; explicit REACT_APP_API_URL is recommended.
const API_TIMEOUT_MS = Number(process.env.REACT_APP_API_TIMEOUT_MS) || 60000;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
  withCredentials: true, // send httpOnly auth cookie with every request
});

const getRequestPath = (url?: string): string => {
  if (!url) return '';
  try {
    // Support both absolute and relative URLs from axios config
    return new URL(url, API_BASE_URL).pathname;
  } catch {
    return url;
  }
};

const shouldSkipUnauthorizedRedirect = (path: string): boolean =>
  path.endsWith('/api/auth/me') || path.endsWith('/api/auth/login');

// Handle 401: redirect to login for protected API calls only.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestPath = getRequestPath(error.config?.url);
      if (!shouldSkipUnauthorizedRedirect(requestPath)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

