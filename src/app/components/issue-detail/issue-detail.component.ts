import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import { IssueChatComponent } from '../issue-chat/issue-chat.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-issue-detail',
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IssueChatComponent]
})
export class IssueDetailComponent implements OnInit, OnDestroy {
  issue: Issue | null = null;
  isEditing = false;
  editForm: FormGroup;
  readonly statusOptions = ['未着手', '進行中', '完了'];
  readonly importanceOptions = ['低', '中', '高'];
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private issueService: IssueService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      title: [''],
      description: [''],
      status: [''],
      priority: [''],
      dueDate: [''],
      completionCriteria: [''],
      solution: [''],
      assignee: new FormControl(''),
      progress: [0]
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
        const dueDate = issue.dueDate instanceof Date ? issue.dueDate : new Date(issue.dueDate);
        
        this.editForm.patchValue({
          title: issue.title || '',
          description: issue.description || '',
          status: issue.status || '未着手',
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

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    if (this.issue) {
      this.loadIssue(this.issue.id);
    }
  }

  async saveChanges(): Promise<void> {
    if (this.issue && this.editForm.valid) {
      try {
        const formValues = this.editForm.value;
        const updatedIssue: Partial<Issue> = {
          title: formValues.title,
          description: formValues.description,
          status: formValues.status as '未着手' | '進行中' | '完了',
          priority: formValues.priority as '高' | '中' | '低',
          dueDate: formValues.dueDate ? new Date(formValues.dueDate) : new Date(),
          completionCriteria: formValues.completionCriteria,
          solution: formValues.solution || '',
          assignee: {
            uid: this.issue.assignee?.uid || '',
            displayName: formValues.assignee || ''
          },
          progress: Number(formValues.progress),
          updatedAt: new Date()
        };
        
        await this.issueService.updateIssue(this.issue.id, updatedIssue);
        this.isEditing = false;
        await this.loadIssue(this.issue.id);
        setTimeout(() => {
          this.router.navigate(['/issues']);
        }, 500);
      } catch (error) {
        console.error('課題の更新に失敗しました:', error);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/issues']);
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
} 