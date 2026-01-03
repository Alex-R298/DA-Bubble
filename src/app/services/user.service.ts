import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
// ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
// Warum gibt es das?
// - Ohne Firebase-Config soll die Sidebar/Dashboard trotzdem rendern.
// - Dafür liefern wir unten bei getAllUsersRealtime() ein leeres Array.
//
// Später löschen:
// - Diese "of"-Import-Zeile wieder entfernen
// - Und unten den TEMP-FIX-Return of([]) entfernen
import { Observable, of } from 'rxjs';
// ===== TEMP-FIX END =====
// ===== ORIGINAL (Firebase ist konfiguriert) =====
// import { Observable } from 'rxjs';

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
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Später löschen: Guard entfernen, sobald Firebase läuft.
    if (!this.firebaseService.isEnabled()) {
      throw new Error('Firebase is not configured. Cannot create user profile.');
    }
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
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
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Ohne Firebase: leere User-Liste liefern, damit UI nicht crasht.
    if (!this.firebaseService.isEnabled()) {
      return of([]);
    }
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
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
}
