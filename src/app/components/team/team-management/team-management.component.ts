import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team, TeamMembership, TeamMember, TeamRole } from '../../../models/team.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-team-management',
  templateUrl: './team-management.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class TeamManagementComponent implements OnInit, OnDestroy {
  teams: Team[] = [];
  selectedTeam: Team | null = null;
  teamForm: FormGroup;
  inviteForm: FormGroup;
  isLoading = false;
  private subscriptions = new Subscription();

  constructor(
    private teamService: TeamService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });

    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadTeams(): Promise<void> {
    try {
      this.isLoading = true;
      this.teams = await this.teamService.getUserTeams();
    } catch (error) {
      console.error('チームの読み込みに失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createTeam(): Promise<void> {
    if (this.teamForm.invalid) return;

    try {
      this.isLoading = true;
      await this.teamService.createTeam(this.teamForm.value);
      this.teamForm.reset();
      await this.loadTeams();
    } catch (error) {
      console.error('チームの作成に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteTeam(teamId: string): Promise<void> {
    if (!confirm('このチームを削除してもよろしいですか？')) return;

    try {
      this.isLoading = true;
      await this.teamService.deleteTeam(teamId);
      await this.loadTeams();
      this.selectedTeam = null;
    } catch (error) {
      console.error('チームの削除に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async inviteMember(teamId: string): Promise<void> {
    if (this.inviteForm.invalid) return;

    try {
      this.isLoading = true;
      await this.teamService.createTeamInvitation(teamId, this.inviteForm.value.email);
      this.inviteForm.reset();
    } catch (error) {
      console.error('メンバーの招待に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    if (!confirm('このメンバーを削除してもよろしいですか？')) return;

    try {
      this.isLoading = true;
      await this.teamService.removeTeamMember(teamId, memberId);
      await this.loadTeams();
    } catch (error) {
      console.error('メンバーの削除に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  handleRoleChange(event: Event, teamId: string, memberId: string): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as TeamRole;
    this.updateMemberRole(teamId, memberId, newRole);
  }

  private async updateMemberRole(teamId: string, memberId: string, newRole: TeamRole): Promise<void> {
    try {
      this.isLoading = true;
      await this.teamService.updateTeamMemberRole(teamId, memberId, newRole);
      await this.loadTeams();
    } catch (error) {
      console.error('メンバーの役割の更新に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
  }

  isTeamAdmin(team: Team): boolean {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    
    const membership = team.members.find(m => m.uid === currentUser.uid);
    return membership?.role === 'admin';
  }
} 