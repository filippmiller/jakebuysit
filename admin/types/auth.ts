export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'reviewer' | 'warehouse';
  requires2FA: boolean;
  lastLogin: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  requires2FA: boolean;
  tempToken?: string;
  token?: string;
  user?: AdminUser;
}

export interface Verify2FARequest {
  tempToken: string;
  code: string;
}

export interface Verify2FAResponse {
  token: string;
  user: AdminUser;
}
