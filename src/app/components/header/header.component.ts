import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Subject, takeUntil } from 'rxjs';
import { NotificationComponent } from '../notification/notification.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationComponent]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('userMenuContainer') userMenuContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  isLoggedIn = false;
  user: User | null = null;
  showUserMenu = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ユーザー認証状態の監視
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.log('認証状態の変更を検知:', user);
        this.isLoggedIn = !!user;
        this.user = user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // メニューコンテナの要素を取得
    const menuContainer = this.userMenuContainer?.nativeElement;
    
    // クリックされた要素がメニューコンテナの外部かどうかをチェック
    if (menuContainer && !menuContainer.contains(event.target)) {
      this.showUserMenu = false;
    }
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.showUserMenu = false;
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
    }
  }
} 