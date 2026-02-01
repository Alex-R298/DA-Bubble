import { Injectable, inject } from '@angular/core';
import { doc, setDoc, collection, addDoc, onSnapshot, getDoc, updateDoc, deleteField } from 'firebase/firestore';
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

  /**
   * Creates a new message in a channel.
   * @param channelId - The ID of the channel to post the message in.
   * @param senderId - The ID of the message sender.
   * @param content - The message content.
   * @param senderName - The display name of the sender.
   * @param senderProfileImage - Optional profile image URL of the sender.
   * @returns The created message object.
   */
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

    return {
      id: docRef.id,
      ...messageData
    };
  }

  /**
   * Returns an observable of all messages in a specific channel.
   * @param channelId - The ID of the channel to get messages for.
   * @returns An observable emitting the array of messages.
   */
  getMessagesByChannelId(channelId: string): Observable<Message[]> {
    return new Observable<Message[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'messages');

      const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
        const allDocs = snapshot.docs;
        
        const messages = await Promise.all(
          allDocs
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
                  // Avatar loading failed silently
                }
              }

              // Count actual replies by checking which messages have this message as parent
              const actualReplies = allDocs.filter(d => d.data()['parentMessageId'] === doc.id);

              return {
                id: doc.id,
                channelId: data['channelId'],
                senderId: data['senderId'],
                content: data['content'],
                senderName: data['senderName'],
                senderProfileImage: senderProfileImage,
                timestamp: data['timestamp'] ? data['timestamp'].toDate() : new Date(),
                parentMessageId: data['parentMessageId'],
                replies: actualReplies.map(r => r.id),
                lastReplyTimestamp: data['lastReplyTimestamp'] ? data['lastReplyTimestamp'].toDate() : null,
                reactions: data['reactions'] || {},
                isEdited: data['isEdited'] || false
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

  /**
   * Returns an observable of all messages sorted by timestamp.
   * @returns An observable emitting all messages.
   */
  getAllMessages(): Observable<Message[]> {
    return new Observable<Message[]>(observer => {
      const messagesRef = collection(this.firebaseService.db, 'messages');

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
              channelId: data['channelId'],
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
   * Edits the content of an existing message.
   * @param messageId - The ID of the message to edit.
   * @param newContent - The new content for the message.
   */
  editMessage(messageId: string, newContent: string): Promise<void> {
    const messageRef = doc(this.firebaseService.db, 'messages', messageId);
    return setDoc(messageRef, {
      content: newContent,
      isEdited: true,
      editedAt: new Date()
    }, { merge: true });
  }

  /**
   * Toggles a reaction on a message for a specific user.
   * @param messageId - The ID of the message to react to.
   * @param emoji - The emoji to toggle.
   * @param userId - The ID of the user toggling the reaction.
   * @param userName - The display name of the user.
   */
  async toggleReaction(messageId: string, emoji: string, userId: string, userName: string): Promise<void> {
    const messageRef = doc(this.firebaseService.db, 'messages', messageId);
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

  /**
   * Returns a realtime observable for a single message by ID.
   * @param messageId - The ID of the message to observe.
   * @returns An observable emitting the message or null.
   */
  getMessageById(messageId: string): Observable<any | null> {
    return new Observable<any | null>(observer => {
      const messageRef = doc(this.firebaseService.db, 'messages', messageId);

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
            // Avatar loading failed silently
          }
        }

        observer.next({
          id: docSnap.id,
          channelId: data['channelId'],
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

      return () => unsubscribe();
    });
  }
}