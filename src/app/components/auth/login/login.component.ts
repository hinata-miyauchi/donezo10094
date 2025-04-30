import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { firstValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          ログイン
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          アカウントをお持ちでない方は
          <a routerLink="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
            こちらから登録
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <div class="mt-1">
                <input id="email" type="email" formControlName="email" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
              <p *ngIf="loginForm.get('email')?.errors?.['required'] && loginForm.get('email')?.touched"
                class="mt-2 text-sm text-red-600">
                メールアドレスは必須です
              </p>
              <p *ngIf="loginForm.get('email')?.errors?.['email'] && loginForm.get('email')?.touched"
                class="mt-2 text-sm text-red-600">
                有効なメールアドレスを入力してください
              </p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <div class="mt-1 relative">
                <input [type]="showPassword ? 'text' : 'password'" id="password" formControlName="password" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <button type="button" 
                  (click)="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg *ngIf="!showPassword" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg *ngIf="showPassword" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
              <p *ngIf="loginForm.get('password')?.errors?.['required'] && loginForm.get('password')?.touched"
                class="mt-2 text-sm text-red-600">
                パスワードは必須です
              </p>
            </div>

            <div>
              <button type="submit" [disabled]="loginForm.invalid || isLoading"
                [class.opacity-50]="loginForm.invalid || isLoading"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                {{ isLoading ? 'ログイン中...' : 'ログイン' }}
              </button>
            </div>

            <div *ngIf="errorMessage" class="mt-4">
              <p class="text-sm text-red-600">{{ errorMessage }}</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // すでにログインしている場合はホーム画面にリダイレクト
    this.authService.isAuthenticated().subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/']);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);
      
      // 認証状態の更新を待つ
      await new Promise<void>((resolve, reject) => {
        const timeoutDuration = 5000;
        let timeoutId: NodeJS.Timeout | null = null;
        let subscription: Subscription | null = null;

        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (subscription) {
            subscription.unsubscribe();
            subscription = null;
          }
        };

        // タイムアウトの設定
        timeoutId = setTimeout(() => {
          cleanup();
          resolve(); // タイムアウトした場合も正常に処理を続行
        }, timeoutDuration);

        // 認証状態の監視を開始
        subscription = this.authService.isAuthenticated().subscribe({
          next: (isAuth) => {
            if (isAuth) {
              cleanup();
              resolve();
            }
          },
          error: (error) => {
            cleanup();
            reject(error);
          }
        });
      });

      // ホーム画面に遷移
      await this.router.navigate(['/']);
    } catch (error: any) {
      console.error('ログインエラー:', error);
      this.errorMessage = this.getErrorMessage(error.code || error.message);
    } finally {
      this.isLoading = false;
    }
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'メールアドレスまたはパスワードが間違っています';
      case 'auth/wrong-password':
        return 'メールアドレスまたはパスワードが間違っています';
      case 'auth/invalid-email':
        return '有効なメールアドレスを入力してください';
      case 'auth/user-disabled':
        return 'このアカウントは無効になっています';
      case 'auth/too-many-requests':
        return 'ログイン試行回数が多すぎます。しばらく時間をおいて再度お試しください';
      default:
        return 'ログインに失敗しました。もう一度お試しください';
    }
  }
} 