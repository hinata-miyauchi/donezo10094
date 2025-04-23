// src/app/services/issue.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, combineLatest, firstValueFrom } from 'rxjs';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  serverTimestamp,
  CollectionReference,
  DocumentData,
  QueryConstraint,
  Query,
  DocumentSnapshot,
  QuerySnapshot
} from '@angular/fire/firestore';
import { Issue, IssueSummary } from '../models/issue.model';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  private readonly firestore: Firestore = inject(Firestore);
  private readonly COLLECTION_NAME = 'issues';
  private lastIssueNumber = 0;

  constructor(
    private authService: AuthService,
    private teamService: TeamService
  ) {
    this.initLastIssueNumber();
  }

  private get issuesCollection(): CollectionReference<DocumentData> {
    return collection(this.firestore, this.COLLECTION_NAME);
  }

  private async initLastIssueNumber(): Promise<void> {
    try {
      const q = query(this.issuesCollection, orderBy('issueNumber', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        this.lastIssueNumber = parseInt(data['issueNumber'].replace('ISSUE-', '')) || 0;
      }
    } catch (error) {
      console.error('最後の課題番号の取得に失敗しました:', error);
      this.lastIssueNumber = 0;
    }
  }

  private getNextIssueNumber(): string {
    this.lastIssueNumber++;
    return `ISSUE-${String(this.lastIssueNumber).padStart(5, '0')}`;
  }

  private convertToIssue(doc: DocumentSnapshot<DocumentData>): Issue {
    const data = doc.data();
    if (!data) {
      throw new Error('ドキュメントデータが存在しません');
    }
    return {
      ...data,
      id: doc.id,
      dueDate: data['dueDate']?.toDate() || new Date(),
      occurrenceDate: data['occurrenceDate']?.toDate(),
      createdAt: data['createdAt']?.toDate() || new Date(),
      updatedAt: data['updatedAt']?.toDate() || new Date()
    } as Issue;
  }

  private async getIssuesQuery(teamId?: string): Promise<Query<DocumentData>> {
    const currentUser = await firstValueFrom(this.authService.currentUser$);
    if (!currentUser) {
      throw new Error('認証が必要です');
    }

    const issuesCollection = collection(this.firestore, 'issues');
    if (teamId) {
      return query(issuesCollection, where('teamId', '==', teamId));
    } else {
      return query(issuesCollection, where('userId', '==', currentUser.uid));
    }
  }

  async getIssues(teamId?: string): Promise<Issue[]> {
    try {
      const querySnapshot = await getDocs(await this.getIssuesQuery(teamId));
      return querySnapshot.docs.map(doc => this.convertToIssue(doc));
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
      throw error;
    }
  }

  async addIssue(issue: Partial<Issue>): Promise<string> {
    const currentUser = await firstValueFrom(this.authService.currentUser$);
    if (!currentUser) throw new Error('認証が必要です');

    if (issue.teamId) {
      const team = await this.teamService.getTeam(issue.teamId);
      const hasPermission = this.teamService.checkTeamPermission(team, currentUser.uid, 'editor');
      if (!hasPermission) {
        throw new Error('権限がありません');
      }
    }

    const newIssue = {
      ...issue,
      issueNumber: this.getNextIssueNumber(),
      userId: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(this.issuesCollection, newIssue);
    return docRef.id;
  }

  async getIssue(id: string): Promise<Issue | null> {
    try {
      const docRef = doc(this.firestore, 'issues', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertToIssue(docSnap);
      }
      return null;
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
      throw error;
    }
  }

  async updateIssue(issueId: string, updates: Partial<Issue>): Promise<void> {
    const currentUser = await firstValueFrom(this.authService.currentUser$);
    if (!currentUser) throw new Error('認証が必要です');

    const issue = await this.getIssue(issueId);
    if (!issue) throw new Error('課題が見つかりません');

    if (issue.teamId) {
      const team = await this.teamService.getTeam(issue.teamId);
      const hasPermission = this.teamService.checkTeamPermission(team, currentUser.uid, 'editor');
      if (!hasPermission) {
        throw new Error('権限がありません');
      }
    } else if (issue.userId !== currentUser.uid) {
      throw new Error('権限がありません');
    }

    const docRef = doc(this.issuesCollection, issueId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteIssue(issueId: string): Promise<void> {
    const currentUser = await firstValueFrom(this.authService.currentUser$);
    if (!currentUser) throw new Error('認証が必要です');

    const issue = await this.getIssue(issueId);
    if (!issue) throw new Error('課題が見つかりません');

    if (issue.teamId) {
      const team = await this.teamService.getTeam(issue.teamId);
      const hasPermission = this.teamService.checkTeamPermission(team, currentUser.uid, 'admin');
      if (!hasPermission) {
        throw new Error('権限がありません');
      }
    } else if (issue.userId !== currentUser.uid) {
      throw new Error('権限がありません');
    }

    const docRef = doc(this.issuesCollection, issueId);
    await deleteDoc(docRef);
  }

  getIssueSummary(): Observable<IssueSummary> {
    return new Observable<IssueSummary>(observer => {
      const q = query(this.issuesCollection, orderBy('issueNumber', 'asc'));

      const unsubscribe = onSnapshot(q, snapshot => {
        const issues = snapshot.docs.map(doc => doc.data());
        const total = issues.length;
        const completed = issues.filter(i => i['status'] === '完了').length;
        const inProgress = issues.filter(i => i['status'] === '対応中').length;
        const notStarted = issues.filter(i => i['status'] === '未着手').length;
        const dueSoonIssues = issues.filter(i => !i['dueDate'] || this.isWithinDays(i['dueDate'] as Date, 7));

        observer.next({
          totalIssues: total,
          completedIssues: completed,
          inProgressIssues: inProgress,
          notStartedIssues: notStarted,
          upcomingDeadlines: dueSoonIssues as Issue[]
        } as IssueSummary);
      }, error => {
        console.error('Error fetching issue summary:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async getOverdueIssues(): Promise<Issue[]> {
    const issues = await this.getIssues();
    return issues.filter(issue => 
      issue.dueDate < new Date() && issue.status !== '完了'
    );
  }

  async getDueSoonIssues(daysThreshold: number = 7): Promise<Issue[]> {
    const issues = await this.getIssues();
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return issues.filter(issue => 
      issue.dueDate > now && issue.dueDate <= threshold && issue.status !== '完了'
    );
  }

  async searchIssues(params: {
    searchText?: string;
    status?: string;
    priority?: '高' | '中' | '低';
    startDate?: Date;
    endDate?: Date;
    assignee?: string;
    teamId?: string;
  }): Promise<Issue[]> {
    const currentUser = await firstValueFrom(this.authService.currentUser$);
    if (!currentUser) return [];

    let issues: Issue[] = [];
    const { searchText, status, priority, startDate, endDate, assignee, teamId } = params;

    try {
      const conditions: QueryConstraint[] = [];

      if (teamId) {
        conditions.push(where('teamId', '==', teamId));
      } else {
        conditions.push(where('userId', '==', currentUser.uid));
      }

      if (status && status !== 'すべて') {
        conditions.push(where('status', '==', status));
      }

      if (priority) {
        conditions.push(where('priority', '==', priority));
      }

      if (assignee && assignee !== 'すべて') {
        conditions.push(where('assignee', '==', assignee));
      }

      if (startDate) {
        conditions.push(where('dueDate', '>=', startDate));
      }

      if (endDate) {
        conditions.push(where('dueDate', '<=', endDate));
      }

      const q = query(this.issuesCollection, ...conditions, orderBy('dueDate', 'asc'));
      const snapshot = await getDocs(q);
      
      issues = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Issue))
        .filter(issue => {
          if (!searchText) return true;
          
          const searchQuery = searchText.toLowerCase();
          return (
            issue.title?.toLowerCase().includes(searchQuery) ||
            issue.description?.toLowerCase().includes(searchQuery) ||
            issue.completionCriteria?.toLowerCase().includes(searchQuery) ||
            issue.solution?.toLowerCase().includes(searchQuery)
          );
        });

      return issues;
    } catch (error) {
      console.error('課題の検索に失敗しました:', error);
      return [];
    }
  }

  // 担当者一覧を取得
  async getAssignees(): Promise<string[]> {
    const querySnapshot = await getDocs(this.issuesCollection);
    
    // 担当者の重複を除去して返す
    const assignees = new Set<string>();
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data['assignee']) {
        assignees.add(data['assignee']);
      }
    });
    
    return Array.from(assignees).sort();
  }

  private isWithinDays(date: Date, days: number): boolean {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + days);
    return date <= threshold && date >= now;
  }
}