import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { TeamService } from '../../services/team.service';
import { Issue } from '../../models/issue.model';
import { Team } from '../../models/team.model';
import { IssueChatComponent } from '../issue-chat/issue-chat.component';
import { Subscription } from 'rxjs';
import { CommentComponent } from '../comment/comment.component';

@Component({
  selector: 'app-issue-detail',
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    IssueChatComponent,
    CommentComponent
  ]
})
export class IssueDetailComponent implements OnInit, OnDestroy {
  issue: Issue | null = null;
  team: Team | null = null;
  isEditing = false;
  isSubmitting = false;
  editForm: FormGroup;
  readonly importanceOptions = ['低', '中', '高'];
  private subscriptions = new Subscription();
  showErrorPopup = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private issueService: IssueService,
    private teamService: TeamService,
    private fb: FormBuilder,
    private location: Location
  ) {
    this.editForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      completionCriteria: ['', [Validators.required]],
      solution: ['', [Validators.required]],
      assignee: new FormControl('', [Validators.required]),
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });

    // 進捗率の変更を監視
    this.editForm.get('progress')?.valueChanges.subscribe(progress => {
      const status = this.getStatusFromProgress(progress);
      console.log(`進捗率が${progress}%に変更されたため、ステータスを「${status}」に自動更新しました`);
    });
  }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const issueId = this.route.snapshot.paramMap.get('id');
    if (issueId) {
      this.loadIssue(issueId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private async loadIssue(id: string): Promise<void> {
    try {
      const issue = await this.issueService.getIssue(id);
      if (issue) {
        this.issue = issue;
        if (issue.teamId) {
          this.loadTeam(issue.teamId);
        }
        const dueDate = issue.dueDate instanceof Date ? issue.dueDate : new Date(issue.dueDate);
        
        this.editForm.patchValue({
          title: issue.title || '',
          description: issue.description || '',
          priority: issue.priority || '中',
          dueDate: this.formatDateForInput(dueDate),
          completionCriteria: issue.completionCriteria || '',
          solution: issue.solution || '',
          assignee: issue.assignee?.displayName || '',
          progress: issue.progress || 0
        });
      }
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
    }
  }

  private async loadTeam(teamId: string): Promise<void> {
    try {
      const team = await this.teamService.getTeam(teamId);
      if (team) {
        this.team = team;
      }
    } catch (error) {
      console.error('チーム情報の取得に失敗しました:', error);
    }
  }

  startEditing(): void {
    this.isEditing = true;
  }

  onCancel(): void {
    this.isEditing = false;
    if (this.issue) {
      this.loadIssue(this.issue.id);
    }
  }

  async saveChanges(): Promise<void> {
    if (this.editForm.invalid) {
      // すべてのフォームコントロールをタッチ済みにしてエラーメッセージを表示
      Object.keys(this.editForm.controls).forEach(key => {
        const control = this.editForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
      
      // エラーメッセージをポップアップで表示
      this.errorMessage = '入力内容に不備があります。必須項目を確認してください。';
      this.showErrorPopup = true;
      
      // 3秒後にポップアップを非表示にする
      setTimeout(() => {
        this.showErrorPopup = false;
        this.errorMessage = '';
      }, 3000);
      
      return;
    }

    if (this.issue) {
      try {
        this.isSubmitting = true;
        const formValues = this.editForm.value;
        const updatedIssue: Partial<Issue> = {
          title: formValues.title,
          description: formValues.description,
          priority: formValues.priority as '高' | '中' | '低',
          dueDate: formValues.dueDate ? new Date(formValues.dueDate) : new Date(),
          completionCriteria: formValues.completionCriteria,
          solution: formValues.solution || '',
          assignee: {
            uid: this.issue.assignee?.uid || '',
            displayName: formValues.assignee || ''
          },
          progress: Number(formValues.progress),
          status: this.getStatusFromProgress(Number(formValues.progress)),
          updatedAt: new Date()
        };
        
        await this.issueService.updateIssue(this.issue.id, updatedIssue);
        this.isEditing = false;
        await this.loadIssue(this.issue.id);
      } catch (error) {
        console.error('課題の更新に失敗しました:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  goBack(): void {
    // カレンダーからの遷移の場合、ビュー状態を保持して戻る
    const returnView = this.route.snapshot.queryParams['returnView'];
    if (returnView) {
      this.router.navigate(['/calendar'], {
        queryParams: { view: returnView }
      });
    } else {
      this.location.back();
    }
  }

  private formatDateForInput(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // 進捗率からステータスを決定するメソッド
  private getStatusFromProgress(progress: number): '未着手' | '進行中' | '完了' {
    if (progress === 0) return '未着手';
    if (progress === 100) return '完了';
    return '進行中';
  }
} 