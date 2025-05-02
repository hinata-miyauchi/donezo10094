import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, getDocs } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface Comment {
  id: string;
  issueId: string;
  content: string;
  authorId: string;
  createdAt: Date;
  mentions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  async getComments(issueId: string): Promise<Comment[]> {
    const commentsRef = collection(this.firestore, 'comments');
    const q = query(
      commentsRef,
      where('issueId', '==', issueId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
  }

  async addComment(issueId: string, content: string): Promise<Comment> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    const comment = {
      issueId,
      content,
      authorId: user.uid,
      createdAt: new Date(),
      mentions: []
    };

    const commentsRef = collection(this.firestore, 'comments');
    const docRef = await addDoc(commentsRef, comment);
    
    return {
      id: docRef.id,
      ...comment
    };
  }
} 