import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team } from '../../../models/team.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { User } from '../../../models/user.model';
import { SortTeamsPipe } from '../../../pipes/sort-teams.pipe';
import { TeamInvitationsComponent } from '../../../components/team/team-invitations/team-invitations.component';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SortTeamsPipe,
    TeamInvitationsComponent
  ]
})
export class UserSettingsComponent implements OnInit, OnDestroy {
  user: User | null = null;
  displayName: string = '';
  userTeams: Team[] = [];
  isLoading = true;
  isSubmitting = false;
  showTeamForm = false;
  teamForm: FormGroup;
  private destroy$ = new Subject<void>();
  showAvatarModal = false;
  activeTab: 'profile' | 'teams' | 'invitations' = 'profile';

  // アバターイラストの配列
  readonly avatars = [
    { id: 1, url: 'assets/avatars/avatar-1.svg', name: 'ねこ', description: '好奇心旺盛な猫のアバター' },
    { id: 2, url: 'assets/avatars/avatar-2.svg', name: 'いぬ', description: '忠実な犬のアバター' },
    { id: 3, url: 'assets/avatars/avatar-3.svg', name: 'うさぎ', description: 'かわいいうさぎのアバター' },
    { id: 4, url: 'assets/avatars/avatar-4.svg', name: 'パンダ', description: 'のんびり屋のパンダのアバター' },
    { id: 5, url: 'assets/avatars/avatar-5.svg', name: 'きつね', description: '賢いキツネのアバター' },
    { id: 6, url: 'assets/avatars/avatar-6.svg', name: 'ペンギン', description: '愛らしいペンギンのアバター' },
  ];

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    // クエリパラメータの監視を追加
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['tab']) {
          this.activeTab = params['tab'] as 'profile' | 'teams' | 'invitations';
          console.log('Active tab set to:', this.activeTab); // デバッグ用
        }
      });

    this.loadUserData();
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData(): void {
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.user = user;
      this.displayName = user?.displayName || '';
    });
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
      await this.teamService.createTeam(
        formValue.name,
        formValue.description || ''
      );

      // 新しいチームを追加した後、リストを更新
      await this.loadTeams();
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
    if (!currentUser) return false;
    
    // 作成者は自動的に管理者権限を持つ
    if (team.adminId === currentUser.uid) return true;
    
    // それ以外のメンバーは role プロパティで判定
    const member = team.members.find(m => m.uid === currentUser.uid);
    return member?.role === 'admin';
  }

  isTeamCreator(team: Team): boolean {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    return team.adminId === currentUser.uid;
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

  async updateProfileImage(): Promise<void> {
    this.showAvatarModal = true;
  }

  closeAvatarModal(): void {
    this.showAvatarModal = false;
  }

  async selectAvatar(avatarUrl: string): Promise<void> {
    try {
      this.isSubmitting = true;
      await this.authService.updateProfilePhotoUrl(avatarUrl);
      if (this.user) {
        this.user.photoURL = avatarUrl;
      }
      this.showAvatarModal = false;
    } catch (error) {
      console.error('プロフィール画像の更新に失敗しました:', error);
      alert('プロフィール画像の更新に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }

  async updateProfile(): Promise<void> {
    try {
      await this.authService.updateProfile({
        displayName: this.displayName
      });
    } catch (error) {
      console.error('プロフィールの更新に失敗しました:', error);
    }
  }

  // タブを切り替えるメソッド
  setActiveTab(tab: 'profile' | 'teams' | 'invitations'): void {
    this.activeTab = tab;
    // URLのクエリパラメータを更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }
} 