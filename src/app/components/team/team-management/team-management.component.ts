import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team, TeamMembership } from '../../../models/team.model';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">チーム管理</h1>
        
        <!-- チーム作成フォーム -->
        <div class="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 class="text-xl font-semibold mb-4">新しいチームを作成</h2>
          <form (ngSubmit)="createTeam()" class="space-y-4">
            <div>
              <label for="teamName" class="block text-sm font-medium text-gray-700">チーム名</label>
              <input
                type="text"
                id="teamName"
                [(ngModel)]="newTeam.name"
                name="teamName"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
            </div>
            <div>
              <label for="teamDescription" class="block text-sm font-medium text-gray-700">説明</label>
              <textarea
                id="teamDescription"
                [(ngModel)]="newTeam.description"
                name="teamDescription"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              ></textarea>
            </div>
            <button
              type="submit"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              チームを作成
            </button>
          </form>
        </div>

        <!-- チーム一覧 -->
        <div class="space-y-6">
          <h2 class="text-xl font-semibold">所属チーム一覧</h2>
          <div *ngFor="let team of teams" class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-lg font-medium">{{team.name}}</h3>
                <p class="text-gray-600">{{team.description}}</p>
              </div>
              <div class="flex space-x-2">
                <button
                  *ngIf="isTeamAdmin(team)"
                  (click)="showInviteForm(team)"
                  class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  メンバーを招待
                </button>
                <button
                  *ngIf="isTeamAdmin(team)"
                  (click)="deleteTeam(team.id)"
                  class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                >
                  削除
                </button>
              </div>
            </div>

            <!-- メンバー一覧 -->
            <div class="mt-4">
              <h4 class="text-sm font-medium text-gray-700 mb-2">メンバー</h4>
              <ul class="divide-y divide-gray-200">
                <li *ngFor="let member of team.members" class="py-2 flex justify-between items-center">
                  <div class="flex items-center">
                    <img
                      [src]="member.photoURL || 'assets/default-avatar.png'"
                      alt="User avatar"
                      class="h-8 w-8 rounded-full mr-3"
                    >
                    <span>{{member.displayName}}</span>
                  </div>
                  <div *ngIf="isTeamAdmin(team)" class="flex items-center space-x-2">
                    <select
                      [(ngModel)]="member.role"
                      (change)="updateMemberRole(team.id, member.uid, member.role)"
                      class="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="viewer">閲覧者</option>
                      <option value="editor">編集者</option>
                      <option value="admin">管理者</option>
                    </select>
                    <button
                      (click)="removeMember(team.id, member.uid)"
                      class="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TeamManagementComponent implements OnInit {
  teams: Team[] = [];
  newTeam = {
    name: '',
    description: ''
  };

  constructor(
    private teamService: TeamService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadTeams();
  }

  async loadTeams() {
    try {
      this.teams = await this.teamService.getUserTeams();
    } catch (error) {
      console.error('チームの読み込みエラー:', error);
    }
  }

  async createTeam() {
    try {
      await this.teamService.createTeam({
        name: this.newTeam.name,
        description: this.newTeam.description
      });
      this.newTeam.name = '';
      this.newTeam.description = '';
      await this.loadTeams();
    } catch (error) {
      console.error('チーム作成エラー:', error);
    }
  }

  async deleteTeam(teamId: string) {
    if (confirm('このチームを削除してもよろしいですか？')) {
      try {
        await this.teamService.deleteTeam(teamId);
        await this.loadTeams();
      } catch (error) {
        console.error('チーム削除エラー:', error);
      }
    }
  }

  isTeamAdmin(team: Team): boolean {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    
    const membership = team.members.find(m => m.uid === currentUser.uid);
    return membership?.role === 'admin';
  }

  async updateMemberRole(teamId: string, userId: string, newRole: 'viewer' | 'editor' | 'admin') {
    try {
      await this.teamService.updateTeamMemberRole(teamId, userId, newRole);
      await this.loadTeams();
    } catch (error) {
      console.error('メンバーロール更新エラー:', error);
    }
  }

  async removeMember(teamId: string, userId: string) {
    if (confirm('このメンバーを削除してもよろしいですか？')) {
      try {
        await this.teamService.removeTeamMember(teamId, userId);
        await this.loadTeams();
      } catch (error) {
        console.error('メンバー削除エラー:', error);
      }
    }
  }

  showInviteForm(team: Team) {
    const email = prompt('招待するユーザーのメールアドレスを入力してください:');
    if (email) {
      this.inviteMember(team.id, email);
    }
  }

  async inviteMember(teamId: string, email: string) {
    try {
      await this.teamService.createTeamInvitation(teamId, email);
      alert('招待を送信しました');
    } catch (error) {
      console.error('メンバー招待エラー:', error);
      alert('招待の送信に失敗しました');
    }
  }
} 