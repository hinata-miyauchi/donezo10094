import { Pipe, PipeTransform } from '@angular/core';
import { Team, TeamMember } from '../models/team.model';

@Pipe({
  name: 'sortMembers',
  standalone: true
})
export class SortMembersPipe implements PipeTransform {
  transform(members: TeamMember[], team: Team): TeamMember[] {
    if (!members || !team) return members;

    return [...members].sort((a, b) => {
      // 管理者（作成者）を最上位に
      if (a.uid === team.adminId) return -1;
      if (b.uid === team.adminId) return 1;

      // 五十音順で並び替え
      return a.displayName.localeCompare(b.displayName, 'ja');
    });
  }
} 