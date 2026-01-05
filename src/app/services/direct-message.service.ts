import { Injectable, inject } from '@angular/core';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
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

  async createDirectMessage(conversationId: string, senderId: string, content: string, senderName: string): Promise<DirectMessage> {
    const messageData = {
      conversationId: conversationId,
      senderId: senderId,
      content: content,
      senderName: senderName,
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
      
      const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
        const messages = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              conversationId: data['conversationId'],
              senderId: data['senderId'],
              content: data['content'],
              senderName: data['senderName'],
              timestamp: data['timestamp'].toDate(),
              parentMessageId: data['parentMessageId'],
              replies: data['replies'] || []
            };
          })
          .filter(message => message.conversationId === conversationId && !message.parentMessageId)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        observer.next(messages);
      });

      return () => unsubscribe();
    });
  }
}