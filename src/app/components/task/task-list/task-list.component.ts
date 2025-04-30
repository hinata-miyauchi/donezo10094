import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-list-container">
      <h2>タスク一覧</h2>
      <!-- タスクリストの実装をここに追加 -->
    </div>
  `,
  styles: [`
    .task-list-container {
      padding: 20px;
    }
  `]
})
export class TaskListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  constructor() {}

  ngOnInit(): void {
    // サブスクリプションを配列に追加する例
    // this.subscriptions.push(
    //   this.someService.getData().subscribe(data => {
    //     // データ処理
    //   })
    // );
  }

  ngOnDestroy(): void {
    // すべてのサブスクリプションを解除
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe();
      }
    });
  }
} 