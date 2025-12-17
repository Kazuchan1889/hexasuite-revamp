// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Helper function to get full URL for API endpoints
export const getApiUrl = (path = '') => {
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
};

// Helper function to get full URL for static files (images, etc.)
export const getFileUrl = (path = '') => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const filePath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${filePath}`;
};

// Export API_URL as both named and default export
export { API_URL };
export default API_URL;

