import { Injectable, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { Observable, shareReplay } from 'rxjs';
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
  private threadMessagesCache = new Map<string, Observable<Message[]>>();
  private dmThreadMessagesCache = new Map<string, Observable<Message[]>>();

  /**
   * Retrieves all messages in a thread as a realtime observable.
   * Uses caching to prevent multiple Firestore listeners for the same thread.
   * @param parentMessageId - The ID of the parent message
   * @returns Observable stream of thread messages sorted by timestamp
   */
  getThreadMessages(parentMessageId: string): Observable<Message[]> {
    // Return cached subscription if exists
    if (this.threadMessagesCache.has(parentMessageId)) {
      return this.threadMessagesCache.get(parentMessageId)!;
    }

    const subscription$ = new Observable<Message[]>(observer => {
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

      return () => {
        unsubscribe();
        this.threadMessagesCache.delete(parentMessageId);
      };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.threadMessagesCache.set(parentMessageId, subscription$);
    return subscription$;
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


  /**
   * Retrieves all messages in a DM thread as a realtime observable.
   * Uses caching to prevent multiple Firestore listeners for the same thread.
   * @param parentMessageId - The ID of the parent direct message
   * @returns Observable stream of thread messages sorted by timestamp
   */
  getDirectMessageThreadMessages(parentMessageId: string): Observable<Message[]> {
    // Return cached subscription if exists
    if (this.dmThreadMessagesCache.has(parentMessageId)) {
      return this.dmThreadMessagesCache.get(parentMessageId)!;
    }

    const subscription$ = new Observable<Message[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'direct-messages');
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
              conversationId: data['conversationId'],
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

      return () => {
        unsubscribe();
        this.dmThreadMessagesCache.delete(parentMessageId);
      };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.dmThreadMessagesCache.set(parentMessageId, subscription$);
    return subscription$;
  }

  /**
   * Adds a reply to an existing DM thread
   * @param parentMessageId - The ID of the parent direct message
   * @param conversationId - The ID of the DM conversation
   * @param senderId - The ID of the user sending the reply
   * @param senderName - The display name of the sender
   * @param content - The message content
   * @param senderProfileImage - Optional profile image URL of the sender
   * @returns The created reply message
   */
  async addDirectMessageThreadReply(
    parentMessageId: string, 
    conversationId: string, 
    senderId: string, 
    senderName: string, 
    content: string, 
    senderProfileImage?: string
  ): Promise<Message> {
    const messagesRef = collection(this.firebaseService.db, 'direct-messages');
    
    const replyData = {
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
      senderProfileImage: senderProfileImage || '',
      content: content,
      timestamp: new Date(),
      parentMessageId: parentMessageId
    };

    const docRef = await addDoc(messagesRef, replyData);
    await this.updateDirectMessageParentWithReply(parentMessageId, docRef.id, replyData.timestamp);

    return {
      id: docRef.id,
      ...replyData
    } as Message;
  }

  /**
   * Updates the parent direct message with the new reply reference
   * @param parentMessageId - The ID of the parent direct message
   * @param replyId - The ID of the new reply
   * @param timestamp - The timestamp of the reply
   */
  private async updateDirectMessageParentWithReply(
    parentMessageId: string, 
    replyId: string, 
    timestamp: Date
  ): Promise<void> {
    const parentMessageRef = doc(this.firebaseService.db, 'direct-messages', parentMessageId);
    await updateDoc(parentMessageRef, {
      replies: arrayUnion(replyId),
      lastReplyTimestamp: timestamp
    });
  }

  /**
   * Gets the realtime count of replies for a direct message
   * @param parentMessageId - The ID of the parent direct message
   * @returns Observable stream of the reply count
   */
  getDirectMessageReplyCount(parentMessageId: string): Observable<number> {
    return new Observable(observer => {
      const messagesRef = collection(this.firebaseService.db, 'direct-messages');
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