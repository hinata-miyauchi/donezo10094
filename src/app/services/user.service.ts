// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { collection, addDoc, doc, updateDoc, deleteDoc, Firestore, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UserFilter } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersCollection;

  constructor(private firestore: Firestore) {
    this.usersCollection = collection(this.firestore, 'users');
  }

  getUsers(): Observable<User[]> {
    return new Observable<User[]>(observer => {
      const unsubscribe = onSnapshot(this.usersCollection, snapshot => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate(),
          updatedAt: doc.data()['updatedAt']?.toDate()
        })) as User[];
        observer.next(users);
      }, error => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async addUser(user: Omit<User, 'id'>): Promise<void> {
    const newUser = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await addDoc(this.usersCollection, newUser);
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    const docRef = doc(this.firestore, 'users', id);
    const updateData = {
      ...user,
      updatedAt: new Date()
    };
    await updateDoc(docRef, updateData);
  }

  async deleteUser(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'users', id);
    await deleteDoc(docRef);
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    const q = query(this.usersCollection, where("department", "==", department));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const q = query(this.usersCollection, where("role", "==", role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  }
} 