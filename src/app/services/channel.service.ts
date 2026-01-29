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

  /**
   * Creates a new channel with the specified name, description, and members.
   * @param name - The name of the channel.
   * @param description - The description of the channel.
   * @param createdById - The user ID of the channel creator.
   * @param memberUids - Optional array of member user IDs to add.
   * @returns The created channel object with its ID.
   */
  async createChannel(name: string, description: string, createdById: string, memberUids: string[] = []): Promise<Channel> {
    const uniqueMembers = Array.from(new Set([createdById, ...memberUids].filter(Boolean)));
    const channelData = {
      createdAt: new Date(),
      createdById: createdById,
      name: name,
      description: description,
      members: uniqueMembers
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

  /**
   * Returns an observable that emits all channels in real-time.
   * @returns An observable of the channel array.
   */
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

  /**
   * Retrieves a channel by its ID.
   * @param channelId - The ID of the channel to retrieve.
   * @returns The channel object or null if not found.
   */
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

  /**
   * Updates the name and/or description of a channel.
   * @param channelId - The ID of the channel to update.
   * @param updates - An object containing the fields to update.
   */
  async updateChannel(channelId: string, updates: Partial<Pick<Channel, 'name' | 'description'>>): Promise<void> {
    const safeUpdates: any = {};
    if (typeof updates.name === 'string') safeUpdates.name = updates.name.trim();
    if (typeof updates.description === 'string') safeUpdates.description = updates.description.trim();
    if (!Object.keys(safeUpdates).length) return;

    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    await updateDoc(channelDoc, safeUpdates);
  }

  /**
   * Adds members to a channel.
   * @param channelId - The ID of the channel.
   * @param memberUids - Array of user IDs to add as members.
   */
  async addMembers(channelId: string, memberUids: string[]): Promise<void> {
    const unique = Array.from(new Set(memberUids.filter(Boolean)));
    if (!unique.length) return;
    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    await updateDoc(channelDoc, {
      members: arrayUnion(...unique)
    });
  }

  /**
   * Removes a member from a channel.
   * @param channelId - The ID of the channel.
   * @param memberUid - The user ID of the member to remove.
   */
  async removeMember(channelId: string, memberUid: string): Promise<void> {
    if (!memberUid) return;
    const channelDoc = doc(this.firebaseService.db, 'channels', channelId);
    await updateDoc(channelDoc, {
      members: arrayRemove(memberUid)
    });
  }
}