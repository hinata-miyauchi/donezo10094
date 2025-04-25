import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const isLoggedIn = await this.authService.isLoggedIn();
    
    if (!isLoggedIn) {
      // ログインしていない場合は、ログインページにリダイレクト
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
} 