import { Injectable, inject, OnDestroy } from '@angular/core';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UnreadService implements OnDestroy {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  private unreadChannels = new BehaviorSubject<Set<string>>(new Set());
  private unreadDMs = new BehaviorSubject<Set<string>>(new Set());

  // Only 2 listeners instead of 20+ - one listener per collection
  private messagesUnsubscribe: (() => void) | null = null;
  private dmUnsubscribe: (() => void) | null = null;

  // Tracking which channels/users we are watching
  private watchedChannelIds = new Set<string>();
  private watchedUserIds = new Set<string>();
  private lastReadCache = new Map<string, Date>();

  private isListeningMessages = false;
  private isListeningDMs = false;

  unreadChannels$ = this.unreadChannels.asObservable();
  unreadDMs$ = this.unreadDMs.asObservable();

  ngOnDestroy(): void {
    this.cleanup();
  }

  cleanup(): void {
    this.messagesUnsubscribe?.();
    this.messagesUnsubscribe = null;
    this.dmUnsubscribe?.();
    this.dmUnsubscribe = null;
    this.isListeningMessages = false;
    this.isListeningDMs = false;
    this.watchedChannelIds.clear();
    this.watchedUserIds.clear();
    this.lastReadCache.clear();
  }

  async markChannelAsRead(channelId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid || !channelId) return;

    const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', channelId);
    await setDoc(lastReadDoc, { timestamp: new Date(), type: 'channel' });

    this.lastReadCache.set(`channel_${channelId}`, new Date());
    const current = new Set(this.unreadChannels.value);
    current.delete(channelId);
    this.unreadChannels.next(current);
  }

  async markDMAsRead(otherUserId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid || !otherUserId) return;

    const conversationId = this.getDMConversationId(uid, otherUserId);
    const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', conversationId);
    await setDoc(lastReadDoc, { timestamp: new Date(), type: 'dm' });

    this.lastReadCache.set(`dm_${otherUserId}`, new Date());
    const current = new Set(this.unreadDMs.value);
    current.delete(otherUserId);
    this.unreadDMs.next(current);
  }

  hasUnreadChannel(channelId: string): boolean {
    return this.unreadChannels.value.has(channelId);
  }

  hasUnreadDM(userId: string): boolean {
    return this.unreadDMs.value.has(userId);
  }

  /**
   * Registers channels to watch for new messages - uses a single listener for all.
   * @param channelIds - Array of channel IDs to watch
   */
  async startListeningForChannelMessages(channelIds: string[]): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid || !channelIds.length) return;
    channelIds.forEach(id => this.watchedChannelIds.add(id));
    await this.loadLastReadTimestamps(channelIds, uid, 'channel');
    if (!this.isListeningMessages) {
      this.isListeningMessages = true;
      this.startSingleMessagesListener(uid);
    }
  }

  /**
   * Registers users to watch for new DMs - uses a single listener for all.
   * @param userIds - Array of user IDs to watch
   */
  async startListeningForDMMessages(userIds: string[]): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid || !userIds.length) return;
    userIds.forEach(id => this.watchedUserIds.add(id));
    await this.loadLastReadTimestamps(userIds, uid, 'dm');
    if (!this.isListeningDMs) {
      this.isListeningDMs = true;
      this.startSingleDMListener(uid);
    }
  }

  private async loadLastReadTimestamps(ids: string[], uid: string, type: 'channel' | 'dm'): Promise<void> {
    await Promise.all(ids.map(async id => {
      const cacheKey = type === 'channel' ? `channel_${id}` : `dm_${id}`;
      if (this.lastReadCache.has(cacheKey)) return;

      const docId = type === 'channel' ? id : this.getDMConversationId(uid, id);
      const lastReadDoc = doc(this.firebaseService.db, 'users', uid, 'lastRead', docId);
      const lastReadSnap = await getDoc(lastReadDoc);
      const timestamp = lastReadSnap.exists()
        ? lastReadSnap.data()['timestamp']?.toDate() || new Date(0)
        : new Date(0);
      this.lastReadCache.set(cacheKey, timestamp);
    }));
  }

  /**
   * Single listener for ALL channel messages.
   * @param uid - Current user's ID
   */
  private startSingleMessagesListener(uid: string): void {
    const messagesRef = collection(this.firebaseService.db, 'messages');

    this.messagesUnsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const unreadSet = new Set<string>();

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const channelId = data['channelId'];
        if (!channelId || !this.watchedChannelIds.has(channelId)) return;
        if (data['senderId'] === uid) return;
        if (data['parentMessageId']) return;

        const lastReadTime = this.lastReadCache.get(`channel_${channelId}`) || new Date(0);
        const messageTime = data['timestamp']?.toDate() || new Date(0);

        if (messageTime > lastReadTime) {
          unreadSet.add(channelId);
        }
      });

      this.unreadChannels.next(unreadSet);
    });
  }

  /**
   * Single listener for ALL direct messages.
   * @param uid - Current user's ID
   */
  private startSingleDMListener(uid: string): void {
    const dmRef = collection(this.firebaseService.db, 'direct-messages');

    this.dmUnsubscribe = onSnapshot(dmRef, (snapshot) => {
      const unreadSet = new Set<string>();

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const conversationId = data['conversationId'];
        if (!conversationId) return;
        const otherUserId = this.getOtherUserIdFromConversation(conversationId, uid);
        if (!otherUserId || !this.watchedUserIds.has(otherUserId)) return;
        if (data['senderId'] === uid) return;
        if (data['parentMessageId']) return;

        const lastReadTime = this.lastReadCache.get(`dm_${otherUserId}`) || new Date(0);
        const messageTime = data['timestamp']?.toDate() || new Date(0);

        if (messageTime > lastReadTime) {
          unreadSet.add(otherUserId);
        }
      });

      this.unreadDMs.next(unreadSet);
    });
  }

  private getOtherUserIdFromConversation(conversationId: string, currentUid: string): string | null {
    const parts = conversationId.split('_');
    if (parts.length !== 2) return null;
    return parts[0] === currentUid ? parts[1] : parts[0];
  }

  private getDMConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }
}
