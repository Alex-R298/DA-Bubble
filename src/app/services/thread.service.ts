import { Injectable, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { Observable } from 'rxjs';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Message } from '../models/message.model';

/**
 * Service for managing thread messages and replies.
 * Handles fetching thread messages, adding replies, and tracking reply counts.
 */
@Injectable({
  providedIn: 'root'
})
export class ThreadService {
  private firebaseService = inject(FirebaseService);
  private userService = inject(UserService);

  /**
   * Retrieves all messages in a thread as a realtime observable
   * @param parentMessageId - The ID of the parent message
   * @returns Observable stream of thread messages sorted by timestamp
   */
  getThreadMessages(parentMessageId: string): Observable<Message[]> {
    return new Observable(observer => {
      const messagesRef = collection(this.firebaseService.db, 'messages');
      const threadQuery = query(
        messagesRef, 
        where('parentMessageId', '==', parentMessageId)
      );
      
      const unsubscribe = onSnapshot(threadQuery, async (snapshot) => {
        const threadMessages = await Promise.all(
          snapshot.docs.map(async doc => {
            const data = doc.data();
            const senderProfileImage = await this.resolveSenderProfileImage(data);
            
            return {
              id: doc.id,
              channelId: data['channelId'],
              senderId: data['senderId'],
              senderName: data['senderName'],
              senderProfileImage: senderProfileImage,
              content: data['content'],
              timestamp: data['timestamp'].toDate(),
              parentMessageId: data['parentMessageId'],
              reactions: data['reactions'] || {},
              isEdited: data['isEdited'] || false
            } as Message;
          })
        );
        threadMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        observer.next(threadMessages);
      });
      
      return () => unsubscribe();
    });
  }

  /**
   * Resolves the sender's profile image from message data or user service
   * @param data - The message document data
   * @returns The profile image URL or empty string
   */
  private async resolveSenderProfileImage(data: any): Promise<string> {
    if (data['senderProfileImage']) {
      return data['senderProfileImage'];
    }
    
    if (data['senderId']) {
      try {
        const user = await this.userService.getUserById(data['senderId']);
        if (user?.profileImageUrl) {
          return user.profileImageUrl;
        }
      } catch (error) {
        console.log('Could not load avatar for thread reply:', data['senderId']);
      }
    }
    
    return '';
  }

  /**
   * Adds a reply to an existing thread
   * @param parentMessageId - The ID of the parent message
   * @param channelId - The ID of the channel containing the thread
   * @param senderId - The ID of the user sending the reply
   * @param senderName - The display name of the sender
   * @param content - The message content
   * @param senderProfileImage - Optional profile image URL of the sender
   * @returns The created reply message
   */
  async addThreadReply(
    parentMessageId: string, 
    channelId: string, 
    senderId: string, 
    senderName: string, 
    content: string, 
    senderProfileImage?: string
  ): Promise<Message> {
    const messagesRef = collection(this.firebaseService.db, 'messages');
    
    const replyData = {
      channelId: channelId,
      senderId: senderId,
      senderName: senderName,
      senderProfileImage: senderProfileImage || '',
      content: content,
      timestamp: new Date(),
      parentMessageId: parentMessageId
    };

    const docRef = await addDoc(messagesRef, replyData);
    await this.updateParentMessageWithReply(parentMessageId, docRef.id, replyData.timestamp);

    return {
      id: docRef.id,
      ...replyData
    } as Message;
  }

  /**
   * Updates the parent message with the new reply reference
   * @param parentMessageId - The ID of the parent message
   * @param replyId - The ID of the new reply
   * @param timestamp - The timestamp of the reply
   */
  private async updateParentMessageWithReply(
    parentMessageId: string, 
    replyId: string, 
    timestamp: Date
  ): Promise<void> {
    const parentMessageRef = doc(this.firebaseService.db, 'messages', parentMessageId);
    await updateDoc(parentMessageRef, {
      replies: arrayUnion(replyId),
      lastReplyTimestamp: timestamp
    });
  }

  /**
   * Gets the realtime count of replies for a message
   * @param parentMessageId - The ID of the parent message
   * @returns Observable stream of the reply count
   */
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