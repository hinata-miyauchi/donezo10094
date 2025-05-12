import { Injectable, inject } from '@angular/core';
import { 
  Auth,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  getAuth
} from '@angular/fire/auth';
import { 
  Firestore,
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  DocumentReference,
  DocumentData
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, getStorage } from '@angular/fire/storage';
import { BehaviorSubject, Observable, from, of, firstValueFrom } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { TeamMembership } from '../models/team.model';
import { IssueService } from './issue.service';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  emailNotifications?: boolean;
  taskReminders?: boolean;
  teams?: TeamMembership[];
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.userSubject.asObservable();
  user$ = this.currentUser$;
  
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  constructor() {
    this.initAuthState();
  }

  private initAuthState() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.getUserData(user.uid).subscribe(userData => {
          if (userData && !userData.photoURL) {
            userData = {
              ...userData,
              photoURL: 'assets/default-avatar.svg'
            };
          }
          this.userSubject.next(userData);
        });
      } else {
        this.userSubject.next(null);
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      console.log('ログイン処理開始');
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = credential.user;
      
      if (!user) {
        throw new Error('ログインに失敗しました');
      }

      console.log('Firebase認証成功:', user.uid);

      // ユーザーデータの取得を待つ
      let userData = await firstValueFrom(this.getUserData(user.uid));
      
      // ユーザーデータが存在しない場合は作成
      if (!userData) {
        console.log('ユーザーデータが存在しないため作成します');
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || email.split('@')[0],
          photoURL: './assets/default-avatar.svg',
          bio: '',
          emailNotifications: true,
          taskReminders: true,
          teams: [],
          isEmailVerified: user.emailVerified,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const userDocRef = doc(this.firestore, 'users', user.uid);
        await setDoc(userDocRef, userProfile);
        
        // 作成したユーザーデータを取得
        userData = await firstValueFrom(this.getUserData(user.uid));
        if (!userData) {
          throw new Error('ユーザーデータの作成に失敗しました');
        }
      }

      console.log('ユーザーデータ取得成功:', userData);
      this.userSubject.next(userData);

      // 認証状態の更新を確認
      await firstValueFrom(
        this.currentUser$.pipe(
          map(currentUser => {
            console.log('現在のユーザー状態:', currentUser);
            if (!currentUser) {
              throw new Error('認証状態の更新に失敗しました');
            }
            return true;
          })
        )
      );

    } catch (error: any) {
      console.error('ログインエラー:', error);
      this.userSubject.next(null);
      throw error;
    }
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = credential.user;
      
      if (!user) {
        throw new Error('ユーザー登録に失敗しました');
      }

      await updateProfile(user, { displayName });
      
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName,
        photoURL: null,
        bio: '',
        emailNotifications: true,
        taskReminders: true,
        teams: [],
        isEmailVerified: user.emailVerified,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userDocRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userDocRef, userProfile);
    } catch (error: any) {
      console.error('登録エラー:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.userSubject.next(null);
    } catch (error: any) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  }

  private getUserData(uid: string): Observable<User | null> {
    const userDocRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userDocRef)).pipe(
      map(doc => {
        if (doc.exists()) {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            uid: doc.id,
            teams: data['teams'] || [],
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          } as unknown as User;
        }
        return null;
      })
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  async isLoggedIn(): Promise<boolean> {
    return firstValueFrom(this.isAuthenticated());
  }

  async updateProfile(profile: { displayName?: string | null }): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      await updateProfile(user, profile);
      // Firestoreのユーザードキュメントも更新
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: profile.displayName,
        updatedAt: new Date()
      });
      // 最新のユーザーデータを取得して反映
      const userData = await getDoc(userDocRef);
      if (userData.exists()) {
        this.userSubject.next({
          ...(userData.data() as any),
          id: user.uid,
          uid: user.uid
        });
      }
    } catch (error) {
      console.error('プロフィールの更新に失敗しました:', error);
      throw error;
    }
  }

  async updateProfilePhoto(file: File): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      const storageRef = ref(this.storage, `profile-photos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL });
      
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        photoURL,
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('プロフィール写真更新エラー:', error);
      throw error;
    }
  }

  async updateProfilePhotoUrl(photoUrl: string): Promise<void> {
    try {
      console.log('updateProfilePhotoUrl開始:', photoUrl);
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      console.log('ユーザー取得成功:', user.uid);
      // Firebaseユーザープロフィールを更新
      await updateProfile(user, {
        photoURL: photoUrl
      });
      console.log('Firebaseプロフィール更新完了');

      // Firestoreのユーザードキュメントを更新
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        photoURL: photoUrl,
        updatedAt: new Date()
      });
      console.log('Firestoreドキュメント更新完了');

      // 現在のユーザーデータを取得して更新
      const userData = await firstValueFrom(this.getUserData(user.uid));
      if (userData) {
        this.userSubject.next(userData);
        console.log('ユーザーデータ更新完了:', userData);
      }

      console.log('プロフィール画像が更新されました');
    } catch (error) {
      console.error('プロフィール画像の更新に失敗しました:', error);
      throw error;
    }
  }

  async getCurrentUserId(): Promise<string> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }
    return user.id;
  }

  async updateUserProfile(displayName: string, photoURL?: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    await updateProfile(user, {
      displayName,
      photoURL: photoURL || user.photoURL
    });

    const userDocRef = doc(this.firestore, 'users', user.uid);
    const userData = await getDoc(userDocRef);
    
    if (!userData.exists()) {
      throw new Error('ユーザーデータが見つかりません');
    }

    const currentData = userData.data() as UserProfile;
    
    await updateDoc(userDocRef, {
      displayName,
      photoURL: photoURL || user.photoURL || '',
      updatedAt: new Date()
    });

    this.userSubject.next({
      ...currentData,
      id: user.uid,
      displayName,
      photoURL: photoURL || user.photoURL || '',
      updatedAt: new Date()
    } as unknown as User);
  }

  async updateProfileImage(file: File): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('認証が必要です');

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile-images/${user.uid}/${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateProfile(user, { photoURL: downloadURL });
      return downloadURL;
    } catch (error) {
      console.error('プロフィール画像のアップロードに失敗しました:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<{ displayName: string; photoURL?: string } | null> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      if (!userDoc.exists()) return null;
      
      const userData = userDoc.data();
      return {
        displayName: userData['displayName'] || '不明なユーザー',
        photoURL: userData['photoURL']
      };
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      return null;
    }
  }

  getUserProfile(userId: string): Observable<UserProfile | null> {
    const userDocRef = doc(this.firestore, 'users', userId);
    return from(getDoc(userDocRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) return null;
        const data = docSnap.data();
        return {
          uid: userId,
          email: data['email'] || '',
          displayName: data['displayName'] || null,
          photoURL: data['photoURL'] || null
        };
      })
    );
  }
} 