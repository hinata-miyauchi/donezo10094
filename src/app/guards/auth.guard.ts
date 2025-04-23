import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('AuthGuard: チェック開始');
    return this.authService.isAuthenticated().pipe(
      tap(auth => console.log('AuthGuard: 認証状態 =', auth)),
      take(1),
      map(authenticated => {
        if (!authenticated) {
          console.log('AuthGuard: 未認証のためログインページへリダイレクト');
          this.router.navigate(['/login']);
          return false;
        }
        console.log('AuthGuard: 認証済み、アクセス許可');
        return true;
      })
    );
  }
} 