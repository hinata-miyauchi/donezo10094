import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Comment, MentionUser } from '../../interfaces/comment.interface';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TeamService } from '../../services/team.service';
import { IssueService } from '../../services/issue.service';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { NotificationService } from '../../services/notification.service';

interface CommentWithAuthor extends Comment {
  author?: {
    displayName: string;
    photoURL?: string;
  };
}

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  providers: [DatePipe]
})
export class CommentComponent implements OnInit {
  @Input() issueId!: string;
  @Input() issueTitle!: string;
  @Input() teamId!: string;
  @ViewChild('commentTextarea') commentTextarea!: ElementRef;
  
  comments: CommentWithAuthor[] = [];
  commentControl = new FormControl('');
  showMentionList = false;
  mentionUsers: MentionUser[] = [];
  filteredUsers: MentionUser[] = [];
  cursorPosition = 0;
  mentionStartIndex = -1;
  currentSearchText = '';
  loading = true;
  error: string | null = null;
  currentUser: User | null = null;
  users: MentionUser[] = [];
  placeholderText = '@でメンション、Enterで送信、Shift+Enterで改行';

  constructor(
    private teamService: TeamService,
    private issueService: IssueService,
    private authService: AuthService,
    private datePipe: DatePipe,
    private notificationService: NotificationService
  ) {
    // 現在のユーザー情報を取得
    this.authService.user$.subscribe(user => {
      if (user) {
        this.currentUser = {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          bio: '',
          emailNotifications: true,
          taskReminders: true,
          teams: []
        };
      } else {
        this.currentUser = null;
      }
    });
  }

  ngOnInit() {
    console.log('=== CommentComponent: ngOnInit ===');
    this.loadProjectMembers();
    this.setupMentionDetection();
    this.loadComments();
  }

  private async loadComments() {
    try {
      this.loading = true;
      this.error = null;
      const comments = await this.issueService.getComments(this.issueId);
      this.comments = await Promise.all(comments.map(async comment => {
        const author = await this.authService.getUserById(comment.authorId);
        return {
          ...comment,
          author: author ? {
            displayName: author.displayName || '不明なユーザー',
            photoURL: author.photoURL
          } : undefined
        };
      }));
    } catch (error) {
      console.error('コメントの読み込みに失敗しました:', error);
      this.error = 'コメントの読み込みに失敗しました。';
    } finally {
      this.loading = false;
    }
  }

  private async loadProjectMembers() {
    console.log('=== プロジェクトメンバーの読み込み開始 ===');
    console.log('イシューID:', this.issueId);
    console.log('現在のユーザー:', this.currentUser);
    
    try {
      const issue = await this.issueService.getIssue(this.issueId);
      console.log('イシュー情報:', issue);

      if (!issue?.teamId) {
        console.error('チームIDが見つかりません');
        return;
      }

      console.log('チームメンバーの取得開始 - チームID:', issue.teamId);
      const members = await this.teamService.getTeamMembers(issue.teamId);
      console.log('取得されたチームメンバー:', members);

      this.mentionUsers = members.map(member => ({
        id: member.uid,
        displayName: member.displayName,
        photoURL: member.photoURL
      }));
      
      console.log('メンション可能なユーザー:', this.mentionUsers);
      this.users = [...this.mentionUsers];
      console.log('=== プロジェクトメンバーの読み込み完了 ===');
    } catch (error) {
      console.error('プロジェクトメンバーの読み込みに失敗しました:', error);
    }
  }

  private setupMentionDetection() {
    this.commentControl.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(() => {
      this.checkForMention();
    });
  }

  private checkForMention() {
    const value = this.commentControl.value || '';
    const cursorPos = this.getCursorPosition();
    if (cursorPos === null) return;

    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // スペースまたは]で区切る
      if (!textAfterAt.includes(' ') && !textAfterAt.includes(']')) {
        this.currentSearchText = textAfterAt.replace(/[\[\]]/g, '');
        this.mentionStartIndex = lastAtIndex;
        this.showMentionList = true;
        this.filterUsers(this.currentSearchText);
        return;
      }
    }
    
