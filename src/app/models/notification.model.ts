import { FieldValue, Timestamp } from '@angular/fire/firestore';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  type: 'mention' | 'teamInvite' | 'taskAssigned';
  content: string;
  issueId?: string;
  teamId?: string;
  commentId?: string;
  read: boolean;
  createdAt: Date | Timestamp | FieldValue;
}

export type NotificationType = 'mention' | 'teamInvite' | 'taskAssigned'; 