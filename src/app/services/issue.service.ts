// src/app/services/issue.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, of } from 'rxjs';
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
  QuerySnapshot,
  DocumentData,
  getDoc
} from '@angular/fire/firestore';
import { Issue, IssueSummary } from '../models/issue.model';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  private issuesCollection;
  private lastIssueNumber = 0;

  constructor(private firestore: Firestore) {
    this.issuesCollection = collection(this.firestore, 'issues');
    this.initLastIssueNumber();
  }

  private async initLastIssueNumber(): Promise<void> {
    const snapshot = await getDocs(query(this.issuesCollection, orderBy('issueNumber', 'desc')));
    if (!snapshot.empty) {
      this.lastIssueNumber = snapshot.docs[0].data()['issueNumber'];
    }
  }

  getIssues(): Observable<Issue[]> {
    return new Observable<Issue[]>(observer => {
      const q = query(this.issuesCollection, orderBy('issueNumber', 'asc'));
      const unsubscribe = onSnapshot(q, snapshot => {
        const issues = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            issueNumber: data['issueNumber'] || '',
            title: data['title'] || '',
            description: data['description'] || '',
            status: data['status'] || '未着手',
            importance: data['importance'] || '低',
            dueDate: data['dueDate']?.toDate() || new Date(),
            completionCriteria: data['completionCriteria'] || '',
            solution: data['solution'] || '',
            occurrenceDate: data['occurrenceDate']?.toDate() || new Date(),
            assignee: data['assignee'] || '',
            progress: data['progress'] || 0,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            createdBy: data['createdBy']
          } as Issue;
        });
        observer.next(issues);
      }, error => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async addIssue(issue: Omit<Issue, 'id' | 'issueNumber'>): Promise<void> {
    this.lastIssueNumber++;
    const newIssue = {
      ...issue,
      issueNumber: this.lastIssueNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await addDoc(this.issuesCollection, newIssue);
  }

  async getIssue(id: string): Promise<Issue | null> {
    try {
      const docRef = doc(this.firestore, 'issues', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          issueNumber: data['issueNumber'] || '',
          title: data['title'] || '',
          description: data['description'] || '',
          status: data['status'] || '未着手',
          importance: data['importance'] || '低',
          dueDate: data['dueDate']?.toDate() || new Date(),
          completionCriteria: data['completionCriteria'] || '',
          solution: data['solution'] || '',
          occurrenceDate: data['occurrenceDate']?.toDate() || new Date(),
          assignee: data['assignee'] || '',
          progress: data['progress'] || 0,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
          createdBy: data['createdBy']
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
      const updateData = {
        ...issue,
        updatedAt: new Date()
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('課題の更新に失敗しました:', error);
      throw error;
    }
  }

  async deleteIssue(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'issues', id);
    await deleteDoc(docRef);
  }

  getIssueSummary(): Observable<IssueSummary> {
    return this.getIssues().pipe(
      map(issues => {
        const total = issues.length;
        const completed = issues.filter(i => i.status === '完了').length;
        const inProgress = issues.filter(i => i.status === '対応中').length;
        const notStarted = issues.filter(i => i.status === '未着手').length;
        const overdue = issues.filter(i => {
          return new Date(i.dueDate) < new Date() && i.status !== '完了';
        }).length;
        const averageProgress = issues.reduce((acc, curr) => acc + curr.progress, 0) / total;

        return {
          total,
          completed,
          inProgress,
          notStarted,
          overdue,
          averageProgress
        };
      })
    );
  }

  getOverdueIssues(): Observable<Issue[]> {
    return this.getIssues().pipe(
      map(issues => issues.filter(issue => 
        issue.dueDate < new Date() && issue.status !== '完了'
      ))
    );
  }

  getDueSoonIssues(daysThreshold: number = 7): Observable<Issue[]> {
    return this.getIssues().pipe(
      map(issues => {
        const now = new Date();
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + daysThreshold);

        return issues.filter(issue => {
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
      map(issues => issues.filter(issue => {
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