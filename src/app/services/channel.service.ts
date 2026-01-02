import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, addDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

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

  getAllChannels(): Observable<Channel[]> {
    return new Observable<Channel[]>(observer => {
          const channelsRef = collection(this.firebaseService.db, 'channels');
          
          const unsubscribe = onSnapshot(channelsRef, (snapshot) => {
            const channels = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                name: data['name'],
                description : data['description'],
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
}
