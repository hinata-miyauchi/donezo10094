import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private toastTimeout: number = 3000; // 3秒

  constructor() {}

  showSuccess(message: string): void {
    this.showToast(message, 'success');
  }

  showInfo(message: string): void {
    this.showToast(message, 'info');
  }

  showError(message: string): void {
    this.showToast(message, 'error');
  }

  private showToast(message: string, type: 'success' | 'info' | 'error'): void {
    // 既存のトーストを削除
    const existingToast = document.getElementById('toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 新しいトーストを作成
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '1rem';
    toast.style.right = '1rem';
    toast.style.padding = '1rem';
    toast.style.borderRadius = '0.375rem';
    toast.style.zIndex = '50';
    toast.style.minWidth = '200px';
    toast.style.textAlign = 'center';

    // タイプに応じてスタイルを設定
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#10B981';
        toast.style.color = 'white';
        break;
      case 'info':
        toast.style.backgroundColor = '#3B82F6';
        toast.style.color = 'white';
        break;
      case 'error':
        toast.style.backgroundColor = '#EF4444';
        toast.style.color = 'white';
        break;
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    // 一定時間後に削除
    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
        toast.remove();
      }
    }, this.toastTimeout);
  }
} 