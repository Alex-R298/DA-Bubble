import { Injectable, inject } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

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
}
