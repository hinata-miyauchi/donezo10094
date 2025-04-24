import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team, TeamMembership, TeamMember, TeamRole } from '../../../models/team.model';
import { Subscription } from 'rxjs';
import { MessageService } from '../../../services/message.service';

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
  pendingInvitations: any[] = [];
  receivedInvitations: any[] = [];
  private subscriptions = new Subscription();
  isSubmitting = false;
  showTeamForm = true;

  constructor(
    private teamService: TeamService,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService
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
    this.loadReceivedInvitations();
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

  async onSubmitTeam(): Promise<void> {
    if (this.teamForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    try {
      const formValue = this.teamForm.value;
      await this.teamService.createTeam(
        formValue.name,
        formValue.description || ''
      );
      await this.loadTeams();
      this.teamForm.reset();
      this.showTeamForm = false;
    } catch (error) {
      console.error('チームの作成に失敗しました:', error);
      alert('チームの作成に失敗しました');
    } finally {
      this.isSubmitting = false;
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
    if (this.inviteForm.invalid || !this.selectedTeam) return;

    try {
      this.isLoading = true;
      const result = await this.teamService.createTeamInvitation(
        this.selectedTeam.id,
        this.inviteForm.value.email
      );
      
      // 結果に基づいてメッセージを表示
      if (result.success) {
        this.messageService.showSuccess(result.message);
        this.inviteForm.reset();
      } else {
        this.messageService.showInfo(result.message);
      }

      // 招待リストを更新
      await this.loadPendingInvitations();
    } catch (error: any) {
      console.error('メンバーの招待に失敗しました:', error);
      this.messageService.showError(error.message || 'メンバーの招待に失敗しました');
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

  async selectTeam(team: Team): Promise<void> {
    this.selectedTeam = team;
    
    // デバッグ情報
    const currentUser = this.authService.currentUser;
    const isCreator = team.adminId === currentUser?.uid;
    const isAdminRole = team.members.some(member => 
      member.uid === currentUser?.uid && member.role === 'admin'
    );
    
    console.log('Selected Team:', {
      teamId: team.id,
      teamName: team.name,
      adminId: team.adminId,
      currentUserId: currentUser?.uid,
      isCreator,
      isAdminRole,
      isAdmin: this.isTeamAdmin(team),
      currentUserRole: team.members.find(m => m.uid === currentUser?.uid)?.role
    });
    
    await this.loadPendingInvitations();
  }

  private async loadPendingInvitations(): Promise<void> {
    if (!this.selectedTeam) return;

    try {
      this.pendingInvitations = await this.teamService.getTeamInvitations(this.selectedTeam.id);
      console.log('Loaded pending invitations:', this.pendingInvitations.length); // デバッグ用
    } catch (error) {
      console.error('招待情報の読み込みに失敗しました:', error);
      this.messageService.showError('招待情報の読み込みに失敗しました');
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    if (!confirm('この招待をキャンセルしてもよろしいですか？')) return;

    try {
      this.isLoading = true;
      await this.teamService.cancelInvitation(invitationId);
      await this.loadPendingInvitations();
    } catch (error) {
      console.error('招待のキャンセルに失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  isTeamAdmin(team: Team | null): boolean {
    if (!team) return false;
    
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    
    // チームの作成者（adminId）または管理者ロールを持つメンバーをチーム管理者として認識
    const isCreator = team.adminId === currentUser.uid;
    const isAdminRole = team.members.some(member => 
      member.uid === currentUser.uid && member.role === 'admin'
    );
    
    return isCreator || isAdminRole;
  }

  // チームの作成者かどうかを判定
  isTeamCreator(team: Team | null): boolean {
    if (!team) return false;
    
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    
    return team.adminId === currentUser.uid;
  }

  private async loadReceivedInvitations(): Promise<void> {
    try {
      this.receivedInvitations = await this.teamService.getUserInvitations();
    } catch (error) {
      console.error('招待情報の読み込みに失敗しました:', error);
    }
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    try {
      this.isLoading = true;
      await this.teamService.acceptInvitation(invitationId);
      setTimeout(async () => {
        await this.loadTeams();
        await this.loadReceivedInvitations();
        this.isLoading = false;
      }, 1000);
    } catch (error) {
      console.error('招待の承認に失敗しました:', error);
      this.isLoading = false;
    }
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    if (!confirm('この招待を拒否してもよろしいですか？')) return;

    try {
      this.isLoading = true;
      await this.teamService.rejectInvitation(invitationId);
      await this.loadReceivedInvitations();
    } catch (error) {
      console.error('招待の拒否に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }
} 