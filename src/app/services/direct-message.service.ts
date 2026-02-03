import { Injectable, inject } from '@angular/core';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteField, query, where } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { Observable, shareReplay } from 'rxjs';

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

  // Cache for profile images to avoid repeated lookups
  private profileImageCache = new Map<string, string>();

  // Shared observable for all direct messages to prevent multiple subscriptions
  private allDirectMessages$: Observable<DirectMessage[]> | null = null;

  // Cache for conversation-specific message subscriptions - prevents multiple listeners
  private conversationMessagesCache = new Map<string, Observable<DirectMessage[]>>();

  // Cache for individual message subscriptions - prevents multiple listeners
  private messageByIdCache = new Map<string, Observable<any | null>>();

  /**
   * Creates a new direct message in a conversation.
   * @param conversationId - The ID of the conversation.
   * @param senderId - The ID of the message sender.
   * @param content - The message content.
   * @param senderName - The display name of the sender.
   * @param senderProfileImage - Optional profile image URL of the sender.
   * @returns The created direct message object.
   */
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

  /**
   * Returns an observable of all messages in a specific conversation.
   * Uses caching to prevent multiple Firestore listeners for the same conversation.
   * @param conversationId - The ID of the conversation to get messages for.
   * @returns An observable emitting the array of direct messages.
   */
  getMessagesByConversationId(conversationId: string): Observable<DirectMessage[]> {
    // Return cached subscription if exists
    if (this.conversationMessagesCache.has(conversationId)) {
      return this.conversationMessagesCache.get(conversationId)!;
    }

    const subscription$ = new Observable<DirectMessage[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'direct-messages');
      // Optimized query: Only load messages for this conversation
      const conversationQuery = query(messagesRef, where('conversationId', '==', conversationId));

      const unsubscribe = onSnapshot(conversationQuery, async (snapshot) => {
        const allDocs = snapshot.docs;

        // Collect all unique sender IDs that need profile images
        const sendersNeedingImages = new Set<string>();
        allDocs.forEach(doc => {
          const data = doc.data();
          const senderId = data['senderId'];
          if (senderId && !data['senderProfileImage'] && !this.profileImageCache.has(senderId)) {
            sendersNeedingImages.add(senderId);
          }
        });

        // Batch-load all missing profile images
        if (sendersNeedingImages.size > 0) {
          await Promise.all(
            Array.from(sendersNeedingImages).map(async senderId => {
              try {
                const user = await this.userService.getUserById(senderId);
                if (user?.profileImageUrl) {
                  this.profileImageCache.set(senderId, user.profileImageUrl);
                }
              } catch { /* ignore */ }
            })
          );
        }

        const messages = allDocs
          .filter(doc => !doc.data()['parentMessageId']) // Only main messages
          .map(doc => {
            const data = doc.data();
            const senderId = data['senderId'];
            const senderProfileImage = data['senderProfileImage'] || this.profileImageCache.get(senderId) || '';

            // Count actual replies
            const actualReplies = allDocs.filter(d => d.data()['parentMessageId'] === doc.id);

            return {
              id: doc.id,
              conversationId: data['conversationId'],
              senderId: senderId,
              content: data['content'],
              senderName: data['senderName'],
              senderProfileImage: senderProfileImage,
              timestamp: data['timestamp']?.toDate() || new Date(),
              parentMessageId: data['parentMessageId'],
              replies: actualReplies.map(r => r.id),
              reactions: data['reactions'] || {}
            };
          })
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        observer.next(messages);
      });

      return () => {
        unsubscribe();
        this.conversationMessagesCache.delete(conversationId);
      };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.conversationMessagesCache.set(conversationId, subscription$);
    return subscription$;
  }

  /**
   * Returns a shared observable of all direct messages sorted by timestamp.
   * Uses caching and shareReplay to prevent multiple Firestore subscriptions.
   * @returns An observable emitting all direct messages.
   */
  getAllDirectMessages(): Observable<DirectMessage[]> {
    if (!this.allDirectMessages$) {
      this.allDirectMessages$ = new Observable<DirectMessage[]>(observer => {
        const messagesRef = collection(this.firebaseService.db, 'direct-messages');

        const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
          // Batch collect all unique sender IDs that need profile images
          const sendersNeedingImages = new Set<string>();
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data['senderProfileImage'] && data['senderId'] && !this.profileImageCache.has(data['senderId'])) {
              sendersNeedingImages.add(data['senderId']);
            }
          });

          // Fetch missing profile images in parallel (limited batch)
          const imageFetches = Array.from(sendersNeedingImages).slice(0, 20).map(async senderId => {
            try {
              const user = await this.userService.getUserById(senderId);
              if (user?.profileImageUrl) {
                this.profileImageCache.set(senderId, user.profileImageUrl);
              }
            } catch { /* ignore */ }
          });
          await Promise.all(imageFetches);

          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            let senderProfileImage = data['senderProfileImage'] || '';
            if (!senderProfileImage && data['senderId']) {
              senderProfileImage = this.profileImageCache.get(data['senderId']) || '';
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
              replies: data['replies'] || [],
              reactions: data['reactions'] || {}
            };
          });

          const sorted = messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          observer.next(sorted);
        });

        return () => unsubscribe();
      }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.allDirectMessages$;
  }

  /**
   * Toggles a reaction on a direct message for a specific user.
   * @param messageId - The ID of the direct message to react to.
   * @param emoji - The emoji to toggle.
   * @param userId - The ID of the user toggling the reaction.
   * @param userName - The display name of the user.
   */
  async toggleReaction(messageId: string, emoji: string, userId: string, userName: string): Promise<void> {
    const messageRef = doc(this.firebaseService.db, 'direct-messages', messageId);
    const messageDoc = await getDoc(messageRef);
  
    if (!messageDoc.exists()) return;

    const data = messageDoc.data();
    const reactions = data['reactions'] || {};

    if (!reactions[emoji]) {
      reactions[emoji] = { users: [], userNames: [], count: 0 };
    }

    const reaction = reactions[emoji];
    if (!Array.isArray(reaction.users)) {
      reaction.users = [];
    }
    if (!Array.isArray(reaction.userNames)) {
      reaction.userNames = [];
    }
    
    const userIndex = reaction.users.indexOf(userId);

    if (userIndex === -1) {
      reaction.users.push(userId);
      reaction.userNames.push(userName);
      reaction.count = reaction.users.length;
      await updateDoc(messageRef, { [`reactions.${emoji}`]: reaction });
    } else {
      reaction.users.splice(userIndex, 1);
      reaction.userNames.splice(userIndex, 1);
      reaction.count = reaction.users.length;

      if (reaction.count === 0) {
        await updateDoc(messageRef, { [`reactions.${emoji}`]: deleteField() });
      } else {
        await updateDoc(messageRef, { [`reactions.${emoji}`]: reaction });
      }
    }
  }

  /**
   * Returns a realtime observable for a single direct message by ID.
   * Uses caching to prevent multiple Firestore listeners for the same message.
   * @param messageId - The ID of the message to observe.
   * @returns An observable emitting the message or null.
   */
  getMessageById(messageId: string): Observable<any | null> {
    if (this.messageByIdCache.has(messageId)) {
      return this.messageByIdCache.get(messageId)!;
    }

    const subscription$ = new Observable<any | null>(observer => {
      const messageRef = doc(this.firebaseService.db, 'direct-messages', messageId);

      const unsubscribe = onSnapshot(messageRef, async (docSnap) => {
        if (!docSnap.exists()) {
          observer.next(null);
          return;
        }

        const data = docSnap.data();
        let senderProfileImage = data['senderProfileImage'] || '';
        if (!senderProfileImage && data['senderId']) {
          try {
            const user = await this.userService.getUserById(data['senderId']);
            if (user && user.profileImageUrl) {
              senderProfileImage = user.profileImageUrl;
            }
          } catch (error) {
          }
        }

        observer.next({
          id: docSnap.id,
          conversationId: data['conversationId'],
          senderId: data['senderId'],
          content: data['content'],
          senderName: data['senderName'],
          senderProfileImage: senderProfileImage,
          timestamp: data['timestamp'] ? data['timestamp'].toDate() : new Date(),
          parentMessageId: data['parentMessageId'],
          replies: data['replies'] || [],
          lastReplyTimestamp: data['lastReplyTimestamp'] ? data['lastReplyTimestamp'].toDate() : null,
          reactions: data['reactions'] || {},
          isEdited: data['isEdited'] || false
        });
      });

      return () => {
        unsubscribe();
        this.messageByIdCache.delete(messageId);
      };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.messageByIdCache.set(messageId, subscription$);
    return subscription$;
  }
}