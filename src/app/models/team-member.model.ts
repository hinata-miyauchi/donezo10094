export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'admin' | 'creator' | 'member';
  displayName?: string;
  email?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
} 