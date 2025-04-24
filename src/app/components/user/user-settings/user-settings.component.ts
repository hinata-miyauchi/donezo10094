import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team } from '../../../models/team.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class UserSettingsComponent implements OnInit, OnDestroy {
  userTeams: Team[] = [];
  isLoading = true;
  isSubmitting = false;
  showTeamForm = false;
  teamForm: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private authService: AuthService,
    private router: Router
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']  // 説明は任意項目に変更
    });
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadTeams(): Promise<void> {
    try {
      this.userTeams = await this.teamService.getUserTeams();
    } catch (error) {
      console.error('チームの取得に失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  toggleTeamForm(): void {
    this.showTeamForm = !this.showTeamForm;
    if (!this.showTeamForm) {
      this.teamForm.reset();
    }
  }

  async onSubmitTeam(): Promise<void> {
    if (this.teamForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.teamForm.value;
      const teamId = await this.teamService.createTeam({
        name: formValue.name,
        description: formValue.description
      });

      console.log('チームが作成されました:', teamId);

      // 新しいチームを追加した後、リストを更新
      this.userTeams = await this.teamService.getUserTeams();
      this.toggleTeamForm();
      
      // 成功メッセージを表示
      alert('チームが作成されました');
    } catch (error) {
      console.error('チームの作成に失敗しました:', error);
      alert('チームの作成に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }

  async leaveTeam(teamId: string): Promise<void> {
    if (!confirm('このチームから退出してもよろしいですか？')) {
      return;
    }

    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) throw new Error('ユーザーが認証されていません');
      
      await this.teamService.leaveTeam(teamId, currentUser.uid);
      this.userTeams = this.userTeams.filter(team => team.id !== teamId);
      alert('チームから退出しました');
    } catch (error) {
      console.error('チームからの退出に失敗しました:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('チームからの退出に失敗しました。もう一度お試しください。');
      }
    }
  }

  navigateToTeamSettings(teamId: string): void {
    this.router.navigate(['/teams', teamId, 'settings']);
  }

  getErrorMessage(controlName: string): string {
    const control = this.teamForm.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'この項目は必須です';
    if (errors['minlength']) return `最低${errors['minlength'].requiredLength}文字必要です`;
    
    return '入力値が不正です';
  }

  isTeamAdmin(team: Team): boolean {
    const currentUser = this.authService.currentUser;
    return currentUser?.uid === team.adminId;
  }

  async deleteTeam(teamId: string): Promise<void> {
    if (!confirm('このチームを削除してもよろしいですか？\nこの操作は取り消せません。')) {
      return;
    }

    try {
      await this.teamService.deleteTeam(teamId);
      this.userTeams = this.userTeams.filter(team => team.id !== teamId);
      alert('チームを削除しました');
    } catch (error) {
      console.error('チームの削除に失敗しました:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('チームの削除に失敗しました。もう一度お試しください。');
      }
    }
  }
} 