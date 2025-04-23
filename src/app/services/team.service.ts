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
  serverTimestamp,
  collectionGroup,
  getDoc
} from '@angular/fire/firestore';
import { Observable, from, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Team, TeamMembership, TeamInvitation, TeamRole } from '../models/team.model';
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
    const currentUser = await this.authService.currentUser$.pipe().toPromise();
    if (!currentUser) return [];

    const teamsRef = collection(this.firestore, 'teams');
    const q = query(teamsRef, where('members', 'array-contains', { uid: currentUser.uid }));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));
  }

  async getTeam(teamId: string): Promise<Team> {
    const docSnap = await getDoc(doc(this.firestore, 'teams', teamId));
    if (!docSnap.exists()) throw new Error('チームが見つかりません');
    return { id: docSnap.id, ...docSnap.data() } as Team;
  }

  public checkTeamPermission(team: Team, userId: string, requiredRole: TeamRole): boolean {
    const member = team.members.find(m => m.uid === userId);
    if (!member) return false;

    const roleHierarchy = {
      admin: 3,
      editor: 2,
      viewer: 1
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }

  async createTeam(team: Partial<Team>): Promise<string> {
    const currentUser = await this.authService.currentUser$.toPromise();
    if (!currentUser) throw new Error('認証が必要です');

    const newTeam = {
      ...team,
      members: [{
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        role: 'admin' as const
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(this.firestore, 'teams'), newTeam);
    return docRef.id;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
    const currentUser = await this.authService.currentUser$.toPromise();
    if (!currentUser) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!this.checkTeamPermission(team, currentUser.uid, 'admin')) {
      throw new Error('権限がありません');
    }

    await updateDoc(doc(this.firestore, 'teams', teamId), {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    const currentUser = await this.authService.currentUser$.toPromise();
    if (!currentUser) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!this.checkTeamPermission(team, currentUser.uid, 'admin')) {
      throw new Error('権限がありません');
    }

    await deleteDoc(doc(this.firestore, 'teams', teamId));
  }

  async updateTeamMemberRole(teamId: string, userId: string, newRole: TeamRole): Promise<void> {
    const currentUser = await this.authService.currentUser$.toPromise();
    if (!currentUser) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!this.checkTeamPermission(team, currentUser.uid, 'admin')) {
      throw new Error('権限がありません');
    }

    const memberIndex = team.members.findIndex(m => m.uid === userId);
    if (memberIndex === -1) throw new Error('メンバーが見つかりません');

    team.members[memberIndex].role = newRole;
    await this.updateTeam(teamId, { members: team.members });
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const currentUser = await this.authService.currentUser$.toPromise();
    if (!currentUser) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!this.checkTeamPermission(team, currentUser.uid, 'admin')) {
      throw new Error('権限がありません');
    }

    const updatedMembers = team.members.filter(m => m.uid !== userId);
    await this.updateTeam(teamId, { members: updatedMembers });
  }

  async createTeamInvitation(teamId: string, email: string): Promise<void> {
    const currentUser = await this.authService.currentUser$.toPromise();
    if (!currentUser) throw new Error('認証が必要です');

    const team = await this.getTeam(teamId);
    if (!this.checkTeamPermission(team, currentUser.uid, 'admin')) {
      throw new Error('権限がありません');
    }

    const invitation: TeamInvitation = {
      id: '', // Firestoreが自動生成
      teamId,
      email,
      role: 'editor',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後
    };

    await addDoc(collection(this.firestore, 'teamInvitations'), invitation);
  }
} 