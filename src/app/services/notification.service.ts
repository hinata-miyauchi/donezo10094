import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  collectionData,
  updateDoc,
  doc 
} from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Notification {
  id?: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: 'mention';
  content: string;
  issueId: string;
  isRead: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // メンション通知を作成
  async createMentionNotification(
    recipientId: string,
    senderName: string,
    content: string,
    issueId: string
  ): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    const notification: Notification = {
      recipientId,
      senderId: currentUser.uid,
      senderName,
      type: 'mention',
      content,
      issueId,
      isRead: false,
      createdAt: new Date()
    };

    const notificationsRef = collection(this.firestore, 'notifications');
    await addDoc(notificationsRef, notification);
  }

  // ユーザーの未読通知を取得
  getUnreadNotifications(userId: string): Observable<Notification[]> {
    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<Notification[]>;
  }

  // 通知を既読にする
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
  }
} 