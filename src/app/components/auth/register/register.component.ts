import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          アカウント登録
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          既にアカウントをお持ちの方は
          <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
            こちらからログイン
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label for="displayName" class="block text-sm font-medium text-gray-700">
                表示名
              </label>
              <div class="mt-1">
                <input id="displayName" type="text" formControlName="displayName" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
              <p *ngIf="registerForm.get('displayName')?.errors?.['required'] && registerForm.get('displayName')?.touched"
                class="mt-2 text-sm text-red-600">
                表示名は必須です
              </p>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <div class="mt-1">
                <input id="email" type="email" formControlName="email" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
              <p *ngIf="registerForm.get('email')?.errors?.['required'] && registerForm.get('email')?.touched"
                class="mt-2 text-sm text-red-600">
                メールアドレスは必須です
              </p>
              <p *ngIf="registerForm.get('email')?.errors?.['email'] && registerForm.get('email')?.touched"
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
              <p *ngIf="registerForm.get('password')?.errors?.['required'] && registerForm.get('password')?.touched"
                class="mt-2 text-sm text-red-600">
                パスワードは必須です
              </p>
              <p *ngIf="registerForm.get('password')?.errors?.['minlength'] && registerForm.get('password')?.touched"
                class="mt-2 text-sm text-red-600">
                パスワードは6文字以上必要です
              </p>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                パスワード（確認用）
              </label>
              <div class="mt-1 relative">
                <input [type]="showConfirmPassword ? 'text' : 'password'" id="confirmPassword" formControlName="confirmPassword" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <button type="button" 
                  (click)="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg *ngIf="!showConfirmPassword" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg *ngIf="showConfirmPassword" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
              <p *ngIf="registerForm.get('confirmPassword')?.errors?.['required'] && registerForm.get('confirmPassword')?.touched"
                class="mt-2 text-sm text-red-600">
                パスワード（確認用）は必須です
              </p>
              <p *ngIf="registerForm.errors?.['passwordMismatch'] && registerForm.get('confirmPassword')?.touched"
                class="mt-2 text-sm text-red-600">
                パスワードが一致しません
              </p>
            </div>

            <div>
              <button type="submit" [disabled]="registerForm.invalid || isSubmitting"
                [class.opacity-50]="registerForm.invalid || isSubmitting"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                {{ isSubmitting ? '登録中...' : '登録する' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      displayName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // パスワード一致のバリデーター
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit() {
    if (this.registerForm.invalid || this.isSubmitting) {
      return;
    }

    try {
      this.isSubmitting = true;
      const { email, password, displayName } = this.registerForm.value;

      // バリデーションチェック
      if (password.length < 6) {
        throw new Error('パスワードは6文字以上である必要があります');
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('有効なメールアドレスを入力してください');
      }
      if (!displayName.trim()) {
        throw new Error('表示名を入力してください');
      }

      await this.authService.register(email, password, displayName);
      // 登録完了を待ってから遷移
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.router.navigate(['/issues'], { replaceUrl: true });
    } catch (error: any) {
      console.error('登録エラー:', error);
      let errorMessage = '登録に失敗しました。';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '有効なメールアドレスを入力してください';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'メール/パスワードでの登録が無効になっています';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードが弱すぎます。6文字以上の強力なパスワードを使用してください';
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }
} 