import { Injectable, inject } from '@angular/core';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { Observable } from 'rxjs';

export interface DirectMessage {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: Date;
  parentMessageId?: string;
  replies?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DirectMessageService {
  private firebaseService = inject(FirebaseService);
  private userService = inject(UserService);

  async createDirectMessage(conversationId: string, senderId: string, content: string, senderName: string, senderProfileImage?: string): Promise<DirectMessage> {
    const messageData = {
      conversationId: conversationId,
      senderId: senderId,
      content: content,
      senderName: senderName,
      senderProfileImage: senderProfileImage || '',
      timestamp: new Date()
    };

    const docRef = await addDoc(
      collection(this.firebaseService.db, 'direct-messages'), // ← Separate Collection!
      messageData
    );

    return {
      id: docRef.id,
      ...messageData
    };
  }

  getMessagesByConversationId(conversationId: string): Observable<DirectMessage[]> {
    return new Observable<DirectMessage[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'direct-messages'); // ← Separate Collection!

      const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
        const messages = await Promise.all(
          snapshot.docs.map(async doc => {
            const data = doc.data();
            let senderProfileImage = data['senderProfileImage'] || '';
            if (!senderProfileImage && data['senderId']) {
              try {
                const user = await this.userService.getUserById(data['senderId']);
                if (user && user.profileImageUrl) {
                  senderProfileImage = user.profileImageUrl;
                }
              } catch (error) {
                console.log('Could not load avatar for DM user:', data['senderId']);
              }
            }

            return {
              id: doc.id,
              conversationId: data['conversationId'],
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
          .filter(message => message.conversationId === conversationId && !message.parentMessageId)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        observer.next(filteredMessages);
      });

      return () => unsubscribe();
    });
  }

  getAllDirectMessages(): Observable<DirectMessage[]> {
    return new Observable<DirectMessage[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'direct-messages');

      const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
        const messages = await Promise.all(
          snapshot.docs.map(async doc => {
            const data = doc.data();
            let senderProfileImage = data['senderProfileImage'] || '';
            if (!senderProfileImage && data['senderId']) {
              try {
                const user = await this.userService.getUserById(data['senderId']);
                if (user && user.profileImageUrl) {
                  senderProfileImage = user.profileImageUrl;
                }
              } catch (error) {
                console.log('Could not load avatar for DM user:', data['senderId']);
              }
            }

            return {
              id: doc.id,
              conversationId: data['conversationId'],
              senderId: data['senderId'],
              content: data['content'],
              senderName: data['senderName'],
              senderProfileImage: senderProfileImage,
              timestamp: data['timestamp']?.toDate() || new Date(),
              parentMessageId: data['parentMessageId'],
              replies: data['replies'] || []
            };
          })
        );

        const sorted = messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        observer.next(sorted);
      });

      return () => unsubscribe();
    });
  }
}