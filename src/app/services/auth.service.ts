import { Injectable, inject } from '@angular/core';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private userService = inject(UserService);
  
  private authStateSubject = new BehaviorSubject<any>(undefined);
  authState$ = this.authStateSubject.asObservable();
  
  private activityTimeout: any;
  private currentUserId: string | null = null;

  constructor() {
    onAuthStateChanged(this.firebaseService.auth, async (user) => {
      this.authStateSubject.next(user);
      this.currentUserId = user?.uid || null;
      
      if (user) {
        await this.userService.updateUserStatus(user.uid, 'online');
        this.startActivityMonitoring(user.uid);
      }
    });
    
    window.addEventListener('beforeunload', () => {
      if (this.currentUserId) {
        this.userService.updateUserStatusSync(this.currentUserId, 'offline');
      }
    });
  }

  private startActivityMonitoring(uid: string): void {
    const activity = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    activity.forEach(event => {
      document.addEventListener(event, () => {
        this.resetActivityTimer(uid);
      });
    });
    
    this.resetActivityTimer(uid);
  }

  private resetActivityTimer(uid: string): void {
    this.userService.updateUserStatus(uid, 'online');
    
    clearTimeout(this.activityTimeout);
    this.activityTimeout = setTimeout(async () => {
      await this.userService.updateUserStatus(uid, 'away');
    }, 5 * 60 * 1000);
  }

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

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.firebaseService.auth, provider);
    const user = userCredential.user;

    // Validate user profile existence; create if absent
    const existingUser = await this.userService.getUserById(user.uid, true);
    if (!existingUser) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Google User';
      await this.userService.createUserProfile(user.uid, user.email || '', displayName);
      
      // Set Google profile image if available
      if (user.photoURL) {
        await this.userService.updateUserAvatar(user.uid, user.photoURL);
      }
    }

    return user;
  }

  async logout() {
    if (this.currentUserId) {
      await this.userService.updateUserStatus(this.currentUserId, 'offline');
    }
    
    await signOut(this.firebaseService.auth);
    this.currentUserId = null;
  }

  getCurrentUser() {
    return this.firebaseService.auth.currentUser;
  }
}