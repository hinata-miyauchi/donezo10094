import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  DocumentSnapshot
} from '@angular/fire/firestore';
import { Team, TeamMember, TeamRole } from '../models/team.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  async getUserTeams(): Promise<Team[]> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      const teamsQuery = query(
        collection(this.firestore, 'teams'),
        where('members', 'array-contains', { uid: user.uid })
      );

      const snapshot = await getDocs(teamsQuery);
      console.log('Found teams:', snapshot.docs.length); // デバッグ用

      if (snapshot.empty) {
        // チームが見つからない場合は、adminIdでも検索
        const adminTeamsQuery = query(
          collection(this.firestore, 'teams'),
          where('adminId', '==', user.uid)
        );
        const adminSnapshot = await getDocs(adminTeamsQuery);
        console.log('Found admin teams:', adminSnapshot.docs.length); // デバッグ用

        return adminSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate(),
          updatedAt: doc.data()['updatedAt']?.toDate()
        } as Team));
      }

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()['createdAt']?.toDate(),
        updatedAt: doc.data()['updatedAt']?.toDate()
      } as Team));
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw new Error('チームの取得に失敗しました');
    }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const docSnap = await getDoc(doc(this.firestore, 'teams', teamId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Team;
  }

  async createTeam(teamData: { name: string; description?: string }): Promise<string> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      const now = new Date();
      const member = {
        uid: user.uid,
        displayName: user.displayName || '',
        role: 'admin' as TeamRole,
        joinedAt: now
      };

      const newTeam = {
        name: teamData.name,
        description: teamData.description || '',
        adminId: user.uid,
        members: [member],
        createdAt: now,
        updatedAt: now
      };

      console.log('Creating team with data:', newTeam); // デバッグ用

      const docRef = await addDoc(collection(this.firestore, 'teams'), newTeam);
      console.log('Team created with ID:', docRef.id); // デバッグ用
      return docRef.id;
    } catch (error) {
      console.error('Error creating team:', error);
      throw new Error('チームの作成に失敗しました');
    }
  }

  async updateTeam(teamId: string, teamData: Partial<Team>): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    const hasPermission = this.checkTeamPermission(team, user.uid, 'admin');
    if (!hasPermission) throw new Error('権限がありません');

    const updateData = {
      ...teamData,
      updatedAt: new Date()
    };

    await updateDoc(doc(this.firestore, 'teams', teamId), updateData);
  }

  async deleteTeam(teamId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    // チームの管理者（adminId）のみが削除可能
    if (team.adminId !== user.uid) {
      throw new Error('チームを削除できるのは管理者のみです');
    }

    await deleteDoc(doc(this.firestore, 'teams', teamId));
  }

  async updateTeamMemberRole(teamId: string, memberId: string, newRole: TeamRole): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    const hasPermission = this.checkTeamPermission(team, user.uid, 'admin');
    if (!hasPermission) throw new Error('権限がありません');

    const updatedMembers = team.members.map(member => 
      member.uid === memberId ? { ...member, role: newRole } : member
    );

    await this.updateTeam(teamId, { members: updatedMembers });
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    const hasPermission = this.checkTeamPermission(team, user.uid, 'admin');
    if (!hasPermission) throw new Error('権限がありません');

    const updatedMembers = team.members.filter(m => m.uid !== memberId);
    await this.updateTeam(teamId, { members: updatedMembers });
  }

  async createTeamInvitation(teamId: string, userEmail: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    const hasPermission = this.checkTeamPermission(team, user.uid, 'admin');
    if (!hasPermission) throw new Error('権限がありません');

    const invitation = {
      teamId,
      teamName: team.name,
      invitedBy: user.uid,
      invitedUserEmail: userEmail,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後
    };

    await addDoc(collection(this.firestore, 'teamInvitations'), invitation);
  }

  checkTeamPermission(team: Team | null, userId: string, requiredRole: TeamRole): boolean {
    if (!team) return false;
    
    const member = team.members.find(m => m.uid === userId);
    if (!member) return false;

    if (requiredRole === 'admin') {
      return member.role === 'admin';
    }

    if (requiredRole === 'editor') {
      return ['admin', 'editor'].includes(member.role);
    }

    return true; // memberロールの場合は、すべてのロールでOK
  }

  private async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const team = await this.getTeam(teamId);
    return team?.members || [];
  }

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    // 管理者が最後の1人の場合は退出できない
    if (team.adminId === userId && team.members.length === 1) {
      throw new Error('管理者は最後のメンバーの場合、チームから退出できません');
    }

    // メンバーリストから自分を削除
    const updatedMembers = team.members.filter(m => m.uid !== userId);

    // 自分が管理者で他のメンバーがいる場合、新しい管理者を設定
    if (team.adminId === userId && updatedMembers.length > 0) {
      const newAdmin = updatedMembers[0];
      newAdmin.role = 'admin';
      team.adminId = newAdmin.uid;
    }

    await updateDoc(doc(this.firestore, 'teams', teamId), {
      members: updatedMembers,
      adminId: team.adminId,
      updatedAt: new Date()
    });
  }
} 