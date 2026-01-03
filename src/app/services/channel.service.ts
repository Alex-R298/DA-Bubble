import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

export interface Channel {
  id?: string;  // Optional, wird von Firebase generiert
  createdAt: Date;
  createdById: string;  // Besser als "createdId"
  name: string;
  description: string;
  members: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  private firebaseService = inject(FirebaseService);

  async createChannel(name: string, description: string, createdById: string): Promise<Channel> {
    // ===== TEMP-FIX BEGIN (DEV-ONLY, later removable) =====
    // Ohne Firebase-Config soll die App nicht komplett crashen.
    // Später löschen: Guard entfernen, sobald Firebase konfiguriert ist.
    if (!this.firebaseService.isEnabled()) {
      throw new Error('Firebase is not configured. Cannot create channel.');
    }
    // ===== TEMP-FIX END =====

    // ===== ORIGINAL (Firebase ist konfiguriert) =====
    const channelData = {
      createdAt: new Date(),
      createdById: createdById,
      name: name,
      description: description,
      members: [createdById]
    };

    const docRef = await addDoc(
      collection(this.firebaseService.db, 'channels'),
      channelData
    );

    console.log('Kanal erstellt:', name, 'ID:', docRef.id);

    return {
      id: docRef.id,
      ...channelData
    };
  }
}
