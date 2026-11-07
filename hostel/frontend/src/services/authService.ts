import api from './api';
import { User, AuthResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('msec_token', response.data.access_token);
      localStorage.setItem('msec_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(userData: Partial<User> & { password: string }): Promise<User> {
    const response = await api.post<User>('/auth/register', userData);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('msec_token');
    localStorage.removeItem('msec_user');
  },

  getSavedUser(): User | null {
    const userStr = localStorage.getItem('msec_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('msec_token');
  },
};
