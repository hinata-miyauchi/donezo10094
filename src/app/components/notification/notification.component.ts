import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Notification } from '../../models/notification.model';
import { FieldValue, Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;
  isLoggedIn = false;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isLoggedIn = !!user;
        if (user) {
          this.loadNotifications();
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    combineLatest([
      this.notificationService.getNotifications(),
      this.notificationService.getUnreadNotifications()
    ])
    .pipe(
      takeUntil(this.destroy$),
      map(([notifications, unread]) => ({
        notifications,
        unreadCount: unread.length
      }))
    )
    .subscribe(({ notifications, unreadCount }) => {
      this.notifications = notifications;
      this.unreadCount = unreadCount;
      this.cdr.detectChanges();
    });
  }

  // ドキュメント全体のクリックを監視
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // クリックされた要素が通知コンポーネントの外部かどうかをチェック
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
      this.cdr.detectChanges();
    }
  }

  toggleNotifications(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation(); // イベントの伝播を停止
    }
    this.showNotifications = !this.showNotifications;
  }

  async markAsRead(notification: Notification): Promise<void> {
    if (!notification.read) {
      await this.notificationService.markAsRead(notification.id);
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      notification.read = true;
      this.cdr.detectChanges();
    }
  }

  async markAllAsRead(): Promise<void> {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      await this.notificationService.markAsRead(notification.id);
      notification.read = true;
    }
    this.unreadCount = 0;
    this.cdr.detectChanges();
  }

  async deleteNotification(notification: Notification, event: Event): Promise<void> {
    event.stopPropagation();
    await this.notificationService.deleteNotification(notification.id);
    this.notifications = this.notifications.filter(n => n.id !== notification.id);
    if (!notification.read) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    this.cdr.detectChanges();
  }

  async navigateToNotification(notification: Notification): Promise<void> {
    console.log('通知クリック:', notification); // デバッグ用

    try {
      // 先に通知を既読にする
      await this.markAsRead(notification);

      // 通知ドロップダウンを閉じる（遷移前に実行）
      this.showNotifications = false;
      this.cdr.detectChanges();

      let navigationSuccessful = false;

      switch (notification.type) {
        case 'mention':
          if (notification.issueId) {
            console.log('メンション通知の遷移 - Issue ID:', notification.issueId, 'Comment ID:', notification.commentId);
            navigationSuccessful = await this.router.navigate(['/issues', notification.issueId], {
              queryParams: { commentId: notification.commentId }
            });
          } else {
            console.error('メンション通知にissueIdが含まれていません');
          }
          break;

        case 'teamInvite':
          console.log('チーム招待通知の遷移');
          navigationSuccessful = await this.router.navigate(['/teams'], {
            replaceUrl: true,
            queryParamsHandling: 'preserve'
          });
          break;

        case 'taskAssigned':
          if (notification.issueId) {
            console.log('タスク割り当て通知の遷移 - Issue ID:', notification.issueId);
            navigationSuccessful = await this.router.navigate(['/issues', notification.issueId]);
          } else {
            console.error('タスク割り当て通知にissueIdが含まれていません');
          }
          break;

        default:
          console.error('未知の通知タイプ:', notification.type);
          break;
      }

      if (!navigationSuccessful) {
        console.error('遷移に失敗しました');
        // 必要に応じてユーザーにエラーを表示
      } else {
        // 遷移が成功したら通知を削除
        await this.notificationService.deleteNotification(notification.id);
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.cdr.detectChanges();
      }

    } catch (error) {
      console.error('通知の遷移中にエラーが発生しました:', error);
    }
  }

  // イベントの伝播を止めるためのユーティリティメソッド
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  getNotificationTime(date: Date | Timestamp | FieldValue): string {
    if (!date) return '';
    
    let dateObj: Date;
    
    try {
      if (date instanceof Timestamp) {
        // Firestoreのタイムスタンプの場合
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        // Dateオブジェクトの場合
        dateObj = date;
      } else {
        // その他の場合は空文字列を返す
        return '';
      }

      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 60) {
        return `${minutes}分前`;
      } else if (hours < 24) {
        return `${hours}時間前`;
      } else {
        return `${days}日前`;
      }
    } catch (error) {
      console.error('Error processing date:', error);
      return '';
    }
  }
} 