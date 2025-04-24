import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { TeamService } from '../../services/team.service';
import { Issue } from '../../models/issue.model';
import { Team } from '../../models/team.model';
import { Subject, from } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
export class IssueFormComponent implements OnInit, OnDestroy {
  issueForm: FormGroup;
  isSubmitting = false;
  teams: Team[] = [];
  importanceOptions = ['低', '中', '高', '緊急'];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private issueService: IssueService,
    private teamService: TeamService,
    private router: Router
  ) {
    this.issueForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      importance: ['中', [Validators.required]],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      occurrenceDate: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      dueTime: ['', [Validators.required]],
      assignee: ['', [Validators.required]],
      completionCriteria: ['', [Validators.required]],
      solution: ['検討中', [Validators.required]],
      teamId: [''],
      isPrivate: [false]
    });
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

  getErrorMessage(fieldName: string): string {
    const control = this.issueForm.get(fieldName);
    if (control?.errors) {
      if (control.errors['required']) {
        return 'この項目は必須です';
      }
      if (control.errors['minlength']) {
        return `最低${control.errors['minlength'].requiredLength}文字必要です`;
      }
    }
    return '';
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