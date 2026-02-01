import { Injectable, inject } from '@angular/core';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
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
   * @param conversationId - The ID of the conversation to get messages for.
   * @returns An observable emitting the array of direct messages.
   */
  getMessagesByConversationId(conversationId: string): Observable<DirectMessage[]> {
    return new Observable<DirectMessage[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'direct-messages'); // ← Separate Collection!

      const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
        const allDocs = snapshot.docs;
        
        const messages = await Promise.all(
          allDocs.map(async doc => {
            const data = doc.data();
            let senderProfileImage = data['senderProfileImage'] || '';
            if (!senderProfileImage && data['senderId']) {
              try {
                const user = await this.userService.getUserById(data['senderId']);
                if (user && user.profileImageUrl) {
                  senderProfileImage = user.profileImageUrl;
                }
              } catch (error) {
                // Avatar loading failed silently
              }
            }

            // Count actual replies by checking which messages have this message as parent
            const actualReplies = allDocs.filter(d => d.data()['parentMessageId'] === doc.id);

            return {
              id: doc.id,
              conversationId: data['conversationId'],
              senderId: data['senderId'],
              content: data['content'],
              senderName: data['senderName'],
              senderProfileImage: senderProfileImage,
              timestamp: data['timestamp'].toDate(),
              parentMessageId: data['parentMessageId'],
              replies: actualReplies.map(r => r.id),
              reactions: data['reactions'] || {}
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

  /**
   * Returns an observable of all direct messages sorted by timestamp.
   * @returns An observable emitting all direct messages.
   */
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
                // Avatar loading failed silently
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
              replies: data['replies'] || [],
              reactions: data['reactions'] || {}
            };
          })
        );

        const sorted = messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        observer.next(sorted);
      });

      return () => unsubscribe();
    });
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
    
    // Ensure users and userNames are arrays
    if (!Array.isArray(reaction.users)) {
      reaction.users = [];
    }
    if (!Array.isArray(reaction.userNames)) {
      reaction.userNames = [];
    }
    
    const userIndex = reaction.users.indexOf(userId);

    if (userIndex === -1) {
      // User hasn't reacted yet - add reaction
      reaction.users.push(userId);
      reaction.userNames.push(userName);
      reaction.count = reaction.users.length;
      await updateDoc(messageRef, { [`reactions.${emoji}`]: reaction });
    } else {
      // User already reacted - remove reaction
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
}