import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team } from '../../../models/team.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">課題一覧</h1>

        <div *ngIf="isLoading" class="text-center py-4">
          <p class="text-gray-500">読み込み中...</p>
        </div>

        <div *ngIf="!isLoading && tasks.length === 0" class="text-center py-4">
          <p class="text-gray-500">課題がありません</p>
        </div>

        <div *ngIf="!isLoading && tasks.length > 0" class="space-y-6">
          <div *ngFor="let task of tasks" class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900">{{ task.title }}</h2>
              <span [class]="getPriorityClass(task.priority)" class="px-3 py-1 rounded-full text-sm">
                {{ getPriorityLabel(task.priority) }}
              </span>
            </div>

            <div class="mt-2">
              <p class="text-gray-600">{{ task.description }}</p>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <span [class]="getStatusClass(task.status)" class="px-3 py-1 rounded-full text-sm">
                  {{ getStatusLabel(task.status) }}
                </span>
                <span class="text-sm text-gray-500">
                  期限: {{ task.dueDate ? (task.dueDate | date:'yyyy/MM/dd') : '未設定' }}
                </span>
              </div>

              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">
                  チーム: {{ getTeamName(task.teamId) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  teams: { [key: string]: Team } = {};
  isLoading = true;

  constructor(
    private taskService: TaskService,
    private teamService: TeamService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // チーム情報を取得
      const teams = await this.teamService.getUserTeams();
      this.teams = teams.reduce((acc, team) => {
        acc[team.id] = team;
        return acc;
      }, {} as { [key: string]: Team });

      // 課題を取得
      this.tasks = await this.taskService.getUserTeamTasks();
    } catch (error) {
      console.error('課題の取得に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getTeamName(teamId: string): string {
    return this.teams[teamId]?.name || '不明なチーム';
  }

  getPriorityLabel(priority: string): string {
    const labels = {
      low: '低',
      medium: '中',
      high: '高'
    };
    return labels[priority as keyof typeof labels] || '不明';
  }

  getPriorityClass(priority: string): string {
    const classes = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels = {
      pending: '未着手',
      in_progress: '進行中',
      completed: '完了'
    };
    return labels[status as keyof typeof labels] || '不明';
  }

  getStatusClass(status: string): string {
    const classes = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }
} 