import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- 通知ベル -->
      <button
        (click)="toggleNotifications()"
        class="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <!-- 未読バッジ -->
        <span *ngIf="unreadCount > 0"
              class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
          {{ unreadCount }}
        </span>
      </button>

      <!-- 通知ドロップダウン -->
      <div *ngIf="showNotifications"
           class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
        <div class="py-2">
          <div *ngIf="notifications.length === 0" class="px-4 py-2 text-sm text-gray-500">
            新しい通知はありません
          </div>
          <div *ngFor="let notification of notifications"
               (click)="handleNotificationClick(notification)"
               class="px-4 py-2 hover:bg-gray-50 cursor-pointer">
            <div class="flex items-start">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ notification.senderName }}があなたをメンションしました
                </p>
                <p class="mt-1 text-sm text-gray-500">
                  {{ notification.content }}
                </p>
                <p class="mt-1 text-xs text-gray-400">
                  {{ notification.createdAt | date:'MM/dd HH:mm' }}
                </p>
              </div>
              <div *ngIf="!notification.isRead"
                   class="ml-3 flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationComponent implements OnInit {
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.notificationService.getUnreadNotifications(user.uid)
          .subscribe(notifications => {
            this.notifications = notifications;
            this.unreadCount = notifications.length;
          });
      }
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  async handleNotificationClick(notification: Notification) {
    // 通知を既読にする
    await this.notificationService.markAsRead(notification.id!);
    
    // 該当のイシューページに遷移
    this.router.navigate(['/issues', notification.issueId]);
    
    this.showNotifications = false;
  }
} 