import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, addDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';

export interface Message {
  id?: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private firebaseService = inject(FirebaseService);

  async createMessage(channelId: string, senderId: string, content: string, senderName: string): Promise<Message> {
    const messageData = {
      channelId: channelId,
      senderId: senderId,
      content: content,
      senderName: senderName,
      timestamp: new Date()
    };

    const docRef = await addDoc(
      collection(this.firebaseService.db, 'messages'),
      messageData
    );

    console.log('Message erstellt in Channel:', channelId, 'ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...messageData
    };
  } 

  getMessagesByChannelId(channelId: string): Observable<Message[]> {
    return new Observable<Message[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'messages'); 
      
      const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
        const messages = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id, 
              channelId: data['channelId'],
              senderId: data['senderId'],
              content: data['content'],
              senderName: data['senderName'],
              timestamp: data['timestamp'].toDate()
            };
          })
          .filter(message => message.channelId === channelId);  
        observer.next(messages);
      });

      return () => unsubscribe(); 
    });
  }
}