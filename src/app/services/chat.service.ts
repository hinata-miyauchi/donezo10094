import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { Observable, from, map, catchError } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly COLLECTION_NAME = 'chat-messages';

  constructor(private firestore: Firestore) {}

  // 特定の課題に関するメッセージを取得
  getMessages(issueId: string): Observable<ChatMessage[]> {
    console.log('Getting messages for issueId:', issueId);
    const messagesCollection = collection(this.firestore, this.COLLECTION_NAME);
    const q = query(
      messagesCollection,
      where('issueId', '==', issueId),
      orderBy('timestamp', 'asc')
    );

    return new Observable<ChatMessage[]>(subscriber => {
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            issueId: data['issueId'],
            senderId: data['senderId'],
            senderName: data['senderName'],
            content: data['content'],
            timestamp: this.convertTimestamp(data['timestamp'])
          } as ChatMessage;
        });
        console.log('Received messages:', messages);
        subscriber.next(messages);
      }, error => {
        console.error('Error fetching messages:', error);
        subscriber.error(error);
      });

      // クリーンアップ関数を返す
      return () => unsubscribe();
    });
  }

  // 新しいメッセージを送信
  async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
    console.log('Sending message:', message);
    const messagesCollection = collection(this.firestore, this.COLLECTION_NAME);
    try {
      const messageData = {
        ...message,
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(messagesCollection, messageData);
      console.log('Message sent successfully with ID:', docRef.id);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // タイムスタンプの変換ヘルパー
  private convertTimestamp(timestamp: any): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    } else if (timestamp?.seconds) {
      return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    }
    return new Date();
  }
} 