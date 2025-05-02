import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../services/team.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-team-invitations',
  templateUrl: './team-invitations.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class TeamInvitationsComponent implements OnInit, OnDestroy {
  invitations: any[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(private teamService: TeamService) {}

  ngOnInit(): void {
    this.loadInvitations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInvitations(): Promise<void> {
    try {
      this.invitations = await this.teamService.getUserInvitations();
      console.log('Loaded invitations:', this.invitations);
    } catch (error) {
      console.error('招待の読み込みに失敗しました:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    try {
      await this.teamService.acceptInvitation(invitationId);
      await this.loadInvitations(); // 招待リストを更新
      // 成功メッセージ
      alert('チームに参加しました');
    } catch (error) {
      console.error('招待の承認に失敗しました:', error);
      alert('招待の承認に失敗しました。もう一度お試しください。');
    }
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    try {
      await this.teamService.rejectInvitation(invitationId);
      await this.loadInvitations(); // 招待リストを更新
      // 成功メッセージ
      alert('招待を辞退しました');
    } catch (error) {
      console.error('招待の辞退に失敗しました:', error);
      alert('招待の辞退に失敗しました。もう一度お試しください。');
    }
  }
} 