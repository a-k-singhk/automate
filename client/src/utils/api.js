/**
 * api.js – Fetch wrapper with JWT auth headers.
 */

const API_BASE = '/api';

/**
 * Get stored token from localStorage.
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Store token in localStorage.
 */
export function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Remove token from localStorage.
 */
export function removeToken() {
  localStorage.removeItem('token');
}

/**
 * Get stored user from localStorage.
 */
export function getStoredUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Store user in localStorage.
 */
export function setStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Remove user from localStorage.
 */
export function removeStoredUser() {
  localStorage.removeItem('user');
}

/**
 * Authenticated fetch helper.
 */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────

export async function login(username, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// ── Rooms ─────────────────────────────────────────────────────

export async function getRoomMembers(roomId) {
  return apiFetch(`/rooms/${roomId}`);
}

// ── Users ─────────────────────────────────────────────────────

export async function getUsers() {
  return apiFetch('/users');
}
