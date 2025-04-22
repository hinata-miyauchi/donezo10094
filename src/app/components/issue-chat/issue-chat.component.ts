import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/chat-message.model';
import { Observable, Subscription, tap } from 'rxjs';

@Component({
  selector: 'app-issue-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-lg shadow p-4 mt-4">
      <h3 class="text-lg font-semibold mb-4">チャット</h3>
      
      <!-- メッセージ一覧 -->
      <div #messageContainer class="space-y-4 h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded">
        <ng-container *ngIf="messages$ | async as messages">
          <div *ngFor="let message of messages; trackBy: trackByFn" 
               class="flex flex-col space-y-1"
               [class.items-end]="message.senderId === currentUserId">
            <div class="flex items-center space-x-2"
                 [class.flex-row-reverse]="message.senderId === currentUserId">
              <div class="text-sm text-gray-600">{{ message.senderName }}</div>
              <div class="text-xs text-gray-400">
                {{ message.timestamp | date:'MM/dd HH:mm' }}
              </div>
            </div>
            <div [class.bg-blue-100]="message.senderId === currentUserId"
                 [class.bg-gray-200]="message.senderId !== currentUserId"
                 class="rounded-lg px-4 py-2 max-w-xs break-words">
              {{ message.content }}
            </div>
          </div>
        </ng-container>
      </div>

      <!-- メッセージ入力フォーム -->
      <div class="flex space-x-2">
        <input type="text" 
               [(ngModel)]="newMessage" 
               (keyup.enter)="sendMessage()"
               placeholder="メッセージを入力..."
               class="flex-1 rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
        <button (click)="sendMessage()"
                [disabled]="!newMessage.trim()"
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          送信
        </button>
      </div>
    </div>
  `
})
export class IssueChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() issueId!: string;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  messages$!: Observable<ChatMessage[]>;
  newMessage = '';
  private subscription?: Subscription;
  
  // TODO: 認証機能実装後に実際のユーザーIDを使用
  currentUserId = 'system';
  currentUserName = 'システム';

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('IssueChatComponent initialized with issueId:', this.issueId);
    if (!this.issueId) {
      console.error('issueId is required for IssueChatComponent');
      return;
    }

    this.messages$ = this.chatService.getMessages(this.issueId).pipe(
      tap(messages => {
        console.log('Received messages:', messages);
        this.scrollToBottom();
        this.cdr.detectChanges();
      })
    );

    // メッセージの購読を設定
    this.subscription = this.messages$.subscribe();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  trackByFn(index: number, item: ChatMessage): string {
    return item.id || `${item.issueId}-${index}`;
  }

  private scrollToBottom(): void {
    try {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.issueId) return;

    try {
      await this.chatService.sendMessage({
        issueId: this.issueId,
        senderId: this.currentUserId,
        senderName: this.currentUserName,
        content: this.newMessage.trim()
      });

      this.newMessage = '';
      this.scrollToBottom();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('メッセージの送信に失敗しました:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    }
  }
} 