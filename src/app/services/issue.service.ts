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
import { TeamRole } from '../models/team.model';
import { Comment } from '../interfaces/comment.interface';

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

    // 日付フィールドの変換を行うヘルパー関数
    const convertToDate = (field: any): Date => {
      if (!field) return new Date();
      if (field instanceof Date) return field;
      if (typeof field.toDate === 'function') return field.toDate();
      if (field.seconds) return new Date(field.seconds * 1000);
      if (typeof field === 'string') return new Date(field);
      return new Date();
    };

    return {
      ...data,
      id: doc.id,
      dueDate: convertToDate(data['dueDate']),
      occurrenceDate: data['occurrenceDate'] ? convertToDate(data['occurrenceDate']) : undefined,
      createdAt: convertToDate(data['createdAt']),
      updatedAt: convertToDate(data['updatedAt'])
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

  private async checkTeamIssuePermission(teamId: string | undefined, currentUser: { uid: string } | null, requiredRole: TeamRole): Promise<boolean> {
    if (!teamId || !currentUser) return false;

    const team = await this.teamService.getTeam(teamId);
    if (!team) return false;

    return this.teamService.checkTeamPermission(team, currentUser.uid, requiredRole);
  }

  async addIssue(issue: Partial<Issue>): Promise<string> {
    const currentUser = this.authService.currentUser;
    if (!currentUser) throw new Error('認証が必要です');

    if (issue.teamId) {
      const hasPermission = await this.checkTeamIssuePermission(issue.teamId, currentUser, 'member');
      if (!hasPermission) throw new Error('権限がありません');
    }

    // 課題番号を生成
    await this.initLastIssueNumber(); // 最新の課題番号を取得
    const issueNumber = this.getNextIssueNumber();

    const newIssue: Issue = {
      ...issue,
      issueNumber,
      createdBy: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || ''
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0
    } as Issue;

    const docRef = await addDoc(collection(this.firestore, 'issues'), newIssue);
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
    const currentUser = this.authService.currentUser;
    if (!currentUser) throw new Error('認証が必要です');

    const issue = await this.getIssue(issueId);
    if (!issue) throw new Error('課題が見つかりません');

    if (issue.teamId) {
      const hasPermission = await this.checkTeamIssuePermission(issue.teamId, currentUser, 'member');
      if (!hasPermission) throw new Error('権限がありません');
    }

    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await updateDoc(doc(this.firestore, 'issues', issueId), updateData);
  }

  async deleteIssue(issueId: string): Promise<void> {
    const currentUser = this.authService.currentUser;
    if (!currentUser) throw new Error('認証が必要です');

    const issue = await this.getIssue(issueId);
    if (!issue) throw new Error('課題が見つかりません');

    if (issue.teamId) {
      const hasPermission = await this.checkTeamIssuePermission(issue.teamId, currentUser, 'admin');
      if (!hasPermission) throw new Error('権限がありません');
    }

    await deleteDoc(doc(this.firestore, 'issues', issueId));
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

  // コメントを追加
  async addComment(data: {
    issueId: string;
    content: string;
    mentions: string[];
    authorId: string;
  }): Promise<void> {
    try {
      console.log('=== コメント追加開始 ===');
      console.log('入力データ:', data);

      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        throw new Error('認証が必要です');
      }

      // 課題の詳細を取得
      const issue = await this.getIssue(data.issueId);
      if (!issue) {
        throw new Error('課題が見つかりません');
      }

      console.log('課題情報:', issue);

      // メッセージデータを作成
      const messageData = {
        content: data.content,
        issueId: data.issueId,
        issueTitle: issue.title || '無題の課題',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Unknown User',
        senderPhotoURL: currentUser.photoURL || '',
        timestamp: serverTimestamp(),
        mentions: data.mentions,
        type: 'comment',
        read: false
      };

      console.log('保存するメッセージデータ:', messageData);

      // chat-messagesコレクションにメッセージを保存
      const chatMessagesRef = collection(this.firestore, 'chat-messages');
      const docRef = await addDoc(chatMessagesRef, messageData);

      console.log('コメントが保存されました:', {
        id: docRef.id,
        content: data.content,
        mentions: data.mentions,
        issueId: data.issueId
      });

      // 保存されたデータを確認
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
        console.log('保存されたコメントデータ:', savedDoc.data());
      } else {
        console.error('コメントドキュメントが見つかりません');
      }

      console.log('=== コメント追加完了 ===');
    } catch (error) {
      console.error('コメントの追加に失敗しました:', error);
      throw error;
    }
  }

  // コメントを取得
  async getComments(issueId: string): Promise<Comment[]> {
    const messagesRef = collection(this.firestore, 'chat-messages');
    const q = query(
      messagesRef,
      where('issueId', '==', issueId),
      where('type', '==', 'comment'),
      orderBy('timestamp', 'desc')
    );

    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()['timestamp']?.toDate(),
        updatedAt: doc.data()['timestamp']?.toDate()
      } as Comment));
    } catch (error: any) {
      // インデックスが必要な場合のエラー処理
      if (error.code === 'failed-precondition') {
        // インデックスなしで取得を試みる
        const simpleQuery = query(
          messagesRef,
          where('issueId', '==', issueId),
          where('type', '==', 'comment')
        );
        const snapshot = await getDocs(simpleQuery);
        const comments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['timestamp']?.toDate(),
          updatedAt: doc.data()['timestamp']?.toDate()
        } as Comment));
        
        // メモリ上でソート
        return comments.sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        );
      }
      throw error;
    }
  }

  // メンション通知を送信（非推奨 - NotificationServiceを使用してください）
  private async sendMentionNotifications(userIds: string[], issueId: string, content: string) {
    console.warn('このメソッドは非推奨です。代わりにNotificationServiceを使用してください。');
  }
}