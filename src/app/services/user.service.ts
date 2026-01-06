import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

export interface User {
  uid: string;
  email: string;
  name: string;
  profileImageUrl: string;
  status: 'online' | 'offline' | 'away';
  createdAt: Date;
  lastSeen?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firebaseService = inject(FirebaseService);

  async createUserProfile(uid: string, email: string, name: string) {
    const userDoc = doc(this.firebaseService.db, 'users', uid);

    const userData = {
      uid: uid,
      email: email,
      name: name,
      profileImageUrl: '',
      status: 'offline',
      createdAt: new Date()
    };

    await setDoc(userDoc, userData);
    return userData;
  }

  getAllUsersRealtime(): Observable<User[]> {
    return new Observable(observer => {
      const usersRef = collection(this.firebaseService.db, 'users');

      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const users = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: data['uid'],
            email: data['email'],
            name: data['name'],
            profileImageUrl: data['profileImageUrl'],
            status: data['status'],
            createdAt: data['createdAt'].toDate(),
            lastSeen: data['lastSeen']?.toDate()
          };
        });
        observer.next(users);
      });

      return () => unsubscribe();
    });
  }

  async getUserById(uid: string): Promise<User | null> {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: data['uid'],
        email: data['email'],
        name: data['name'],
        profileImageUrl: data['profileImageUrl'],
        status: data['status'],
        createdAt: data['createdAt'].toDate()
      };
    }

    return null;
  }

  async updateUserProfile(uid: string, name: string): Promise<void> {
    const nextName = name.trim();
    if (!nextName) return;

    const userDoc = doc(this.firebaseService.db, 'users', uid);
    await updateDoc(userDoc, { name: nextName });
  }

  async updateUserAvatar(uid: string, avatarUrl: string): Promise<void> {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    await updateDoc(userDoc, { 
      profileImageUrl: avatarUrl 
    });
  }

  async updateUserStatus(uid: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    await updateDoc(userDoc, {
      status: status,
      lastSeen: new Date()
    });
  }

  updateUserStatusSync(uid: string, status: 'online' | 'offline' | 'away'): void {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    
    updateDoc(userDoc, {
      status: status,
      lastSeen: new Date()
    }).catch(err => console.error('Status update failed:', err));
  }

  subscribeToUser(uid: string): Observable<User | null> {
    return new Observable(observer => {
      const userDoc = doc(this.firebaseService.db, 'users', uid);
      
      const unsubscribe = onSnapshot(userDoc, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          observer.next({
            uid: data['uid'],
            email: data['email'],
            name: data['name'],
            profileImageUrl: data['profileImageUrl'],
            status: data['status'],
            createdAt: data['createdAt'].toDate(),
            lastSeen: data['lastSeen']?.toDate()
          });
        } else {
          observer.next(null);
        }
      });
      
      return () => unsubscribe();
    });
  }
}