import { Pipe, PipeTransform } from '@angular/core';
import { Team } from '../models/team.model';

@Pipe({
  name: 'sortTeams',
  standalone: true
})
export class SortTeamsPipe implements PipeTransform {
  transform(teams: Team[], currentUserId: string | undefined): Team[] {
    if (!teams || !currentUserId) return teams;

    return [...teams].sort((a, b) => {
      // 自分が作成者のプロジェクトを最上位に
      if (a.adminId === currentUserId && b.adminId !== currentUserId) return -1;
      if (b.adminId === currentUserId && a.adminId !== currentUserId) return 1;

      // 自分が管理者のプロジェクトを次に
      const aIsAdmin = a.members.some(m => m.uid === currentUserId && m.role === 'admin');
      const bIsAdmin = b.members.some(m => m.uid === currentUserId && m.role === 'admin');
      if (aIsAdmin && !bIsAdmin) return -1;
      if (bIsAdmin && !aIsAdmin) return 1;

      // それ以外は五十音順
      return a.name.localeCompare(b.name, 'ja');
    });
  }
} 