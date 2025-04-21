import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';

@Component({
  selector: 'app-issue-detail',
  templateUrl: './issue-detail.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule]
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