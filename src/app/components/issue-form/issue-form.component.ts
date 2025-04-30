import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { TeamService } from '../../services/team.service';
import { Issue } from '../../models/issue.model';
import { Team } from '../../models/team.model';
import { Subject, from } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-issue-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-4">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white shadow sm:rounded-lg">
          <div class="px-4 py-4 sm:p-5">
            <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
              {{ isEditMode ? '課題の編集' : '新規課題の登録' }}
            </h3>
            
            <form [formGroup]="issueForm" (ngSubmit)="onSubmit()" class="space-y-5">
              <div>
                <label for="title" class="block text-sm font-medium text-gray-700">
                  タイトル<span class="text-red-500 ml-1">*</span>
                </label>
                <div class="mt-1">
                  <input
                    type="text"
                    id="title"
                    formControlName="title"
                    class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    [class.border-red-500]="isFieldInvalid('title')"
                  />
                  <p *ngIf="isFieldInvalid('title')" class="mt-1 text-sm text-red-600">
                    {{ getErrorMessage('title') }}
                  </p>
                </div>
              </div>

              <div>
                <label for="description" class="block text-sm font-medium text-gray-700">
                  説明<span class="text-red-500 ml-1">*</span>
                </label>
                <div class="mt-1">
                  <textarea
                    id="description"
                    formControlName="description"
                    rows="3"
                    class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    [class.border-red-500]="isFieldInvalid('description')"
                  ></textarea>
                  <p *ngIf="isFieldInvalid('description')" class="mt-1 text-sm text-red-600">
                    {{ getErrorMessage('description') }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="priority" class="block text-sm font-medium text-gray-700">
                    重要度<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="mt-1">
                    <select
                      id="priority"
                      formControlName="priority"
                      class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      [class.border-red-500]="isFieldInvalid('priority')"
                    >
                      <option *ngFor="let option of importanceOptions" [value]="option">
                        {{ option }}
                      </option>
                    </select>
                    <p *ngIf="isFieldInvalid('priority')" class="mt-1 text-sm text-red-600">
                      {{ getErrorMessage('priority') }}
                    </p>
                  </div>
                </div>

                <div>
                  <label for="progress" class="block text-sm font-medium text-gray-700">
                    進捗率<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="mt-1">
                    <input
                      type="number"
                      id="progress"
                      formControlName="progress"
                      min="0"
                      max="100"
                      class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      [class.border-red-500]="isFieldInvalid('progress')"
                    />
                    <p *ngIf="isFieldInvalid('progress')" class="mt-1 text-sm text-red-600">
                      {{ getErrorMessage('progress') }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="occurrenceDate" class="block text-sm font-medium text-gray-700">
                    発生日<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="mt-1">
                    <input
                      type="date"
                      id="occurrenceDate"
                      formControlName="occurrenceDate"
                      class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      [class.border-red-500]="isFieldInvalid('occurrenceDate')"
                    />
                    <p *ngIf="isFieldInvalid('occurrenceDate')" class="mt-1 text-sm text-red-600">
                      {{ getErrorMessage('occurrenceDate') }}
                    </p>
                  </div>
                </div>

                <div>
                  <label for="dueDate" class="block text-sm font-medium text-gray-700">
                    期限日<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="mt-1">
                    <input
                      type="date"
                      id="dueDate"
                      formControlName="dueDate"
                      class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      [class.border-red-500]="isFieldInvalid('dueDate')"
                    />
                    <p *ngIf="isFieldInvalid('dueDate')" class="mt-1 text-sm text-red-600">
                      {{ getErrorMessage('dueDate') }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="dueTime" class="block text-sm font-medium text-gray-700">
                    期限時刻<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="mt-1">
                    <input
                      type="time"
                      id="dueTime"
                      formControlName="dueTime"
                      class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      [class.border-red-500]="isFieldInvalid('dueTime')"
                    />
                    <p *ngIf="isFieldInvalid('dueTime')" class="mt-1 text-sm text-red-600">
                      {{ getErrorMessage('dueTime') }}
                    </p>
                  </div>
                </div>

                <div>
                  <label for="assignee" class="block text-sm font-medium text-gray-700">
                    担当者<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="mt-1">
                    <input
                      type="text"
                      id="assignee"
                      formControlName="assignee"
                      class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      [class.border-red-500]="isFieldInvalid('assignee')"
                    />
                    <p *ngIf="isFieldInvalid('assignee')" class="mt-1 text-sm text-red-600">
                      {{ getErrorMessage('assignee') }}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label for="completionCriteria" class="block text-sm font-medium text-gray-700">
                  完了条件<span class="text-red-500 ml-1">*</span>
                </label>
                <div class="mt-1">
                  <textarea
                    id="completionCriteria"
                    formControlName="completionCriteria"
                    rows="2"
                    class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    [class.border-red-500]="isFieldInvalid('completionCriteria')"
                  ></textarea>
                  <p *ngIf="isFieldInvalid('completionCriteria')" class="mt-1 text-sm text-red-600">
                    {{ getErrorMessage('completionCriteria') }}
                  </p>
                </div>
              </div>

              <div>
                <label for="solution" class="block text-sm font-medium text-gray-700">
                  対応内容<span class="text-red-500 ml-1">*</span>
                </label>
                <div class="mt-1">
                  <textarea
                    id="solution"
                    formControlName="solution"
                    rows="2"
                    (focus)="onSolutionFocus()"
                    (blur)="onSolutionBlur()"
                    class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    [class.border-red-500]="isFieldInvalid('solution')"
                    [class.text-gray-400]="issueForm.get('solution')?.value === '検討中'"
                  ></textarea>
                  <p *ngIf="isFieldInvalid('solution')" class="mt-1 text-sm text-red-600">
                    {{ getErrorMessage('solution') }}
                  </p>
                </div>
              </div>

              <div>
                <label for="teamId" class="block text-sm font-medium text-gray-700">プロジェクト</label>
                <div class="mt-1">
                  <select
                    id="teamId"
                    formControlName="teamId"
                    class="bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">個人の課題</option>
                    <option *ngFor="let team of teams" [value]="team.id">
                      {{ team.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="pt-4">
                <button
                  type="submit"
                  [disabled]="!issueForm.valid || isSubmitting"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  {{ isSubmitting ? '送信中...' : (isEditMode ? '更新' : '登録') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IssueFormComponent implements OnInit, OnDestroy {
  issueForm: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  teams: Team[] = [];
  importanceOptions = ['低', '中', '高'];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private issueService: IssueService,
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.issueForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required]],
      priority: ['中', [Validators.required]],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      occurrenceDate: ['', [Validators.required, this.dateValidator()]],
      dueDate: ['', [Validators.required, this.dateValidator(), this.futureDateValidator()]],
      dueTime: ['', [Validators.required, this.timeValidator()]],
      assignee: ['', [Validators.required]],
      completionCriteria: ['', [Validators.required]],
      solution: ['検討中', [Validators.required]],
      teamId: ['']
    });

    this.isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadTeams(): Promise<void> {
    try {
      const teams = await this.teamService.getUserTeams();
      this.teams = teams;
    } catch (error: any) {
      console.error('チームの読み込みに失敗しました:', error);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.issueForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.issueForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    
    if (errors['required']) return 'この項目は必須です';
    if (errors['minlength']) return `最低${errors['minlength'].requiredLength}文字必要です`;
    if (errors['maxlength']) return `最大${errors['maxlength'].requiredLength}文字までです`;
    if (errors['min']) return `${errors['min'].min}以上の値を入力してください`;
    if (errors['max']) return `${errors['max'].max}以下の値を入力してください`;
    if (errors['invalidDate']) return '正しい日付を入力してください';
    if (errors['pastDate']) return '過去の日付は選択できません';
    if (errors['invalidTime']) return '正しい時刻を入力してください';

    return '入力値が不正です';
  }

  private dateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const date = new Date(control.value);
      return isNaN(date.getTime()) ? { invalidDate: true } : null;
    };
  }

  private futureDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const date = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return date < today ? { pastDate: true } : null;
    };
  }

  private timeValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(control.value) ? null : { invalidTime: true };
    };
  }

  async onSubmit(): Promise<void> {
    if (this.issueForm.invalid) return;

    this.isSubmitting = true;
    try {
      const formData = this.issueForm.value;
      formData.isPrivate = !formData.teamId;
      
      // 進捗率に基づいてステータスを自動設定
      const progress = formData.progress;
      if (progress === 0) {
        formData.status = '未着手';
      } else if (progress === 100) {
        formData.status = '完了';
      } else {
        formData.status = '進行中';
      }

      // 担当者情報を正しい形式に変換
      if (formData.assignee) {
        formData.assignee = {
          uid: '', // 一時的に空文字列を設定
          displayName: formData.assignee
        };
      }
      
      await this.issueService.addIssue(formData);
      this.router.navigate(['/issues']);
    } catch (error) {
      console.error('課題の作成に失敗しました:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/issues']);
  }

  onSolutionFocus(): void {
    const solutionControl = this.issueForm.get('solution');
    if (solutionControl && solutionControl.value === '検討中') {
      solutionControl.setValue('');
    }
  }

  onSolutionBlur(): void {
    const solutionControl = this.issueForm.get('solution');
    if (solutionControl && (!solutionControl.value || solutionControl.value.trim() === '')) {
      solutionControl.setValue('検討中');
    }
  }
} 