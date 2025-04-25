import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import { Subject, BehaviorSubject, takeUntil } from 'rxjs';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { Team } from '../../models/team.model';

interface IssueSummary {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  notStartedIssues: number;
  upcomingDeadlines: Issue[];
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
  completedIssues: Issue[] = [];
  incompleteIssues: Issue[] = [];
  isLoading = true;
  searchForm: FormGroup;
  showFilters = false;
  private destroy$ = new Subject<void>();
  private issueSummarySubject = new BehaviorSubject<IssueSummary>({
    totalIssues: 0,
    completedIssues: 0,
    inProgressIssues: 0,
    notStartedIssues: 0,
    upcomingDeadlines: []
  });
  private overdueIssuesSubject = new BehaviorSubject<Issue[]>([]);
  private dueSoonIssuesSubject = new BehaviorSubject<Issue[]>([]);
  private filteredIssuesSubject = new BehaviorSubject<Issue[]>([]);

  issueSummary$ = this.issueSummarySubject.asObservable();
  overdueIssues$ = this.overdueIssuesSubject.asObservable();
  dueSoonIssues$ = this.dueSoonIssuesSubject.asObservable();
  filteredIssues$ = this.filteredIssuesSubject.asObservable();

  assignees: string[] = [];
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedAssignee: string = '';
  selectedTeamId: string = 'all';
  summary = {
    totalIssues: 0,
    completedIssues: 0,
    averageProgress: 0
  };

  readonly statusOptions = ['すべて', '未着手', '進行中', '完了'];
  readonly priorityOptions = ['すべて', '低', '中', '高'];
  readonly sortOptions = [
    { value: 'default', label: 'デフォルト（ステータス→優先度→期限）' },
    { value: 'dueDate', label: '期限日' },
    { value: 'priority', label: '優先度' },
    { value: 'status', label: 'ステータス' },
    { value: 'progress', label: '進捗' },
    { value: 'title', label: 'タイトル' },
    { value: 'assignee', label: '担当者' }
  ];
  private readonly DUE_SOON_DAYS = 7; // 期限が7日以内の課題を「期限が近い」と定義

  teams: Team[] = [];
  filters = {
    status: '',
    priority: '',
    assignee: ''
  };
  canCreateIssue: boolean = false;

