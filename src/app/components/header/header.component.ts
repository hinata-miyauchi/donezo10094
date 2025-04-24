import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit {
  @ViewChild('userMenuContainer') userMenuContainer!: ElementRef;
  
  isLoggedIn = false;
  user: User | null = null;
  showUserMenu = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.user = user;
    });
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
    event.stopPropagation(); // イベントの伝播を停止
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.closeUserMenu();
      await this.router.navigate(['/login']); // ログイン画面に遷移
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
    }
  }
} 