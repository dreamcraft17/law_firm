import { apiBaseUrl } from './api-paths';

/** Request ke admin API: GET/POST/PUT/DELETE dengan path relative (admin/users, admin/cases/123, dll) */
export async function adminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${apiBaseUrl}/${path}`;
  const token = typeof window !== 'undefined' ? getStoredToken() : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('admin_token');
  } catch {
    return null;
  }
}
