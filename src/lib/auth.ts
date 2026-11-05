// ============================================================
// Cobranza GD — Google OAuth2 Authentication Engine
// ============================================================

import type { AuthUser } from '../types';

declare const google: any;

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('cgd_user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('cgd_token');
}

export function storeSession(user: AuthUser, token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('cgd_user', JSON.stringify(user));
  sessionStorage.setItem('cgd_token', token);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('cgd_user');
  sessionStorage.removeItem('cgd_token');
  localStorage.clear();
}

export function signOut(): void {
  const token = getStoredToken();
  if (token && typeof google !== 'undefined') {
    google.accounts.oauth2.revoke(token, () => {});
  }
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}