    this.showMentionList = false;
  }

  private getCursorPosition(): number | null {
    const textarea = this.commentTextarea?.nativeElement;
    return textarea ? textarea.selectionStart : null;
  }

  onInput(event: any) {
    this.cursorPosition = event.target.selectionStart;
    this.checkForMention();
  }

  onKeydown(event: KeyboardEvent) {
    if (this.showMentionList && event.key === 'Escape') {
      this.showMentionList = false;
      event.preventDefault();
      return;
    }

    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift + Enter の場合は改行を許可
        return;
      } else {
        // Enter のみの場合は送信
        event.preventDefault();
        this.submitComment();
      }
    }
  }

  private filterUsers(searchText: string) {
    console.log('=== ユーザーフィルタリング ===');
    console.log('検索テキスト:', searchText);
    
    if (!searchText) {
      this.filteredUsers = [...this.mentionUsers];
      console.log('全ユーザーを表示:', this.filteredUsers);
      return;
    }

    const searchLower = searchText.toLowerCase();
    this.filteredUsers = this.mentionUsers.filter(user =>
      user.displayName.toLowerCase().includes(searchLower) ||
      user.id.toLowerCase().includes(searchLower)
    );
    console.log('フィルタリング結果:', this.filteredUsers);
  }

  selectUser(user: MentionUser) {
    console.log('=== ユーザー選択 ===');
    console.log('選択されたユーザー:', user);
    
    const value = this.commentControl.value || '';
    const beforeMention = value.substring(0, this.mentionStartIndex);
    const afterMention = value.substring(this.cursorPosition);
    
    // メンション形式を統一（ユーザーIDを含める）
    const newValue = `${beforeMention}@[${user.id}:${user.displayName}] ${afterMention}`;
    console.log('新しい入力値:', newValue);
    
    this.commentControl.setValue(newValue);
    
    const newPosition = this.mentionStartIndex + user.displayName.length + user.id.length + 5;
    setTimeout(() => {
      const textarea = this.commentTextarea.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    });
    
    this.showMentionList = false;
    this.mentionStartIndex = -1;
  }

  private extractMentionedUsers(content: string): MentionUser[] {
    console.log('=== メンションユーザーの抽出開始 ===');
    console.log('コメント内容:', content);
    console.log('利用可能なユーザー:', this.mentionUsers);
    
    const mentionedUsers: MentionUser[] = [];
    // メンションパターンを修正: @[userId:displayName]
    const mentionRegex = /@\[([^:]+):([^\]]+)\]/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const [_, userId, displayName] = match;
      console.log('メンション検出 - ID:', userId, 'Name:', displayName);
      
      const user = this.mentionUsers.find(u => u.id === userId);
      if (user) {
        console.log('メンションユーザーが見つかりました:', user);
        if (!mentionedUsers.some(u => u.id === user.id)) {
          mentionedUsers.push(user);
        }
      } else {
        console.log('メンションユーザーが見つかりません - ID:', userId);
      }
    }

    console.log('抽出されたメンションユーザー:', mentionedUsers);
    console.log('=== メンションユーザーの抽出終了 ===');
    return mentionedUsers;
  }

  async submitComment() {
    if (!this.currentUser) {
      console.error('ユーザーがログインしていません');
      return;
    }

    const content = this.commentControl.value;
    if (!content?.trim()) {
      console.error('コメントが空です');
      return;
    }

    try {
      const mentionedUsers = this.extractMentionedUsers(content);
      const comment = await this.issueService.addComment({
        issueId: this.issueId,
        content: content,
        authorId: this.currentUser.uid,
        mentions: mentionedUsers.map(user => user.id)
      });
      
      // メンション通知を送信
      for (const user of mentionedUsers) {
        await this.notificationService.createMentionNotification(
          user.id,
          this.issueId,
          comment.id,
          this.teamId,
          `${this.currentUser.displayName}さんがあなたをメンションしました: ${content}`
        );
      }
      
      // コメント送信後にフォームをクリアし、コメントを再読み込み
      this.commentControl.setValue('');
      await this.loadComments();
    } catch (error) {
      console.error('コメントの送信に失敗しました:', error);
      this.error = 'コメントの送信に失敗しました。';
    }
  }

  getCommentDate(date: Date): string {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 

