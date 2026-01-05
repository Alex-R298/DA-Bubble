import { Injectable, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ThreadService {
  private firebaseService = inject(FirebaseService);
  getThreadMessages(parentMessageId: string): Observable<Message[]> {
    return new Observable(observer => {
      const messagesRef = collection(this.firebaseService.db, 'messages');
      const threadQuery = query(
        messagesRef, 
        where('parentMessageId', '==', parentMessageId)
      );
      
      const unsubscribe = onSnapshot(threadQuery, (snapshot) => {
        const threadMessages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            channelId: data['channelId'],
            senderId: data['senderId'],
            senderName: data['senderName'],
            content: data['content'],
            timestamp: data['timestamp'].toDate(),
            parentMessageId: data['parentMessageId']
          } as Message;
        });
        threadMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        observer.next(threadMessages);
      });
      
      return () => unsubscribe();
    });
  }

  async addThreadReply(parentMessageId: string, channelId: string, senderId: string, senderName: string, content: string): Promise<Message> {
    const messagesRef = collection(this.firebaseService.db, 'messages');
    
    const replyData = {
      channelId: channelId,
      senderId: senderId,
      senderName: senderName,
      content: content,
      timestamp: new Date(),
      parentMessageId: parentMessageId
    };

    const docRef = await addDoc(messagesRef, replyData);
    const parentMessageRef = doc(this.firebaseService.db, 'messages', parentMessageId);
    await updateDoc(parentMessageRef, {
      replies: arrayUnion(docRef.id)
    });

    return {
      id: docRef.id,
      ...replyData
    } as Message;
  }

 
  getReplyCount(parentMessageId: string): Observable<number> {
    return new Observable(observer => {
      const messagesRef = collection(this.firebaseService.db, 'messages');
      const threadQuery = query(
        messagesRef, 
        where('parentMessageId', '==', parentMessageId)
      );
      
      const unsubscribe = onSnapshot(threadQuery, (snapshot) => {
        observer.next(snapshot.size);
      });
      
      return () => unsubscribe();
    });
  }
}
