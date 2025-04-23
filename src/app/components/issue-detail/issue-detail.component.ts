import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import { IssueChatComponent } from '../issue-chat/issue-chat.component';

@Component({
  selector: 'app-issue-detail',
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IssueChatComponent]
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
          dueDate: this.formatDateForInput(issue.dueDate),
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
      try {
        const formValues = this.editForm.value;
        const updatedIssue = {
          ...this.issue,
          ...formValues,
          dueDate: formValues.dueDate ? new Date(formValues.dueDate) : this.issue.dueDate,
          updatedAt: new Date()
        };
        
        await this.issueService.updateIssue(this.issue.id, updatedIssue);
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

  private formatDateForInput(date: string | Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
} 