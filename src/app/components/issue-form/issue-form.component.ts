import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';

@Component({
  selector: 'app-issue-form',
  templateUrl: './issue-form.component.html',
  styleUrls: ['./issue-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class IssueFormComponent implements OnInit {
  issueForm: FormGroup;
  isSubmitting = false;

  readonly statusOptions = ['未着手', '対応中', '完了'];
  readonly importanceOptions = ['低', '中', '高'];

  constructor(
    private fb: FormBuilder,
    private issueService: IssueService,
    private router: Router
  ) {
    this.issueForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', Validators.required],
      status: ['未着手', Validators.required],
      importance: ['中', Validators.required],
      occurrenceDate: [new Date().toISOString().split('T')[0], Validators.required],
      dueDate: [null, Validators.required],
      dueTime: ['17:00', Validators.required],
      assignee: ['', Validators.required],
      handler: [''],
      solution: [''],
      completionCriteria: ['', Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit(): void {
    console.log('IssueFormComponent initialized');
    window.scrollTo(0, 0);
  }

  async onSubmit(): Promise<void> {
    if (this.issueForm.invalid || this.isSubmitting) {
      return;
    }

    try {
      this.isSubmitting = true;
      const formValue = this.issueForm.value;
      
      const dueDateWithTime = formValue.dueDate && formValue.dueTime
        ? new Date(`${formValue.dueDate}T${formValue.dueTime}`)
        : null;

      const issueData = {
        ...formValue,
        occurrenceDate: new Date(formValue.occurrenceDate),
        dueDate: dueDateWithTime,
        createdBy: 'システム',
        progress: Number(formValue.progress)
      };

      delete issueData.dueTime;

      await this.issueService.addIssue(issueData);
      console.log('課題が正常に作成されました');
      this.router.navigate(['/issues']);
    } catch (error) {
      console.error('課題の作成に失敗しました:', error);
      alert('課題の作成に失敗しました。もう一度お試しください。');
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