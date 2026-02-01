import { Injectable, inject } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { ChannelService } from './channel.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private userService = inject(UserService);
  private channelService = inject(ChannelService);

  private authStateSubject = new BehaviorSubject<any>(undefined);
  authState$ = this.authStateSubject.asObservable();

  private activityTimeout: any;
  private currentUserId: string | null = null;
  private activityHandler: (() => void) | null = null;
  private isLoggedOut = false;

  constructor() {
    onAuthStateChanged(this.firebaseService.auth, async (user) => {
      this.authStateSubject.next(user);
      this.currentUserId = user?.uid || null;

      if (user) {
        this.isLoggedOut = false;
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

  /**
   * Starts monitoring user activity to update online status.
   * @param uid - The user ID to monitor activity for.
   */
  private startActivityMonitoring(uid: string): void {
    this.stopActivityMonitoring();

    this.activityHandler = () => {
      if (!this.isLoggedOut) {
        this.resetActivityTimer(uid);
      }
    };

    const activity = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activity.forEach(event => {
      document.addEventListener(event, this.activityHandler!);
    });

    this.resetActivityTimer(uid);
  }

  /**
   * Stops activity monitoring by removing event listeners.
   */
  private stopActivityMonitoring(): void {
    if (this.activityHandler) {
      const activity = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      activity.forEach(event => {
        document.removeEventListener(event, this.activityHandler!);
      });
      this.activityHandler = null;
    }
    clearTimeout(this.activityTimeout);
  }

  /**
   * Resets the activity timer and sets user status to online.
   * @param uid - The user ID to reset the timer for.
   */
  private resetActivityTimer(uid: string): void {
    if (this.isLoggedOut) return;

    this.userService.updateUserStatus(uid, 'online');

    clearTimeout(this.activityTimeout);
    this.activityTimeout = setTimeout(async () => {
      if (!this.isLoggedOut) {
        await this.userService.updateUserStatus(uid, 'away');
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Registers a new user with email, password, and display name.
   * @param email - The user's email address.
   * @param password - The user's password.
   * @param name - The user's display name.
   * @returns The created Firebase user object.
   */
  async register(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(
      this.firebaseService.auth,
      email,
      password
    );

    await this.userService.createUserProfile(userCredential.user.uid, email, name);
    try {
      await this.channelService.addMemberToChannelByName('Entwicklerteam', userCredential.user.uid);
    } catch {
      // ignore
    }
    return userCredential.user;
  }

  /**
   * Logs in a user with email and password.
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns The authenticated Firebase user object.
   */
  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(
      this.firebaseService.auth,
      email,
      password
    );
    return userCredential.user;
  }

  /**
   * Logs in a user using Google OAuth authentication.
   * Creates a user profile if it doesn't exist.
   * @returns The authenticated Firebase user object.
   */
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.firebaseService.auth, provider);
    const user = userCredential.user;
    const existingUser = await this.userService.getUserById(user.uid, true);
    if (!existingUser) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Google User';
      await this.userService.createUserProfile(user.uid, user.email || '', displayName);
      if (user.photoURL) {
        await this.userService.updateUserAvatar(user.uid, user.photoURL);
      }
      try {
        await this.channelService.addMemberToChannelByName('Entwicklerteam', user.uid);
      } catch {
        // ignore
      }
    }

    return user;
  }

  /**
   * Logs out the current user and sets their status to offline.
   */
  async logout() {
    this.isLoggedOut = true;
    this.stopActivityMonitoring();

    const uid = this.currentUserId || this.firebaseService.auth.currentUser?.uid;

    if (uid) {
      try {
        await this.userService.updateUserStatus(uid, 'offline');
      } catch (error) {
        // Status update failed silently
      }
    }

    sessionStorage.removeItem('guestMode');
    await signOut(this.firebaseService.auth);
    this.currentUserId = null;
  }

  /**
   * Returns the currently authenticated Firebase user.
   * @returns The current Firebase user or null if not authenticated.
   */
  getCurrentUser() {
    return this.firebaseService.auth.currentUser;
  }

  /**
   * Sends a password reset email to the specified address.
   * @param email - The email address to send the reset link to.
   * @returns An object indicating success or failure with a message.
   */
  async sendPasswordResetEmail(email: string) {
    try {
      await sendPasswordResetEmail(this.firebaseService.auth, email);
      return { success: true, message: 'Reset-Email wurde gesendet' };
    } catch (error: any) {
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Confirms a password reset using the provided code and new password.
   * @param oobCode - The out-of-band code from the reset email.
   * @param newPassword - The new password to set.
   * @returns An object indicating success or failure with a message.
   */
  async confirmPasswordReset(oobCode: string, newPassword: string) {
    try {
      await confirmPasswordReset(this.firebaseService.auth, oobCode, newPassword);
      return { success: true, message: 'Passwort erfolgreich zurückgesetzt' };
    } catch (error: any) {
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Verifies a password reset code and returns the associated email.
   * @param oobCode - The out-of-band code to verify.
   * @returns An object with success status and the email if valid.
   */
  async verifyResetCode(oobCode: string) {
    try {
      const email = await verifyPasswordResetCode(this.firebaseService.auth, oobCode);
      return { success: true, email };
    } catch (error) {
      return { success: false, email: null };
    }
  }

  /**
   * Returns a user-friendly error message based on the Firebase error code.
   * @param code - The Firebase error code.
   * @returns A localized error message string.
   */
  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'Keine Benutzer mit dieser E-Mail gefunden';
      case 'auth/invalid-email':
        return 'Ungültige E-Mail-Adresse';
      case 'auth/expired-action-code':
        return 'Der Reset-Link ist abgelaufen';
      case 'auth/invalid-action-code':
        return 'Der Reset-Link ist ungültig oder wurde bereits verwendet';
      case 'auth/weak-password':
        return 'Das Passwort muss mindestens 6 Zeichen lang sein';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}