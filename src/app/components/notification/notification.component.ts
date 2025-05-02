import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
    private cdr: ChangeDetectorRef
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

  toggleNotifications(): void {
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

  navigateToNotification(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.issueId) {
      this.router.navigate(['/issues', notification.issueId]);
    }
    this.showNotifications = false;
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