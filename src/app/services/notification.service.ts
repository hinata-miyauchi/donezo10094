import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  DocumentData,
  collectionData,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, of, switchMap, map } from 'rxjs';
import { Notification } from '../models/notification.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore: Firestore = inject(Firestore);

  constructor(
    private authService: AuthService
  ) {}

  private convertTimestamp(notification: DocumentData): Notification {
    if (!notification) {
      throw new Error('Notification data is undefined');
    }

    const data = notification as any;
    
    // createdAtの存在チェックと型変換
    let convertedCreatedAt: Date;
    if (data.createdAt) {
      if (data.createdAt instanceof Timestamp) {
        // Firestoreのタイムスタンプの場合
        convertedCreatedAt = data.createdAt.toDate();
      } else if (data.createdAt instanceof Date) {
        // Dateオブジェクトの場合
        convertedCreatedAt = data.createdAt;
      } else {
        // その他の場合は現在時刻を使用
        convertedCreatedAt = new Date();
      }
    } else {
      // createdAtが存在しない場合は現在時刻を使用
      convertedCreatedAt = new Date();
    }
    
    return {
      ...data,
      createdAt: convertedCreatedAt
    };
  }

  // 通知の取得
  getNotifications(): Observable<Notification[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const notificationsRef = collection(this.firestore, 'notifications');
        const q = query(
          notificationsRef,
          where('recipientId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(notifications => (notifications as DocumentData[]).map(doc => this.convertTimestamp(doc)))
        ) as Observable<Notification[]>;
      })
    );
  }

  // 未読通知の取得
  getUnreadNotifications(): Observable<Notification[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const notificationsRef = collection(this.firestore, 'notifications');
        const q = query(
          notificationsRef,
          where('recipientId', '==', user.uid),
          where('read', '==', false),
          orderBy('createdAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(notifications => (notifications as DocumentData[]).map(doc => this.convertTimestamp(doc)))
        ) as Observable<Notification[]>;
      })
    );
  }

  // メンション通知の作成
  async createMentionNotification(
    recipientId: string,
    issueId: string,
    commentId: string,
    teamId: string,
    content: string
  ): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) return;

    const notification = {
      recipientId,
      senderId: user.uid,
      senderName: user.displayName || '名前なし',
      senderPhotoURL: user.photoURL || undefined,
      type: 'mention' as const,
      content,
      issueId,
      teamId,
      commentId,
      read: false,
      createdAt: serverTimestamp()
    };

    const notificationsRef = collection(this.firestore, 'notifications');
    await addDoc(notificationsRef, notification);
  }

  // チーム招待通知の作成
  async createTeamInviteNotification(
    recipientId: string,
    teamId: string,
    teamName: string
  ): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) return;

    const notification = {
      recipientId,
      senderId: user.uid,
      senderName: user.displayName || '名前なし',
      senderPhotoURL: user.photoURL || undefined,
      type: 'teamInvite' as const,
      content: `${user.displayName || '名前なし'}さんから「${teamName}」チームへの招待が届いています`,
      teamId,
      read: false,
      createdAt: serverTimestamp()
    };

    const notificationsRef = collection(this.firestore, 'notifications');
    await addDoc(notificationsRef, notification);
  }

  // 通知を既読にする
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  }

  // 通知を削除する
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  }
} 