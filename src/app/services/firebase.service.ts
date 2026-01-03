import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app!: FirebaseApp;
  public db!: Firestore;
  public auth!: Auth;
  public storage!: FirebaseStorage;
  private enabled = false;

  constructor() {
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Warum gibt es das?
    // - Damit die App (Routing/Dashboard/UI) auch ohne Firebase-Config starten kann.
    // - Ohne diesen Block crasht initializeApp(...) mit: "projectId not provided".
    //
    // Was kannst du später löschen?
    // - Sobald in environment.ts eine echte firebase config drin ist (inkl. projectId),
    //   kannst du den kompletten TEMP-FIX-Block löschen.
    // - Wenn du den TEMP-FIX löschst, musst du außerdem in den anderen Services
    //   die Stellen entfernen, die this.firebaseService.isEnabled() benutzen.
    const config = environment.firebase as Record<string, unknown> | undefined;
    const projectId = config?.['projectId'];

    if (!projectId) {
      this.enabled = false;
      console.warn('Firebase disabled: environment.firebase.projectId is missing.');
      return;
    }

    try {
      this.app = initializeApp(config as any);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      this.storage = getStorage(this.app);
      this.enabled = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      this.enabled = false;
      console.warn('Firebase disabled: initialization failed.', error);
    }
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (wieder aktivieren, wenn Firebase fertig ist) =====
    // Hinweis: Wenn du den TEMP-FIX entfernst, kannst du wieder auf dieses Original zurück.
    // this.app = initializeApp(environment.firebase as any);
    // this.db = getFirestore(this.app);
    // this.auth = getAuth(this.app);
    // this.storage = getStorage(this.app);
    // console.log('Firebase initialized successfully');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getApp(): FirebaseApp {
    return this.app;
  }
}