  constructor(
    private issueService: IssueService,
    private fb: FormBuilder,
    private teamService: TeamService,
    private authService: AuthService,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      keyword: [''],
      status: ['すべて'],
      priority: ['すべて'],
      assignee: ['すべて'],
      startDate: [''],
      endDate: [''],
      sortBy: ['dueDate'],
      sortOrder: ['asc']
    });
  }

  ngOnInit(): void {
    // チームの読み込みが完了してから課題を読み込む
    this.loadTeams().then(() => {
      this.loadIssues();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.issueSummarySubject.complete();
    this.overdueIssuesSubject.complete();
    this.dueSoonIssuesSubject.complete();
    this.filteredIssuesSubject.complete();
  }

  private async loadTeams(): Promise<void> {
    try {
      this.teams = await this.teamService.getUserTeams();
      this.updateCanCreateIssue();
    } catch (error) {
      console.error('チームの取得に失敗しました:', error);
      this.teams = [];
    }
  }

  onTeamChange(teamId: string): void {
    this.selectedTeamId = teamId;
    this.isLoading = true;
    this.loadIssues();
  }

  private loadIssues(): void {
    this.isLoading = true;
    if (this.selectedTeamId === 'all') {
      // すべてのチームの課題を取得
      Promise.all([
        this.issueService.getIssues(), // 個人の課題
        ...this.teams.map(team => this.issueService.getIssues(team.id)) // 各チームの課題
      ]).then(results => {
        // 結果を結合して重複を除去
        const allIssues = results.flat();
        const uniqueIssues = Array.from(new Map(allIssues.map(issue => [issue.id, issue])).values());
        this.issues = uniqueIssues;
        this.separateIssuesByStatus(uniqueIssues);
        this.filteredIssuesSubject.next(uniqueIssues);
        this.isLoading = false;
        this.updateIssueSummary();
        this.updateAssigneesList();
        this.applyFilters();
      }).catch(error => {
        console.error('課題の取得に失敗しました:', error);
        this.isLoading = false;
      });
    } else {
      // 特定のチームまたは個人の課題を取得
      this.issueService.getIssues(this.selectedTeamId).then(issues => {
        this.issues = issues;
        this.separateIssuesByStatus(issues);
        this.filteredIssuesSubject.next(issues);
        this.isLoading = false;
        this.updateIssueSummary();
        this.updateAssigneesList();
        this.applyFilters();
      }).catch(error => {
        console.error('課題の取得に失敗しました:', error);
        this.isLoading = false;
      });
    }
  }

  private separateIssuesByStatus(issues: Issue[]): void {
    // 進捗率に応じてステータスを自動更新
    const updatedIssues = issues.map(issue => this.updateStatusByProgress(issue));

    // 完了済みと未完了の課題を分離
    this.completedIssues = updatedIssues.filter(issue => issue.status === '完了');
    const unsortedIncompleteIssues = updatedIssues.filter(issue => issue.status !== '完了');

    // 未完了の課題をソート
    this.incompleteIssues = this.sortIncompleteIssues(unsortedIncompleteIssues);

    // 更新されたステータスをデータベースに反映
    updatedIssues.forEach(issue => {
      if (issue.status !== issues.find(i => i.id === issue.id)?.status) {
        this.issueService.updateIssue(issue.id, { status: issue.status });
      }
    });
  }

  private updateStatusByProgress(issue: Issue): Issue {
    const progress = issue.progress ?? 0;
    let newStatus = issue.status;

    if (progress === 0) {
      newStatus = '未着手';
    } else if (progress === 100) {
      newStatus = '完了';
    } else if (progress > 0 && progress < 100 && issue.status === '未着手') {
      newStatus = '進行中';
    }

    if (newStatus !== issue.status) {
      return { ...issue, status: newStatus };
    }
    return issue;
  }

  private sortIncompleteIssues(issues: Issue[]): Issue[] {
    const priorityOrder: { [key: string]: number } = { '高': 0, '中': 1, '低': 2 };

    return issues.sort((a, b) => {
      // 1. 重要度でソート
      const priorityDiff = (priorityOrder[a.priority] ?? 999) - (priorityOrder[b.priority] ?? 999);
      if (priorityDiff !== 0) return priorityDiff;

      // 2. 対応期限でソート（期限が近い順）
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (aDate !== bDate) return aDate - bDate;

      // 3. 進捗でソート（進捗が低い順）
      return (a.progress ?? 0) - (b.progress ?? 0);
    });
  }

  private updateIssueSummary(): void {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (this.DUE_SOON_DAYS * 24 * 60 * 60 * 1000));

    const overdueIssues = this.issues.filter(i => {
      const dueDate = new Date(i.dueDate);
      return i.status !== '完了' && dueDate < now;
    });

    const dueSoonIssues = this.issues.filter(i => {
      const dueDate = new Date(i.dueDate);
      return i.status !== '完了' && 
             dueDate >= now && 
             dueDate <= sevenDaysFromNow;
    });

    const summary: IssueSummary = {
      totalIssues: this.issues.length,
      completedIssues: this.issues.filter(i => i.status === '完了').length,
      inProgressIssues: this.issues.filter(i => i.status === '進行中').length,
      notStartedIssues: this.issues.filter(i => i.status === '未着手').length,
      upcomingDeadlines: dueSoonIssues
    };
    
    this.issueSummarySubject.next(summary);
    this.overdueIssuesSubject.next(overdueIssues);
    this.dueSoonIssuesSubject.next(dueSoonIssues);
  }

  private updateAssigneesList(): void {
    // 重複を除いた担当者一覧を取得
    const assigneeSet = new Set<string>();
    assigneeSet.add('すべて');
    
    this.issues.forEach(issue => {
      if (issue.assignee?.displayName) {
        assigneeSet.add(issue.assignee.displayName);
      }
    });

    // Set を配列に変換して assignees に設定
    this.assignees = Array.from(assigneeSet);
  }

  private applyFilters(): void {
    const { keyword, status, priority, assignee, startDate, endDate, sortBy, sortOrder } = this.searchForm.value;
    
    let filtered = this.issues.filter(issue => {
      const matchesKeyword = !keyword || 
        issue.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (issue.description?.toLowerCase().includes(keyword.toLowerCase()));

      const matchesStatus = status === 'すべて' || issue.status === status;
      const matchesPriority = priority === 'すべて' || issue.priority === priority;
      const matchesAssignee = assignee === 'すべて' || 
        (issue.assignee && issue.assignee.displayName === assignee);

      const issueDueDate = new Date(issue.dueDate);
      const matchesDate = (!startDate || new Date(startDate) <= issueDueDate) &&
                         (!endDate || new Date(endDate) >= issueDueDate);

      return matchesKeyword && matchesStatus && matchesPriority && matchesAssignee && matchesDate;
    });

    // デフォルトのソート順
    filtered.sort((a, b) => {
      // 1. まずステータスでソート
      const statusOrder: { [key: string]: number } = { '未着手': 0, '進行中': 1, '完了': 2 };
      const statusCompare = statusOrder[a.status] - statusOrder[b.status];
      if (statusCompare !== 0) return statusCompare;

      // 2. 次に優先度でソート
      const priorityOrder: { [key: string]: number } = { '高': 0, '中': 1, '低': 2 };
      const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityCompare !== 0) return priorityCompare;

      // 3. 最後に期限日でソート
      const dueDateA = new Date(a.dueDate).getTime();
      const dueDateB = new Date(b.dueDate).getTime();
      return dueDateA - dueDateB;
    });

    // ユーザーが選択したソート順で最終的なソートを適用
    if (sortBy !== 'default') {
      filtered = this.sortIssues(filtered, sortBy, sortOrder as 'asc' | 'desc');
    }

    // フィルタリング結果を完了/未完了で分離
    this.completedIssues = filtered.filter(issue => issue.status === '完了');
    this.incompleteIssues = filtered.filter(issue => issue.status !== '完了');

    this.filteredIssuesSubject.next(filtered);
  }

  getRemainingDays(dueDate: Date | string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    const diffTime = dueDateObj.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  clearFilters(): void {
    this.searchForm.patchValue({
      keyword: '',
      status: 'すべて',
      priority: 'すべて',
      assignee: 'すべて',
      startDate: '',
      endDate: '',
      sortBy: 'dueDate',
      sortOrder: 'asc'
    });
    this.applyFilters();
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
          this.filteredIssuesSubject.next(this.issues.filter(i => i.id !== issue.id));
          
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

  updateCanCreateIssue(): void {
    if (!this.selectedTeamId) {
      this.canCreateIssue = true;
      return;
    }

    const team = this.teams.find(t => t.id === this.selectedTeamId);
    if (!team) {
      this.canCreateIssue = false;
      return;
    }

    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    const membership = team?.members.find(m => m.uid === currentUser.uid);
    this.canCreateIssue = membership?.role === 'admin' || membership?.role === 'member';
  }

  sortIssues(issues: Issue[], sortBy: string, sortOrder: 'asc' | 'desc'): Issue[] {
    return [...issues].sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { '高': 2, '中': 1, '低': 0 };
      const statusOrder: { [key: string]: number } = { '未着手': 0, '進行中': 1, '完了': 2 };

      switch (sortBy) {
        case 'priority':
          return (priorityOrder[a.priority] - priorityOrder[b.priority]) * (sortOrder === 'asc' ? 1 : -1);
        case 'status':
          return (statusOrder[a.status] - statusOrder[b.status]) * (sortOrder === 'asc' ? 1 : -1);
        case 'dueDate':
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * (sortOrder === 'asc' ? 1 : -1);
        case 'assignee':
          return (a.assignee?.displayName || '').localeCompare(b.assignee?.displayName || '') * (sortOrder === 'asc' ? 1 : -1);
        default:
          return 0;
      }
    });
  }

  navigateToIssueDetail(issueId: string) {
    this.router.navigate(['/issues', issueId]);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  hasActiveFilters(): boolean {
    const { keyword, status, priority, assignee, startDate, endDate } = this.searchForm.value;
    return !!(keyword || 
      status !== 'すべて' || 
      priority !== 'すべて' || 
      assignee !== 'すべて' || 
      startDate || 
      endDate);
  }
}