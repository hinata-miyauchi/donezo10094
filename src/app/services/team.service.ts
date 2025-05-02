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
  DocumentSnapshot,
  orderBy,
  setDoc
} from '@angular/fire/firestore';
import { Team, TeamMember, TeamRole } from '../models/team.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  async getUserTeams(): Promise<Team[]> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      // メンバーのUIDで検索するシンプルなクエリ
      const teamsRef = collection(this.firestore, 'teams');
      const snapshot = await getDocs(teamsRef);
      
      // クライアントサイドでフィルタリング
      const teams = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate(),
          updatedAt: doc.data()['updatedAt']?.toDate()
        } as Team))
        .filter(team => 
          // 管理者として所属しているか、メンバーとして所属しているかをチェック
          team.adminId === user.uid || 
          team.members.some(member => member.uid === user.uid)
        );

      console.log('Found teams:', teams.length, 'for user:', user.uid); // デバッグ用
      return teams;
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

  async createTeam(name: string, description: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const teamRef = doc(collection(this.firestore, 'teams'));
    const now = new Date();

    const team: Team = {
      id: teamRef.id,
      name,
      description,
      adminId: user.uid, // 作成者のID
      createdBy: user.uid, // チーム作成者のUID
      members: [{
        uid: user.uid,
        displayName: user.displayName || 'Unknown User',
        role: 'admin', // 作成者は自動的に管理者権限を持つ
        joinedAt: now
      }],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(teamRef, team);
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

  async createTeamInvitation(teamId: string, userEmail: string): Promise<{ success: boolean; message: string }> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    // 管理者のみが招待可能
    if (team.adminId !== user.uid) {
      throw new Error('権限がありません');
    }

    // 自分自身を招待しようとしていないかチェック
    if (user.email === userEmail) {
      return {
        success: false,
        message: '自分自身を招待することはできません'
      };
    }

    try {
      // 既に招待されているかチェック
      const existingInvitations = await getDocs(
        query(
          collection(this.firestore, 'teamInvitations'),
          where('teamId', '==', teamId),
          where('invitedUserEmail', '==', userEmail),
          where('status', '==', 'pending')
        )
      );

      if (!existingInvitations.empty) {
        return {
          success: false,
          message: '招待済みです'
        };
      }

      // 既にメンバーかどうかチェック（メールアドレスで確認）
      const isMember = team.members.some(member => 
        member.email === userEmail
      );
      
      if (isMember) {
        return {
          success: false,
          message: '既にチームのメンバーです'
        };
      }

      // 招待されるユーザーのUIDを取得
      const usersSnapshot = await getDocs(
        query(
          collection(this.firestore, 'users'),
          where('email', '==', userEmail)
        )
      );

      if (usersSnapshot.empty) {
        return {
          success: false,
          message: 'ユーザーが見つかりません'
        };
      }

      const invitedUser = usersSnapshot.docs[0];
      const invitedUserId = invitedUser.id;

      // 招待を作成
      const invitationRef = await addDoc(collection(this.firestore, 'teamInvitations'), {
        teamId,
        teamName: team.name,
        invitedUserId,
        invitedUserEmail: userEmail,
        invitedByUserId: user.uid,
        invitedByUserName: user.displayName || '名前なし',
        status: 'pending',
        createdAt: new Date()
      });

      // 通知を作成
      await this.notificationService.createTeamInviteNotification(
        invitedUserId,
        teamId,
        team.name
      );

      return {
        success: true,
        message: '招待を送信しました'
      };

    } catch (error) {
      console.error('Error creating team invitation:', error);
      return {
        success: false,
        message: '招待の作成に失敗しました'
      };
    }
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

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const team = await this.getTeam(teamId);
    if (!team) return [];
    return team.members;
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

  async getTeamInvitations(teamId: string): Promise<any[]> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      // 複合インデックスが必要なクエリを単純化
      const invitationsQuery = query(
        collection(this.firestore, 'teamInvitations'),
        where('teamId', '==', teamId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(invitationsQuery);
      const invitations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          invitedUserEmail: data['invitedUserEmail'] || '',
          createdAt: data['createdAt']?.toDate(),
          expiresAt: data['expiresAt']?.toDate()
        };
      });

      // クライアント側でソート
      return invitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      throw new Error('招待情報の取得に失敗しました');
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      await deleteDoc(doc(this.firestore, 'teamInvitations', invitationId));
    } catch (error) {
      console.error('Error canceling invitation:', error);
      throw new Error('招待のキャンセルに失敗しました');
    }
  }

  async getUserInvitations(): Promise<any[]> {
    const user = this.authService.currentUser;
    if (!user || !user.email) throw new Error('認証が必要です');

    try {
      const invitationsQuery = query(
        collection(this.firestore, 'teamInvitations'),
        where('invitedUserEmail', '==', user.email),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(invitationsQuery);
      const invitations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate(),
          expiresAt: data['expiresAt']?.toDate()
        };
      });

      // クライアント側でソート
      return invitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      throw new Error('招待情報の取得に失敗しました');
    }
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      const invitationRef = doc(this.firestore, 'teamInvitations', invitationId);
      const invitationSnap = await getDoc(invitationRef);
      
      if (!invitationSnap.exists()) {
        throw new Error('招待が見つかりません');
      }

      const invitation = invitationSnap.data();
      const teamId = invitation['teamId'];

      // チームにメンバーとして追加
      const team = await this.getTeam(teamId);
      if (!team) throw new Error('チームが見つかりません');

      // 既にメンバーかどうかチェック
      const isAlreadyMember = team.members.some(m => m.uid === user.uid);
      if (isAlreadyMember) {
        await deleteDoc(invitationRef);
        return;
      }

      const now = new Date();
      const newMember = {
        uid: user.uid,
        displayName: user.displayName || '',
        role: 'member' as TeamRole,
        joinedAt: now
      };

      // メンバーリストを更新
      const updatedMembers = [...team.members, newMember];
      const teamRef = doc(this.firestore, 'teams', teamId);
      
      // トランザクションで更新を確実に行う
      await updateDoc(teamRef, {
        members: updatedMembers,
        updatedAt: now
      });

      // 招待を削除
      await deleteDoc(invitationRef);

      console.log('チームメンバーとして追加されました:', teamId); // デバッグ用
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error('招待の承認に失敗しました');
    }
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      await deleteDoc(doc(this.firestore, 'teamInvitations', invitationId));
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw new Error('招待の拒否に失敗しました');
    }
  }

  isTeamAdmin(team: Team): boolean {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    
    // チームの管理者（adminId）であるかチェック
    return team.adminId === currentUser.uid;
  }

  async toggleAdminRole(teamId: string, userId: string, isAdmin: boolean): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('チームが見つかりません');

    // チームの作成者（adminId）のみが管理者権限を変更可能
    if (team.adminId !== user.uid) {
      throw new Error('管理者権限の変更は作成者のみが実行できます');
    }

    // 作成者の権限は変更できない
    if (userId === team.adminId) {
      throw new Error('作成者の権限は変更できません');
    }

    // メンバーの権限を更新
    const memberIndex = team.members.findIndex(member => member.uid === userId);
    if (memberIndex === -1) throw new Error('指定されたユーザーはチームのメンバーではありません');

    const updatedMembers = [...team.members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      role: isAdmin ? 'admin' : 'member'
    };

    // チームのデータを更新
    await updateDoc(doc(this.firestore, 'teams', teamId), {
      members: updatedMembers,
      updatedAt: new Date()
    });
  }
} 