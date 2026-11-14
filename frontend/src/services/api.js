const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('helpdesk_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    // If unauthorized, token is either invalid or session revoked
    localStorage.removeItem('helpdesk_token');
    localStorage.removeItem('helpdesk_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Sessão expirada. Faça login novamente.');
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Ocorreu um erro na requisição.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
