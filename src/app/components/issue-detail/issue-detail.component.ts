import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import { IssueChatComponent } from '../issue-chat/issue-chat.component';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IssueChatComponent],
  template: `
    <div class="space-y-4" *ngIf="issue">
      <!-- 課題の詳細情報 -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-2xl font-bold text-gray-900">{{ issue.title }}</h2>
          <a [routerLink]="['/issues']" class="text-indigo-600 hover:text-indigo-800">一覧に戻る</a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold mb-2">基本情報</h3>
            <dl class="space-y-2">
              <div class="flex">
                <dt class="w-32 text-gray-600">課題番号:</dt>
                <dd>{{ issue.issueNumber }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">ステータス:</dt>
                <dd>{{ issue.status }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">重要度:</dt>
                <dd>{{ issue.importance }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">担当者:</dt>
                <dd>{{ issue.assignee }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">進捗:</dt>
                <dd>{{ issue.progress }}%</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-2">日付情報</h3>
            <dl class="space-y-2">
              <div class="flex">
                <dt class="w-32 text-gray-600">発生日:</dt>
                <dd>{{ issue.occurrenceDate | date:'yyyy/MM/dd' }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">期限日:</dt>
                <dd>{{ issue.dueDate | date:'yyyy/MM/dd' }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">作成日:</dt>
                <dd>{{ issue.createdAt | date:'yyyy/MM/dd HH:mm' }}</dd>
              </div>
              <div class="flex">
                <dt class="w-32 text-gray-600">更新日:</dt>
                <dd>{{ issue.updatedAt | date:'yyyy/MM/dd HH:mm' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">説明</h3>
          <p class="text-gray-700 whitespace-pre-wrap">{{ issue.description }}</p>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">完了条件</h3>
          <p class="text-gray-700">{{ issue.completionCriteria }}</p>
        </div>

        <div class="mt-6" *ngIf="issue.solution">
          <h3 class="text-lg font-semibold mb-2">解決方法</h3>
          <p class="text-gray-700 whitespace-pre-wrap">{{ issue.solution }}</p>
        </div>
      </div>

      <!-- チャットコンポーネント -->
      <app-issue-chat [issueId]="issue.id"></app-issue-chat>
    </div>
  `
})
export class IssueDetailComponent implements OnInit {
  issue: Issue | null = null;
  isEditing = false;
  editForm: FormGroup;
  readonly statusOptions = ['未着手', '対応中', '完了'];
  readonly importanceOptions = ['低', '中', '高'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private issueService: IssueService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      issueNumber: [''],
      title: [''],
      description: [''],
      status: [''],
      importance: [''],
      dueDate: [''],
      completionCriteria: [''],
      solution: [''],
      assignee: [''],
      progress: [0],
      createdAt: [''],
      updatedAt: ['']
    });
  }

  ngOnInit(): void {
    const issueId = this.route.snapshot.paramMap.get('id');
    if (issueId) {
      this.loadIssue(issueId);
    }
  }

  private async loadIssue(id: string): Promise<void> {
    try {
      const issue = await this.issueService.getIssue(id);
      if (issue) {
        this.issue = issue;
        this.editForm.patchValue({
          issueNumber: issue.issueNumber,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          importance: issue.importance,
          dueDate: issue.dueDate,
          completionCriteria: issue.completionCriteria,
          solution: issue.solution,
          assignee: issue.assignee,
          progress: issue.progress,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt
        });
      }
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
    }
  }

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    if (this.issue) {
      this.editForm.patchValue(this.issue);
    }
  }

  async saveChanges(): Promise<void> {
    if (this.issue && this.editForm.valid) {
      const updatedIssue = {
        ...this.issue,
        ...this.editForm.value,
        updatedAt: new Date()
      };
      
      try {
        await this.issueService.updateIssue(this.issue.id, this.editForm.value);
        this.isEditing = false;
        await this.loadIssue(this.issue.id);
      } catch (error) {
        console.error('課題の更新に失敗しました:', error);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/issues']);
  }

  formatDeadline(deadline: string | Date | undefined): string {
    if (!deadline) return '';
    if (deadline instanceof Date) {
      return new Date(deadline).toLocaleString();
    }
    return deadline;
  }
} 