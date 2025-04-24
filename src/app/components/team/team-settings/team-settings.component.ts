import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team } from '../../../models/team.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-team-settings',
  templateUrl: './team-settings.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class TeamSettingsComponent implements OnInit {
  team: Team | null = null;
  isLoading = true;
  isSubmitting = false;
  teamForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teamService: TeamService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadTeam();
  }

  private async loadTeam(): Promise<void> {
    try {
      const teamId = this.route.snapshot.paramMap.get('id');
      if (!teamId) {
        throw new Error('チームIDが見つかりません');
      }

      this.team = await this.teamService.getTeam(teamId);
      if (!this.team) {
        throw new Error('チームが見つかりません');
      }

      this.teamForm.patchValue({
        name: this.team.name,
        description: this.team.description
      });
    } catch (error) {
      console.error('チームの読み込みに失敗しました:', error);
      this.router.navigate(['/settings']);
    } finally {
      this.isLoading = false;
    }
  }

  isTeamCreator(): boolean {
    const currentUser = this.authService.currentUser;
    return currentUser != null && this.team != null && this.team.adminId === currentUser.uid;
  }

  async toggleAdminRole(userId: string, isAdmin: boolean): Promise<void> {
    if (!this.team) return;

    try {
      await this.teamService.toggleAdminRole(this.team.id, userId, isAdmin);
      await this.loadTeam(); // チーム情報を再読み込み
      alert(isAdmin ? '管理者権限を付与しました' : '管理者権限を削除しました');
    } catch (error) {
      console.error('権限の更新に失敗しました:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('権限の更新に失敗しました。もう一度お試しください。');
      }
    }
  }

  isMemberAdmin(userId: string): boolean {
    if (!this.team) return false;
    const member = this.team.members.find(m => m.uid === userId);
    return member?.role === 'admin';
  }

  navigateBack(): void {
    this.router.navigate(['/settings']);
  }
} 