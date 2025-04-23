import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-8">
            <a routerLink="/" class="text-xl font-bold text-gray-800">Donezo</a>
            @if (user$ | async) {
              <nav class="flex space-x-4">
                <a routerLink="/issues" 
                   routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                   [routerLinkActiveOptions]="{exact: true}"
                   class="text-gray-600 hover:text-gray-900 px-1 py-2">課題一覧</a>
                <a routerLink="/issues/new" 
                   routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                   class="text-gray-600 hover:text-gray-900 px-1 py-2">課題登録</a>
                <a routerLink="/calendar" 
                   routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                   class="text-gray-600 hover:text-gray-900 px-1 py-2">カレンダー</a>
                <a routerLink="/settings" 
                   routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                   class="text-gray-600 hover:text-gray-900 px-1 py-2">ユーザー設定</a>
              </nav>
            }
          </div>
          
          <div class="flex items-center">
            @if (user$ | async; as user) {
              <div class="flex items-center space-x-3">
                <img [src]="user.photoURL || './assets/default-avatar.svg'" 
                     alt="ユーザーアバター" 
                     class="h-8 w-8 rounded-full">
                <span class="text-sm text-gray-700">{{ user.displayName }}</span>
                <button (click)="logout()" 
                        class="text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded">
                  ログアウト
                </button>
              </div>
            } @else {
              <nav class="flex items-center space-x-4">
                <a routerLink="/login" class="text-gray-600 hover:text-gray-900">ログイン</a>
                <a routerLink="/register" class="text-gray-600 hover:text-gray-900">新規登録</a>
              </nav>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class HeaderComponent {
  user$: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.currentUser$;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  }
} 