import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, onSnapshot, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

/** User profile data structure */
export interface User {
  uid: string;
  email: string;
  name: string;
  profileImageUrl: string;
  status: 'online' | 'offline' | 'away';
  createdAt: Date;
  lastSeen?: Date;
}

/**
 * Service for managing user profiles and status.
 * Provides CRUD operations for user data with caching support
 * and realtime subscriptions via Firebase Firestore.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firebaseService = inject(FirebaseService);
  private userCache = new Map<string, { user: User; timestamp: number }>();
  private readonly CACHE_DURATION = 10000;

  /**
   * Creates a new user profile in Firestore
   * @param uid - The unique user ID from Firebase Auth
   * @param email - The user's email address
   * @param name - The user's display name
   * @returns The created user data object
   */
  async createUserProfile(uid: string, email: string, name: string) {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    const userData = {
      uid: uid,
      email: email,
      name: name,
      profileImageUrl: '',
      status: 'online',
      createdAt: new Date()
    };
    await setDoc(userDoc, userData);
    return userData;
  }

  /**
   * Subscribes to realtime updates of all users
   * @returns Observable stream of all user profiles
   */
  getAllUsersRealtime(): Observable<User[]> {
    return new Observable(observer => {
      const usersRef = collection(this.firebaseService.db, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const users = snapshot.docs.map(doc => this.mapDocumentToUser(doc.data()));
        observer.next(users);
      });
      return () => unsubscribe();
    });
  }

  /**
   * Retrieves a user by their ID with optional caching
   * @param uid - The user's unique ID
   * @param bypassCache - If true, fetches fresh data from Firestore
   * @returns The user profile or null if not found
   */
  async getUserById(uid: string, bypassCache: boolean = false): Promise<User | null> {
    if (!bypassCache) {
      const cachedUser = this.getCachedUser(uid);
      if (cachedUser) return cachedUser;
    }

    const userDoc = doc(this.firebaseService.db, 'users', uid);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      const user = this.mapDocumentToUser(docSnap.data());
      this.userCache.set(uid, { user, timestamp: Date.now() });
      return user;
    }
    return null;
  }

  /**
   * Subscribes to realtime updates of a specific user by ID
   * @param uid - The user's unique ID
   * @returns Observable stream of the user profile
   */
  getUserByIdRealtime(uid: string): Observable<User | null> {
    return new Observable(observer => {
      const userDoc = doc(this.firebaseService.db, 'users', uid);
      const unsubscribe = onSnapshot(userDoc, (docSnap) => {
        if (docSnap.exists()) {
          const user = this.mapDocumentToUser(docSnap.data());
          this.userCache.set(uid, { user, timestamp: Date.now() });
          observer.next(user);
        } else {
          observer.next(null);
        }
      });
      return () => unsubscribe();
    });
  }

  /**
   * Retrieves a cached user if valid
   * @param uid - The user's unique ID
   * @returns The cached user or null if expired/not found
   */
  private getCachedUser(uid: string): User | null {
    const cached = this.userCache.get(uid);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_DURATION)) {
      return cached.user;
    }
    return null;
  }

  /**
   * Clears the entire user cache
   */
  clearUserCache(): void {
    this.userCache.clear();
  }

  /**
   * Finds a user by their display name
   * @param name - The exact display name to search for
   * @returns The user profile or null if not found
   */
  async getUserByName(name: string): Promise<User | null> {
    const usersRef = collection(this.firebaseService.db, 'users');
    const q = query(usersRef, where('name', '==', name));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return this.mapDocumentToUser(snapshot.docs[0].data());
    }
    return null;
  }

  /**
   * Updates a user's display name
   * @param uid - The user's unique ID
   * @param name - The new display name (will be trimmed)
   */
  async updateUserProfile(uid: string, name: string): Promise<void> {
    const nextName = name.trim();
    if (!nextName) return;

    const userDoc = doc(this.firebaseService.db, 'users', uid);
    await updateDoc(userDoc, { name: nextName });
  }

  /**
   * Updates a user's profile avatar URL
   * @param uid - The user's unique ID
   * @param avatarUrl - The new avatar image URL
   */
  async updateUserAvatar(uid: string, avatarUrl: string): Promise<void> {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    await updateDoc(userDoc, { profileImageUrl: avatarUrl });
  }

  /**
   * Updates a user's online status asynchronously
   * @param uid - The user's unique ID
   * @param status - The new status value
   */
  async updateUserStatus(uid: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    if (!uid) return;
    try {
      const userDoc = doc(this.firebaseService.db, 'users', uid);
      await setDoc(userDoc, {
        status: status,
        lastSeen: new Date()
      }, { merge: true });
    } catch (error) {
      // Status update failed silently
    }
  }

  /**
   * Updates a user's online status synchronously (fire-and-forget).
   * Useful for beforeunload events where async operations may not complete.
   * @param uid - The user's unique ID
   * @param status - The new status value
   */
  updateUserStatusSync(uid: string, status: 'online' | 'offline' | 'away'): void {
    const userDoc = doc(this.firebaseService.db, 'users', uid);
    setDoc(userDoc, {
      status: status,
      lastSeen: new Date()
    }, { merge: true }).catch(() => { /* Status update failed silently */ });
  }

  /**
   * Subscribes to realtime updates for a specific user
   * @param uid - The user's unique ID
   * @returns Observable stream of the user profile or null
   */
  subscribeToUser(uid: string): Observable<User | null> {
    return new Observable(observer => {
      const userDoc = doc(this.firebaseService.db, 'users', uid);
      const unsubscribe = onSnapshot(userDoc, (snapshot) => {
        if (snapshot.exists()) {
          observer.next(this.mapDocumentToUser(snapshot.data(), true));
        } else {
          observer.next(null);
        }
      });
      return () => unsubscribe();
    });
  }

  /**
   * Maps a Firestore document to a User object
   * @param data - The raw Firestore document data
   * @param includeLastSeen - Whether to include the lastSeen field
   * @returns The mapped User object
   */
  private mapDocumentToUser(data: any, includeLastSeen: boolean = false): User {
    const user: User = {
      uid: data['uid'],
      email: data['email'],
      name: data['name'],
      profileImageUrl: data['profileImageUrl'],
      status: data['status'],
      createdAt: data['createdAt']?.toDate()
    };

    if (includeLastSeen && data['lastSeen']) {
      user.lastSeen = data['lastSeen'].toDate();
    }

    return user;
  }
}