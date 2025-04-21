export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department?: string;
  position?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface UserFilter {
  keyword?: string | null;
  role?: string[] | null;
  department?: string[] | null;
  isActive?: boolean | null;
}

export interface UserCredentials {
  email: string;
  password: string;
} 