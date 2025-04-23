import { TeamMembership } from './team.model';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  isEmailVerified: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio: string;
  emailNotifications: boolean;
  taskReminders: boolean;
  teams: TeamMembership[];
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends UserProfile {
  id: string;
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