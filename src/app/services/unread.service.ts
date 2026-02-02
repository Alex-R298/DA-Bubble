import { Injectable, inject } from '@angular/core';
import { doc, setDoc, getDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class UnreadService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  
  // Map von channelId/oderId -> hat ungelesene Nachrichten
  private unreadChannels = new BehaviorSubject<Set<string>>(new Set());
  private unreadDMs = new BehaviorSubject<Set<string>>(new Set());
  
  unreadChannels$ = this.unreadChannels.asObservable();
  unreadDMs$ = this.unreadDMs.asObservable();

  /**
   * Markiert einen Channel als gelesen (speichert aktuellen Timestamp)
   */
  async markChannelAsRead(channelId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid || !channelId) return;
    
    const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', channelId);
    await setDoc(lastReadDoc, { 
      timestamp: new Date(),
      type: 'channel'
    });
    
    // Entferne aus unread Set
    const current = new Set(this.unreadChannels.value);
    current.delete(channelId);
    this.unreadChannels.next(current);
  }

  /**
   * Markiert eine DM-Konversation als gelesen
   */
  async markDMAsRead(otherUserId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid || !otherUserId) return;
    
    const conversationId = this.getDMConversationId(uid, otherUserId);
    const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', conversationId);
    await setDoc(lastReadDoc, { 
      timestamp: new Date(),
      type: 'dm'
    });
    
    // Entferne aus unread Set
    const current = new Set(this.unreadDMs.value);
    current.delete(otherUserId);
    this.unreadDMs.next(current);
  }

  /**
   * Prüft ob ein Channel ungelesene Nachrichten hat
   */
  hasUnreadChannel(channelId: string): boolean {
    return this.unreadChannels.value.has(channelId);
  }

  /**
   * Prüft ob eine DM ungelesene Nachrichten hat
   */
  hasUnreadDM(userId: string): boolean {
    return this.unreadDMs.value.has(userId);
  }

  /**
   * Startet das Listening auf neue Nachrichten für alle Channels
   */
  startListeningForChannelMessages(channelIds: string[]): void {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid) return;

    channelIds.forEach(channelId => {
      this.listenToChannelMessages(channelId, uid);
    });
  }

  private async listenToChannelMessages(channelId: string, uid: string): Promise<void> {
    // Hole lastRead Timestamp
    const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', channelId);
    const lastReadSnap = await getDoc(lastReadDoc);
    const lastReadTime = lastReadSnap.exists() 
      ? lastReadSnap.data()['timestamp']?.toDate() || new Date(0)
      : new Date(0);

    // Höre auf Nachrichten in diesem Channel
    const messagesRef = collection(this.firebaseService.db, 'messages');
    
    onSnapshot(messagesRef, (snapshot) => {
      const hasUnread = snapshot.docs.some(doc => {
        const data = doc.data();
        if (data['channelId'] !== channelId) return false;
        if (data['senderId'] === uid) return false; // Eigene Nachrichten ignorieren
        
        const messageTime = data['timestamp']?.toDate() || new Date(0);
        return messageTime > lastReadTime;
      });

      const current = new Set(this.unreadChannels.value);
      if (hasUnread) {
        current.add(channelId);
      } else {
        current.delete(channelId);
      }
      this.unreadChannels.next(current);
    });
  }

  /**
   * Startet das Listening auf neue DMs
   */
  startListeningForDMMessages(userIds: string[]): void {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid) return;

    userIds.forEach(userId => {
      this.listenToDMMessages(userId, uid);
    });
  }

  private async listenToDMMessages(otherUserId: string, uid: string): Promise<void> {
    const conversationId = this.getDMConversationId(uid, otherUserId);
    
    // Hole lastRead Timestamp
    const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', conversationId);
    const lastReadSnap = await getDoc(lastReadDoc);
    const lastReadTime = lastReadSnap.exists() 
      ? lastReadSnap.data()['timestamp']?.toDate() || new Date(0)
      : new Date(0);

    // Höre auf DM Nachrichten - Collection ist 'direct-messages' (flat structure)
    const dmRef = collection(this.firebaseService.db, 'direct-messages');
    
    onSnapshot(dmRef, (snapshot) => {
      const hasUnread = snapshot.docs.some(docSnap => {
        const data = docSnap.data();
        // Nur Nachrichten dieser Konversation
        if (data['conversationId'] !== conversationId) return false;
        // Eigene Nachrichten ignorieren
        if (data['senderId'] === uid) return false;
        // Thread-Antworten ignorieren
        if (data['parentMessageId']) return false;
        
        const messageTime = data['timestamp']?.toDate() || new Date(0);
        return messageTime > lastReadTime;
      });

      const current = new Set(this.unreadDMs.value);
      if (hasUnread) {
        current.add(otherUserId);
      } else {
        current.delete(otherUserId);
      }
      this.unreadDMs.next(current);
    });
  }

  private getDMConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }
}
