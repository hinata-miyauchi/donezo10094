export interface Comment {
  id: string;
  issueId: string;
  content: string;
  authorId: string;
  createdAt: Date;
  mentions: string[];
}

export interface MentionUser {
  id: string;
  displayName: string;
  photoURL?: string;
} 