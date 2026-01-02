import { Injectable, inject } from '@angular/core';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private userService = inject(UserService);

  async register(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(
      this.firebaseService.auth,
      email,
      password
    );
    
    await this.userService.createUserProfile(userCredential.user.uid, email, name);
    return userCredential.user;
  }

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(
      this.firebaseService.auth,
      email,
      password
    );
    return userCredential.user;
  }

  async logout() {
    await signOut(this.firebaseService.auth);
  }
}
