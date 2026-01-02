import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { environment } from '../../app/enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  public db: Firestore;
  public auth: Auth;
  public storage: FirebaseStorage;

  constructor() {
    // Firebase initialisieren
    this.app = initializeApp(environment.firebase);
    
    // Services initialisieren
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
    this.storage = getStorage(this.app);
    
    console.log('Firebase initialized successfully');
  }

  getApp(): FirebaseApp {
    return this.app;
  }
}
