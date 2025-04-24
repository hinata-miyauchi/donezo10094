export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  adminId: string; // チーム作成者のUID
  members: TeamMember[];
}

export type TeamRole = 'admin' | 'member' | 'editor';

export interface TeamMember {
  uid: string;
  displayName: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface TeamMembership {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string; // 招待者のUID
  invitedUserEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
} 