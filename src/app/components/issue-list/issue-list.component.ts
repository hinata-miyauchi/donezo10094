import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import { Subject, BehaviorSubject } from 'rxjs';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface IssueSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  averageProgress: number;
}

@Component({
  selector: 'app-issue-list',
  templateUrl: './issue-list.component.html',
  styleUrls: ['./issue-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  providers: [DatePipe, DecimalPipe]
})
export class IssueListComponent implements OnInit, OnDestroy {
  issues: Issue[] = [];
  filteredIssues: Issue[] = [];
  isLoading = true;
  searchForm: FormGroup;
  private destroy$ = new Subject<void>();
  issueSummary$ = new BehaviorSubject<IssueSummary>({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    overdue: 0,
    averageProgress: 0
  });
  overdueIssues$ = new BehaviorSubject<Issue[]>([]);
  dueSoonIssues$ = new BehaviorSubject<Issue[]>([]);
  assignees: string[] = [];
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedAssignee: string = '';
  summary = {
    totalIssues: 0,
    completedIssues: 0,
    averageProgress: 0
  };

  readonly statusOptions = ['すべて', '未着手', '対応中', '完了'];
  readonly importanceOptions = ['すべて', '低', '中', '高'];
  readonly sortOptions = [
    { value: 'default', label: 'デフォルト（ステータス→重要度→期限）' },
    { value: 'dueDate', label: '期限日' },
    { value: 'importance', label: '重要度' },
    { value: 'status', label: 'ステータス' },
    { value: 'progress', label: '進捗' },
    { value: 'title', label: 'タイトル' },
    { value: 'assignee', label: '担当者' }
  ];
  private readonly DUE_SOON_DAYS = 7; // 期限が7日以内の課題を「期限が近い」と定義

  constructor(
    private issueService: IssueService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      keyword: [''],
      status: ['すべて'],
      importance: ['すべて'],
      assignee: ['すべて'],
      startDate: [''],
      endDate: [''],
      sortBy: ['dueDate'],
      sortOrder: ['asc']
    });
  }

  ngOnInit(): void {
    this.loadIssues();
    this.loadAssignees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadIssues(): void {
    this.issueService.getIssues().subscribe({
      next: (issues) => {
        this.issues = issues;
        this.filteredIssues = issues;
        this.isLoading = false;
        this.updateIssueSummary();
        this.applyFilters();
      },
      error: (error) => {
        console.error('課題の取得に失敗しました:', error);
        this.isLoading = false;
      }
    });
  }

  private async loadAssignees(): Promise<void> {
    try {
      this.assignees = await this.issueService.getAssignees();
      // 「すべて」オプションを先頭に追加
      this.assignees.unshift('すべて');
    } catch (error) {
      console.error('担当者一覧の取得に失敗しました:', error);
    }
  }

  private updateIssueSummary(): void {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (this.DUE_SOON_DAYS * 24 * 60 * 60 * 1000));

    const overdueIssues = this.issues.filter(i => {
      return i.status !== '完了' && i.dueDate < now;
    });

    const dueSoonIssues = this.issues.filter(i => {
      return i.status !== '完了' && 
             i.dueDate >= now && 
             i.dueDate <= sevenDaysFromNow;
    });

    const summary: IssueSummary = {
      total: this.issues.length,
      completed: this.issues.filter(i => i.status === '完了').length,
      inProgress: this.issues.filter(i => i.status === '対応中').length,
      notStarted: this.issues.filter(i => i.status === '未着手').length,
      overdue: overdueIssues.length,
      averageProgress: this.issues.reduce((acc, curr) => acc + curr.progress, 0) / this.issues.length || 0
    };
    
    this.issueSummary$.next(summary);
    this.overdueIssues$.next(overdueIssues);
    this.dueSoonIssues$.next(dueSoonIssues);
  }

  private applyFilters(): void {
    const { keyword, status, importance, assignee, startDate, endDate, sortBy, sortOrder } = this.searchForm.value;
    
    this.filteredIssues = this.issues.filter(issue => {
      const matchesKeyword = !keyword || 
        issue.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (issue.description?.toLowerCase().includes(keyword.toLowerCase()));

      const matchesStatus = status === 'すべて' || issue.status === status;
      const matchesImportance = importance === 'すべて' || issue.importance === importance;
      const matchesAssignee = assignee === 'すべて' || issue.assignee === assignee;

      const matchesDate = (!startDate || new Date(startDate) <= issue.dueDate) &&
                         (!endDate || new Date(endDate) >= issue.dueDate);

      return matchesKeyword && matchesStatus && matchesImportance && matchesAssignee && matchesDate;
    });

    this.filteredIssues.sort((a, b) => {
      // 1. まずステータスでソート
      const statusOrder = { '未着手': 0, '対応中': 1, '完了': 2 };
      const statusCompare = statusOrder[a.status] - statusOrder[b.status];
      if (statusCompare !== 0) return statusCompare;

      // 2. 次に重要度でソート
      const importanceOrder = { '高': 0, '中': 1, '低': 2 };
      const importanceCompare = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (importanceCompare !== 0) return importanceCompare;

      // 3. 最後に期限日でソート
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    // ユーザーが選択したソート順で最終的なソートを適用
    if (sortBy !== 'default') {
      this.filteredIssues.sort((a, b) => {
        if (sortBy === 'dueDate') {
          return (a.dueDate.getTime() - b.dueDate.getTime()) * (sortOrder === 'asc' ? 1 : -1);
        } else if (sortBy === 'importance') {
          const importanceOrder = { '高': 2, '中': 1, '低': 0 };
          return (importanceOrder[a.importance] - importanceOrder[b.importance]) * (sortOrder === 'asc' ? 1 : -1);
        } else if (sortBy === 'status') {
          const statusOrder = { '未着手': 0, '対応中': 1, '完了': 2 };
          return (statusOrder[a.status] - statusOrder[b.status]) * (sortOrder === 'asc' ? 1 : -1);
        } else if (sortBy === 'progress') {
          return (a.progress - b.progress) * (sortOrder === 'asc' ? 1 : -1);
        } else if (sortBy === 'title') {
          return a.title.localeCompare(b.title) * (sortOrder === 'asc' ? 1 : -1);
        } else if (sortBy === 'assignee') {
          return a.assignee.localeCompare(b.assignee) * (sortOrder === 'asc' ? 1 : -1);
        }
        return 0;
      });
    }
  }

  getRemainingDays(dueDate: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  clearFilters(): void {
    this.searchForm.patchValue({
      keyword: '',
      status: 'すべて',
      importance: 'すべて',
      assignee: 'すべて',
      startDate: '',
      endDate: '',
      sortBy: 'dueDate',
      sortOrder: 'asc'
    });
  }

  search(): void {
    this.applyFilters();
  }

  deleteIssue(issue: Issue): void {
    if (confirm('この課題を削除してもよろしいですか？')) {
      this.issueService.deleteIssue(issue.id)
        .then(() => {
          // 課題リストから削除
          this.issues = this.issues.filter(i => i.id !== issue.id);
          this.filteredIssues = this.filteredIssues.filter(i => i.id !== issue.id);
          
          // サマリーの更新
          this.updateIssueSummary();
          
          // フィルターの再適用
          this.applyFilters();
        })
        .catch(error => {
          console.error('課題の削除に失敗しました:', error);
        });
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}