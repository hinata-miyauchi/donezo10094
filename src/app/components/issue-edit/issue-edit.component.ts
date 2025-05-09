import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';

@Component({
  selector: 'app-issue-edit',
  templateUrl: './issue-edit.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class IssueEditComponent implements OnInit {
  issueForm: FormGroup;
  isSubmitting = false;
  issueId = '';

  readonly importanceOptions = ['低', '中', '高'];

  constructor(
    private fb: FormBuilder,
    private issueService: IssueService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.issueForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', Validators.required],
      importance: ['中', Validators.required],
      occurrenceDate: [new Date(), Validators.required],
      dueDate: [null, Validators.required],
      assignee: ['', Validators.required],
      handler: ['', Validators.required],
      solution: ['', Validators.required],
      completionCriteria: ['', Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });

    // 進捗率の変更を監視
    this.issueForm.get('progress')?.valueChanges.subscribe(progress => {
      const status = this.getStatusFromProgress(progress);
      // ステータスが変更された場合はコンソールに記録
      console.log(`進捗率が${progress}%に変更されたため、ステータスを「${status}」に自動更新しました`);
    });
  }

  // 進捗率からステータスを決定するメソッド
  private getStatusFromProgress(progress: number): string {
    if (progress === 0) return '未着手';
    if (progress === 100) return '完了';
    return '進行中';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      alert('課題IDが指定されていません。');
      this.router.navigate(['/issues']);
      return;
    }
    this.issueId = id;
    this.loadIssue();
  }

  private async loadIssue(): Promise<void> {
    try {
      const issue = await this.issueService.getIssue(this.issueId);
      if (issue) {
        this.issueForm.patchValue({
          title: issue.title,
          description: issue.description,
          importance: issue.priority,
          occurrenceDate: this.formatDate(issue.occurrenceDate),
          dueDate: this.formatDate(issue.dueDate),
          assignee: issue.assignee?.displayName || '',
          handler: issue.handler || '',
          solution: issue.solution || '',
          completionCriteria: issue.completionCriteria || '',
          progress: issue.progress
        });
      }
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
      alert('課題の取得に失敗しました。');
      this.router.navigate(['/issues']);
    }
  }

  private formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  async onSubmit(): Promise<void> {
    if (this.issueForm.invalid || this.isSubmitting) {
      // フォームが無効な場合、エラーメッセージを表示
      if (this.issueForm.invalid) {
        Object.keys(this.issueForm.controls).forEach(key => {
          const control = this.issueForm.get(key);
          if (control?.invalid) {
            control.markAsTouched();
          }
        });
        return;
      }
      return;
    }

    try {
      this.isSubmitting = true;
      const formValue = this.issueForm.value;
      
      const issueData = {
        ...formValue,
        occurrenceDate: new Date(formValue.occurrenceDate),
        dueDate: new Date(formValue.dueDate),
        progress: Number(formValue.progress),
        status: this.getStatusFromProgress(Number(formValue.progress)), // 進捗率に基づいてステータスを設定
        assignee: {
          uid: '', // 一時的に空文字列を設定
          displayName: formValue.assignee
        }
      };

      await this.issueService.updateIssue(this.issueId, issueData);
      this.router.navigate(['/issues']);
    } catch (error) {
      console.error('課題の更新に失敗しました:', error);
      alert('課題の更新に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/issues']);
  }

  getErrorMessage(controlName: string): string {
    const control = this.issueForm.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'この項目は必須です';
    if (errors['minlength']) return `最低${errors['minlength'].requiredLength}文字必要です`;
    if (errors['min']) return `${errors['min'].min}以上の値を入力してください`;
    if (errors['max']) return `${errors['max'].max}以下の値を入力してください`;
    
    return '入力値が不正です';
  }
} 