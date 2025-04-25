export interface Comment {
  id: string;
  issueId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  mentions: string[]; // メンションされたユーザーのID配列
}

export interface MentionUser {
  id: string;
  displayName: string;
  photoURL?: string;
} 