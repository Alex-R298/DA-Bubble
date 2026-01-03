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
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Ziel: Ohne Firebase-Config soll die App nicht crashen.
    // Später löschen: diesen Guard komplett entfernen, sobald Firebase korrekt konfiguriert ist.
    if (!this.firebaseService.isEnabled()) {
      throw new Error('Firebase is not configured. Cannot register user.');
    }
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
    // -> Dann braucht es keinen Guard.
    const userCredential = await createUserWithEmailAndPassword(
      this.firebaseService.auth,
      email,
      password
    );

    await this.userService.createUserProfile(userCredential.user.uid, email, name);
    return userCredential.user;
  }

  async login(email: string, password: string) {
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Später löschen: Guard entfernen, sobald Firebase korrekt läuft.
    if (!this.firebaseService.isEnabled()) {
      throw new Error('Firebase is not configured. Cannot login.');
    }
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
    const userCredential = await signInWithEmailAndPassword(
      this.firebaseService.auth,
      email,
      password
    );
    return userCredential.user;
  }

  async logout() {
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Ohne Firebase: einfach "no-op", damit UI/Routing weiter funktioniert.
    if (!this.firebaseService.isEnabled()) return;
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
    await signOut(this.firebaseService.auth);
  }

  getCurrentUser() {
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Ohne Firebase: null zurückgeben, damit Komponenten nicht crashen.
    if (!this.firebaseService.isEnabled()) return null;
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
    return this.firebaseService.auth.currentUser;
  }
}
