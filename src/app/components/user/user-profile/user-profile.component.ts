import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { TeamService } from '../../../services/team.service';
import { Team } from '../../../models/team.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  appSettingsForm: FormGroup;
  profileImageUrl: string | null = null;
  userEmail: string | null = null;
  isSubmitting = false;
  teams: Team[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private teamService: TeamService
  ) {
    this.profileForm = this.fb.group({
      displayName: ['']
    });

    this.appSettingsForm = this.fb.group({
      defaultView: ['list'],
      calendarView: ['month']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          displayName: user.displayName || ''
        });
        this.profileImageUrl = user.photoURL || null;
        this.userEmail = user.email;
      }
    });
    this.loadUserTeams();
  }

  async loadUserTeams() {
    try {
      this.teams = await this.teamService.getUserTeams();
    } catch (error) {
      console.error('チームの読み込みに失敗しました:', error);
    }
  }

  isTeamAdmin(team: Team): boolean {
    return this.teamService.isTeamAdmin(team);
  }

  isTeamCreator(team: Team): boolean {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    return team.adminId === currentUser.uid;
  }

  async onProfileSubmit(): Promise<void> {
    if (this.profileForm.invalid || this.isSubmitting) {
      return;
    }

    try {
      this.isSubmitting = true;
      await this.authService.updateProfile(this.profileForm.value);
      console.log('プロフィールが更新されました');
    } catch (error) {
      console.error('プロフィールの更新に失敗しました:', error);
      alert('プロフィールの更新に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      this.isSubmitting = true;
      await this.authService.updateProfilePhoto(file);
      console.log('プロフィール画像が更新されました');
    } catch (error) {
      console.error('プロフィール画像の更新に失敗しました:', error);
      alert('プロフィール画像の更新に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }

  async onAppSettingsSubmit(): Promise<void> {
    if (this.appSettingsForm.invalid || this.isSubmitting) {
      return;
    }

    try {
      this.isSubmitting = true;
      // TODO: アプリケーション設定の保存処理を実装
      console.log('アプリケーション設定が更新されました');
    } catch (error) {
      console.error('アプリケーション設定の更新に失敗しました:', error);
      alert('アプリケーション設定の更新に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }
} 