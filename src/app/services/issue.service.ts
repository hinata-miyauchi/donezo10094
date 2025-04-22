// src/app/services/issue.service.ts
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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
  serverTimestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Issue, IssueSummary } from '../models/issue.model';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  private firestore: Firestore;
  private lastIssueNumber = 0;

  constructor() {
    this.firestore = getFirestore();
    this.initLastIssueNumber();
  }

  private async initLastIssueNumber(): Promise<void> {
    try {
      const issuesCollection = collection(this.firestore, 'issues');
      const q = query(issuesCollection, orderBy('issueNumber', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        this.lastIssueNumber = data['issueNumber'] || 0;
      }
    } catch (error) {
      console.error('最後の課題番号の取得に失敗しました:', error);
      this.lastIssueNumber = 0;
    }
  }

  getIssues(): Observable<Issue[]> {
    const issuesCollection = collection(this.firestore, 'issues');
    const q = query(issuesCollection, orderBy('issueNumber', 'asc'));
    
    return new Observable<Issue[]>(observer => {
      const unsubscribe = onSnapshot(q, snapshot => {
        const issues = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            issueNumber: data['issueNumber'].toString(),
            title: data['title'] || '',
            description: data['description'] || '',
            status: data['status'] || '未着手',
            importance: data['importance'] || '低',
            dueDate: data['dueDate'].toDate(),
            completionCriteria: data['completionCriteria'] || '',
            solution: data['solution'] || '',
            occurrenceDate: data['occurrenceDate'].toDate(),
            assignee: data['assignee'] || '',
            progress: data['progress'] || 0,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            createdBy: data['createdBy'] || 'システム'
          } as Issue;
        });
        observer.next(issues);
      }, error => {
        console.error('Error fetching issues:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async addIssue(issue: Omit<Issue, 'id' | 'issueNumber'>): Promise<void> {
    try {
      const issuesCollection = collection(this.firestore, 'issues');
      this.lastIssueNumber++;
      
      const newIssue = {
        issueNumber: this.lastIssueNumber,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        importance: issue.importance,
        dueDate: issue.dueDate,
        completionCriteria: issue.completionCriteria,
        solution: issue.solution,
        occurrenceDate: issue.occurrenceDate,
        assignee: issue.assignee,
        progress: issue.progress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: issue.createdBy || 'システム'
      };

      await addDoc(issuesCollection, newIssue);
    } catch (error) {
      console.error('Error adding issue:', error);
      throw error;
    }
  }

  async getIssue(id: string): Promise<Issue | null> {
    try {
      const docRef = doc(this.firestore, 'issues', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          issueNumber: data['issueNumber'].toString(),
          title: data['title'] || '',
          description: data['description'] || '',
          status: data['status'] || '未着手',
          importance: data['importance'] || '低',
          dueDate: data['dueDate'].toDate(),
          completionCriteria: data['completionCriteria'] || '',
          solution: data['solution'] || '',
          occurrenceDate: data['occurrenceDate'].toDate(),
          assignee: data['assignee'] || '',
          progress: data['progress'] || 0,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
          createdBy: data['createdBy'] || 'システム'
        } as Issue;
      }
      return null;
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
      throw error;
    }
  }

  async updateIssue(id: string, issue: Partial<Issue>): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'issues', id);
      const updateData: any = {
        ...issue,
        updatedAt: serverTimestamp()
      };

      if (issue.issueNumber) {
        updateData.issueNumber = parseInt(issue.issueNumber, 10);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('課題の更新に失敗しました:', error);
      throw error;
    }
  }

  async deleteIssue(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'issues', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('課題の削除に失敗しました:', error);
      throw error;
    }
  }

  getIssueSummary(): Observable<IssueSummary> {
    return new Observable<IssueSummary>(observer => {
      const issuesCollection = collection(this.firestore, 'issues');
      const q = query(issuesCollection, orderBy('issueNumber', 'asc'));

      const unsubscribe = onSnapshot(q, snapshot => {
        const issues = snapshot.docs.map(doc => doc.data());
        const total = issues.length;
        const completed = issues.filter(i => i['status'] === '完了').length;
        const inProgress = issues.filter(i => i['status'] === '対応中').length;
        const notStarted = issues.filter(i => i['status'] === '未着手').length;
        const overdue = issues.filter(i => {
          return i['dueDate'].toDate() < new Date() && i['status'] !== '完了';
        }).length;
        const averageProgress = total > 0 
          ? issues.reduce((acc, curr) => acc + (curr['progress'] || 0), 0) / total 
          : 0;

        observer.next({
          total,
          completed,
          inProgress,
          notStarted,
          overdue,
          averageProgress
        });
      }, error => {
        console.error('Error fetching issue summary:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  getOverdueIssues(): Observable<Issue[]> {
    return this.getIssues().pipe(
      map((issues: Issue[]) => issues.filter(issue => 
        issue.dueDate < new Date() && issue.status !== '完了'
      ))
    );
  }

  getDueSoonIssues(daysThreshold: number = 7): Observable<Issue[]> {
    return this.getIssues().pipe(
      map((issues: Issue[]) => {
        const now = new Date();
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + daysThreshold);

        return issues.filter((issue: Issue) => {
          return issue.dueDate > now && issue.dueDate <= threshold && issue.status !== '完了';
        });
      })
    );
  }

  searchIssues(params: {
    query?: string;
    status?: string;
    importance?: string;
    startDate?: Date;
    endDate?: Date;
    assignee?: string;
  }): Observable<Issue[]> {
    return this.getIssues().pipe(
      map((issues: Issue[]) => issues.filter((issue: Issue) => {
        // キーワード検索
        if (params.query) {
          const searchStr = params.query.toLowerCase();
          const searchTargets = [
            issue.title || '',
            issue.description || '',
            issue.completionCriteria || '',
            issue.solution || ''
          ].map(str => str.toLowerCase());
          
          if (!searchTargets.some(target => target.includes(searchStr))) {
            return false;
          }
        }

        // ステータスフィルター
        if (params.status && issue.status !== params.status) {
          return false;
        }

        // 重要度フィルター
        if (params.importance && issue.importance !== params.importance) {
          return false;
        }

        // 担当者フィルター
        if (params.assignee && issue.assignee !== params.assignee) {
          return false;
        }

        // 期間フィルター
        if (params.startDate) {
          const startOfDay = new Date(params.startDate);
          startOfDay.setHours(0, 0, 0, 0);
          if (issue.dueDate < startOfDay) {
            return false;
          }
        }

        if (params.endDate) {
          const endOfDay = new Date(params.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (issue.dueDate > endOfDay) {
            return false;
          }
        }

        return true;
      }))
    );
  }
}