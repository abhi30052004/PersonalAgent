export const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('PersonaAI_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Clear token if it's invalid/expired
    localStorage.removeItem('PersonaAI_token');

    // Dispatch custom event to trigger app logout
    window.dispatchEvent(new Event('auth:unauthorized'));

    throw new Error('Unauthorized');
  }

  return response;
};
