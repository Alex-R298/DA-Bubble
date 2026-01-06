import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, addDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
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
  private userService = inject(UserService);

  async createMessage(channelId: string, senderId: string, content: string, senderName: string, senderProfileImage?: string): Promise<Message> {
    const messageData = {
      channelId: channelId,
      senderId: senderId,
      content: content,
      senderName: senderName,
      senderProfileImage: senderProfileImage || '',
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
    
    const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
      const messages = await Promise.all(
        snapshot.docs
          .map(async doc => {
            const data = doc.data();
            let senderProfileImage = data['senderProfileImage'] || '';
            if (!senderProfileImage && data['senderId']) {
              try {
                const user = await this.userService.getUserById(data['senderId']);
                if (user && user.profileImageUrl) {
                  senderProfileImage = user.profileImageUrl;
                }
              } catch (error) {
                console.log('Could not load avatar for user:', data['senderId']);
              }
            }
            
            return {
              id: doc.id, 
              channelId: data['channelId'],
              senderId: data['senderId'],
              content: data['content'],
              senderName: data['senderName'],
              senderProfileImage: senderProfileImage,
              timestamp: data['timestamp'].toDate(),
              parentMessageId: data['parentMessageId'], 
              replies: data['replies'] || []              
            };
          })
      );
      
      const filteredMessages = messages
        .filter(message => message.channelId === channelId && !message.parentMessageId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
      observer.next(filteredMessages);
    });

    return () => unsubscribe(); 
  });
}
}