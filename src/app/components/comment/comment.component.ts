import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Comment, MentionUser } from '../../interfaces/comment.interface';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TeamService } from '../../services/team.service';
import { IssueService } from '../../services/issue.service';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';

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
    const issue = await this.issueService.getIssue(this.issueId);
    if (issue?.teamId) {
      const members = await this.teamService.getTeamMembers(issue.teamId);
      this.mentionUsers = members.map(member => ({
        id: member.uid,
        displayName: member.displayName,
        photoURL: member.photoURL
      }));
      this.users = [...this.mentionUsers]; // usersプロパティを初期化
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
      if (!textAfterAt.includes(' ')) {
        this.currentSearchText = textAfterAt;
        this.mentionStartIndex = lastAtIndex;
        this.showMentionList = true;
        this.filterUsers(textAfterAt);
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
    if (!this.showMentionList) return;

    if (event.key === 'Escape') {
      this.showMentionList = false;
      event.preventDefault();
    }
  }

  private filterUsers(searchText: string) {
    if (!searchText) {
      this.filteredUsers = [...this.mentionUsers];
      return;
    }

    const searchLower = searchText.toLowerCase();
    this.filteredUsers = this.mentionUsers.filter(user =>
      user.displayName.toLowerCase().includes(searchLower)
    );
  }

  selectUser(user: MentionUser) {
    const value = this.commentControl.value || '';
    const beforeMention = value.substring(0, this.mentionStartIndex);
    const afterMention = value.substring(this.cursorPosition);
    
    const newValue = `${beforeMention}@${user.displayName} ${afterMention}`;
    this.commentControl.setValue(newValue);
    
    const newPosition = this.mentionStartIndex + user.displayName.length + 2;
    setTimeout(() => {
      const textarea = this.commentTextarea.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    });
    
    this.showMentionList = false;
    this.mentionStartIndex = -1;
  }

  async submitComment() {
    if (!this.commentControl.value) return;

    const content = this.commentControl.value;
    
    // メンションされたユーザーを抽出
    const mentionedUsers = this.extractMentionedUsers(content);
    
    // コメントを保存
    await this.saveComment(content);

    // メンションされた各ユーザーに通知を送信
    for (const user of mentionedUsers) {
      await this.notificationService.createMentionNotification(
        user.id,
        this.currentUser?.displayName || '不明なユーザー',
        content,
        this.issueId
      );
    }

    this.commentControl.reset();
  }

  private extractMentionedUsers(content: string): MentionUser[] {
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentionedUsers = new Set<MentionUser>();
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      const userId = match[2];
      const user = this.users.find((u: MentionUser) => u.id === userId);
      if (user) {
        mentionedUsers.add(user);
      }
    }

    return Array.from(mentionedUsers);
  }

  private async saveComment(content: string) {
    try {
      await this.issueService.addComment({
        issueId: this.issueId,
        content,
        mentions: this.extractMentions(content)
      });

      // コメントを再読み込み
      await this.loadComments();
    } catch (error) {
      console.error('コメントの保存に失敗しました:', error);
    }
  }

  private extractMentions(content: string): string[] {
    const mentions = new Set<string>();
    const mentionRegex = /@([^\s]+)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1];
      const user = this.mentionUsers.find(u => u.displayName === mentionedName);
      if (user) {
        mentions.add(user.id);
      }
    }

    return Array.from(mentions);
  }
} 