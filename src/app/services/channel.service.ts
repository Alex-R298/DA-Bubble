import { Injectable, inject } from '@angular/core';
import { doc, collection, addDoc, onSnapshot, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

export interface Channel {
  id?: string;
  createdAt: Date;
  createdById: string;
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

    return {
      id: docRef.id,
      ...channelData
    };
  }

  getAllChannels(): Observable<Channel[]> {
    return new Observable<Channel[]>(observer => {
      const channelsRef = collection(this.firebaseService.db, 'channels');

      const unsubscribe = onSnapshot(channelsRef, (snapshot) => {
        const channels = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            name: data['name'],
            description: data['description'],
            createdAt: data['createdAt'].toDate(),
            createdById: data['createdById'],
            members: data['members'],
            id: doc.id
          };
        });
        observer.next(channels);
      });

      return () => unsubscribe();
    });
  }

  async getChannelById(channelId: string): Promise<Channel | null> {
    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    const snapshot = await getDoc(channelDoc);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data['name'],
        description: data['description'],
        createdAt: data['createdAt'].toDate(),
        createdById: data['createdById'],
        members: data['members']
      };
    }

    return null;
  }

  async updateChannel(channelId: string, updates: Partial<Pick<Channel, 'name' | 'description'>>): Promise<void> {
    const safeUpdates: any = {};
    if (typeof updates.name === 'string') safeUpdates.name = updates.name.trim();
    if (typeof updates.description === 'string') safeUpdates.description = updates.description.trim();
    if (!Object.keys(safeUpdates).length) return;

    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    await updateDoc(channelDoc, safeUpdates);
  }

  async addMembers(channelId: string, memberUids: string[]): Promise<void> {
    const unique = Array.from(new Set(memberUids.filter(Boolean)));
    if (!unique.length) return;
    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    await updateDoc(channelDoc, {
      members: arrayUnion(...unique)
    });
  }

  async removeMember(channelId: string, memberUid: string): Promise<void> {
    if (!memberUid) return;
    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    await updateDoc(channelDoc, {
      members: arrayRemove(memberUid)
    });
  }
}