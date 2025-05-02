import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot,
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { NotificationService } from './notification.service';
import { TeamService } from './team.service';

interface SendMessageParams extends Omit<ChatMessage, 'id' | 'timestamp'> {
  teamId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly COLLECTION_NAME = 'chat-messages';
  private firestore: Firestore = inject(Firestore);

  constructor(
    private notificationService: NotificationService,
    private teamService: TeamService
  ) {}

  // メッセージ内のメンションを検出して通知を作成
  private async handleMentions(
    content: string,
    teamId: string,
    issueId: string,
    messageId: string,
    senderName: string
  ): Promise<void> {
    console.log('Checking for mentions in message:', content);
    
    // メンションパターン（@または＠の後に空白以外の文字が続く）
    const mentionPattern = /[@＠]([^\s]+)/g;
    const matches = content.matchAll(mentionPattern);
    const mentionedUsers = new Set<string>(); // 重複を防ぐためにSetを使用

    // チームメンバーを取得
    try {
      const teamMembers = await this.teamService.getTeamMembers(teamId);
      console.log('Team members:', teamMembers);

      // 各メンションに対して処理
      for (const match of matches) {
        const username = match[1];
        console.log('Found mention:', username);

        // メンションされたユーザーを探す
        const mentionedMember = teamMembers.find(
          member => member.displayName === username
        );

        if (mentionedMember && !mentionedUsers.has(mentionedMember.uid)) {
          mentionedUsers.add(mentionedMember.uid);
          console.log('Creating notification for:', mentionedMember.displayName);

          await this.notificationService.createMentionNotification(
            mentionedMember.uid,
            issueId,
            messageId,
            teamId,
            `${senderName}さんがあなたをメンションしました: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
          );
        }
      }
    } catch (error) {
      console.error('Error handling mentions:', error);
    }
  }

  // 特定の課題に関するメッセージを取得
  getMessages(issueId: string): Observable<ChatMessage[]> {
    console.log('Getting messages for issueId:', issueId);
    const messagesRef = collection(this.firestore, this.COLLECTION_NAME);
    const q = query(
      messagesRef,
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
            senderPhotoURL: data['senderPhotoURL'],
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
  async sendMessage(message: SendMessageParams): Promise<void> {
    console.log('Sending message:', message);
    try {
      const messagesRef = collection(this.firestore, this.COLLECTION_NAME);
      const messageData = {
        issueId: message.issueId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderPhotoURL: message.senderPhotoURL,
        content: message.content,
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(messagesRef, messageData);
      console.log('Message sent successfully with ID:', docRef.id);

      // メンションを含む場合は通知を作成
      if (message.content.includes('@') || message.content.includes('＠')) {
        console.log('Message contains mentions, processing...');
        await this.handleMentions(
          message.content,
          message.teamId,
          message.issueId,
          docRef.id,
          message.senderName
        );
      }
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