import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { TeamService } from '../../services/team.service';
import { ChatMessage } from '../../models/chat-message.model';
import { TeamMember } from '../../models/team.model';
import { Observable, Subscription, tap, BehaviorSubject } from 'rxjs';
import { OverlayModule } from '@angular/cdk/overlay';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-issue-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-lg shadow p-4 mt-4">
      <h3 class="text-lg font-semibold mb-4">コメント</h3>
      
      <!-- メッセージ一覧 -->
      <div #messageContainer class="space-y-4 h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded">
        <ng-container *ngIf="(messages$ | async) as messages">
          <div *ngFor="let message of messages; trackBy: trackByFn" 
               class="flex flex-col space-y-1"
               [class.items-end]="message.senderId === currentUserId">
            <div class="flex items-center space-x-2"
                 [class.flex-row-reverse]="message.senderId === currentUserId">
              <div class="flex items-center space-x-2">
                <img [src]="getUserPhotoURL(message)"
                     [alt]="message.senderName"
                     class="w-6 h-6 rounded-full">
                <div class="text-sm font-medium text-gray-700">{{ message.senderName }}</div>
              </div>
              <div class="text-xs text-gray-400">
                {{ message.timestamp | date:'yyyy/MM/dd HH:mm' }}
              </div>
            </div>
            <div [class.bg-blue-100]="message.senderId === currentUserId"
                 [class.bg-gray-200]="message.senderId !== currentUserId"
                 class="rounded-lg px-4 py-2 max-w-xs break-words whitespace-pre-line">
              <span [innerHTML]="formatMessageWithMentions(message.content)"></span>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- メッセージ入力フォーム -->
      <div class="flex flex-col relative">
        <textarea
          [(ngModel)]="newMessage" 
          (keydown)="onKeyDown($event)"
          (input)="onInputChange($event)"
          placeholder="コメントを入力... (@でメンション、Enterで送信、Shift+Enterで改行)"
          rows="3"
          class="flex-1 rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none"
        ></textarea>
        
        <!-- メンション候補リスト -->
        <div *ngIf="showMentionList$ | async"
             class="absolute bottom-[calc(100%+0.5rem)] left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
          <div *ngFor="let member of filteredMembers$ | async"
               (click)="selectMention(member)"
               class="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2">
            <img [src]="member.photoURL || '/assets/default-avatar.svg'"
                 [alt]="member.displayName"
                 class="w-6 h-6 rounded-full">
            <span>{{ member.displayName }}</span>
          </div>
        </div>

        <div class="flex justify-end mt-2">
          <button (click)="sendMessage()"
                  [disabled]="!newMessage.trim()"
                  class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            送信
          </button>
        </div>
      </div>
    </div>
  `
})
export class IssueChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() issueId!: string;
  @Input() teamId!: string;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  messages$: Observable<ChatMessage[]> = new Observable<ChatMessage[]>();
  newMessage = '';
  private subscription?: Subscription;
  currentUserId: string = '';
  currentUserName: string = '';
  currentUserPhotoURL: string = '';

  // メンション関連の状態
  private teamMembers: TeamMember[] = [];
  showMentionList$ = new BehaviorSubject<boolean>(false);
  filteredMembers$ = new BehaviorSubject<TeamMember[]>([]);
  private mentionStartIndex: number = -1;
  private mentionQuery: string = '';

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    const user = this.authService.currentUser;
    if (user) {
      this.currentUserId = user.uid;
      this.currentUserName = user.displayName || 'Unknown User';
      this.currentUserPhotoURL = user.photoURL || '/assets/default-avatar.svg';
    }
  }

  async ngOnInit() {
    console.log('IssueChatComponent initialized with issueId:', this.issueId);
    if (!this.issueId) {
      console.error('issueId is required for IssueChatComponent');
      return;
    }

    // チームメンバーの取得
    if (this.teamId) {
      try {
        this.teamMembers = await this.teamService.getTeamMembers(this.teamId);
      } catch (error) {
        console.error('チームメンバーの取得に失敗しました:', error);
      }
    }

    this.messages$ = this.chatService.getMessages(this.issueId).pipe(
      tap((messages: ChatMessage[]) => {
        console.log('Received messages:', messages);
        this.scrollToBottom();
        this.cdr.detectChanges();
      })
    );

    this.subscription = this.messages$.subscribe();
  }

  // 入力時の処理
  onInputChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPosition = textarea.selectionStart || 0;
    const textBeforeCursor = this.newMessage.slice(0, cursorPosition);
    
    // 全角または半角@の直後の文字列を検索（空白を含まない）
    const mentionMatch = textBeforeCursor.match(/[@＠]([^@＠\s]*?)$/);
    
    if (mentionMatch) {
      console.log('メンションマッチ:', mentionMatch);
      this.mentionStartIndex = mentionMatch.index!;
      this.mentionQuery = mentionMatch[1].toLowerCase();
      
      // メンバーをフィルタリング
      const filtered = this.teamMembers.filter(member =>
        member.displayName.toLowerCase().includes(this.mentionQuery)
      );
      
      console.log('フィルタリングされたメンバー:', filtered);
      this.filteredMembers$.next(filtered);
      this.showMentionList$.next(filtered.length > 0);
    } else {
      this.resetMentionState();
    }
  }

  // メンションの選択
  selectMention(member: TeamMember): void {
    if (this.mentionStartIndex >= 0) {
      const before = this.newMessage.slice(0, this.mentionStartIndex);
      const after = this.newMessage.slice(this.mentionStartIndex + this.mentionQuery.length + 1);
      // 常に半角@を使用してメンションを挿入
      this.newMessage = `${before}@${member.displayName} ${after}`;
      this.resetMentionState();
      
      // フォーカスを維持
      setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }, 0);
    }
  }

  // メンション状態のリセット
  private resetMentionState(): void {
    this.mentionStartIndex = -1;
    this.mentionQuery = '';
    this.showMentionList$.next(false);
    this.filteredMembers$.next([]);
  }

  // 既存のメソッド...
  getUserPhotoURL(message: ChatMessage): string {
    return message.senderPhotoURL || '/assets/default-avatar.svg';
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
    if (!this.newMessage.trim() || !this.issueId || !this.currentUserId || !this.teamId) return;

    try {
      await this.chatService.sendMessage({
        issueId: this.issueId,
        teamId: this.teamId,
        senderId: this.currentUserId,
        senderName: this.currentUserName,
        senderPhotoURL: this.currentUserPhotoURL,
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

  // キーダウンイベントハンドラを追加
  onKeyDown(event: KeyboardEvent): void {
    // Enterキーが押された場合
    if (event.key === 'Enter') {
      // Shiftキーが押されていない場合は送信
      if (!event.shiftKey) {
        event.preventDefault(); // デフォルトの改行を防止
        this.sendMessage();
      }
      // Shiftキーが押されている場合は改行（デフォルトの動作）
    }
  }

  // メッセージ内のメンションをハイライト表示する
  formatMessageWithMentions(content: string): SafeHtml {
    // メンションパターン（@または＠の後に空白以外の文字が続く）
    const mentionPattern = /[@＠]([^\s]+)/g;
    
    // XSS対策のためにエスケープ
    const escapedContent = this.escapeHtml(content);
    
    // メンションをハイライト表示に置換
    const formattedContent = escapedContent.replace(mentionPattern, (match, username) => {
      return `<span class="text-indigo-600 font-medium">@${username}</span>`;
    });

    // 安全なHTMLとしてマーク
    return this.sanitizer.bypassSecurityTrustHtml(formattedContent);
  }

  // HTML特殊文字をエスケープする
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 