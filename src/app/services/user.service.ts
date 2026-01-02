import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

export interface User {
  uid: string;
  email: string;
  name: string;
  profileImageUrl: string;
  status: 'online' | 'offline' | 'away';
  createdAt: Date;
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
    console.log('User-Profil erstellt:', name);
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
            createdAt: data['createdAt'].toDate()
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
  
  return null;  // ← Wichtig: null zurückgeben wenn User nicht existiert
}
}
