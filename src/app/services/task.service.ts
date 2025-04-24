import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from '@angular/fire/firestore';
import { Task } from '../models/task.model';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private teamService: TeamService
  ) {}

  // チームの課題を取得
  async getTeamTasks(teamId: string): Promise<Task[]> {
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(
      tasksRef,
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()['createdAt']?.toDate(),
      updatedAt: doc.data()['updatedAt']?.toDate(),
      dueDate: doc.data()['dueDate']?.toDate()
    } as Task));
  }

  // ユーザーが所属する全てのチームの課題を取得
  async getUserTeamTasks(): Promise<Task[]> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    // ユーザーが所属するチームを取得
    const teams = await this.teamService.getUserTeams();
    if (!teams.length) return [];

    // 各チームの課題を取得
    const allTasks: Task[] = [];
    for (const team of teams) {
      const tasks = await this.getTeamTasks(team.id);
      allTasks.push(...tasks);
    }

    // 作成日時の降順でソート
    return allTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // 課題を作成
  async createTask(teamId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const now = new Date();
    const taskRef = await addDoc(collection(this.firestore, 'tasks'), {
      ...taskData,
      teamId,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now
    });

    return {
      id: taskRef.id,
      ...taskData,
      teamId,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now
    };
  }

  // 課題を更新
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const taskRef = doc(this.firestore, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date()
    });
  }

  // 課題を削除
  async deleteTask(taskId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    await deleteDoc(doc(this.firestore, 'tasks', taskId));
  }
} 