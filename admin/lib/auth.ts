import { AdminUser } from '@/types/auth';

export class AuthService {
  private static TOKEN_KEY = 'admin_token';
  private static USER_KEY = 'admin_user';

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static getUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  static setUser(user: AdminUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static removeUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.USER_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.removeToken();
    this.removeUser();
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
