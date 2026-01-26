import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { ChatService } from '../../services/chat.service';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
// import { Channel } from '../../models/channel.model';
// import { User } from '../../models/user.model';
import { ChannelService, Channel } from '../../services/channel.service';
import { Subscription } from 'rxjs';
import { NewMessageStateService } from '../../services/new-message-state.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { UserProfileModalComponent, UserProfileModalUser } from '../user-profile-modal/user-profile-modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { UnreadService } from '../../services/unread.service';
import { MessageService, Message } from '../../services/message.service';
import { DirectMessageService, DirectMessage } from '../../services/direct-message.service';
import { SearchService } from '../../services/search.service';

type SearchMessageResult = {
  type: 'channel' | 'dm';
  messageId?: string;
  content: string;
  senderName?: string;
  senderProfileImage?: string;
  timestamp: Date;
  channelId?: string;
  channelName?: string;
  conversationId?: string;
  otherUserId?: string | null;
  otherUserName?: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule, UserProfileModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', '../../shared/styles/shared-search.css', './sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  // private chatService = inject(ChatService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private channelService = inject(ChannelService);
  private newMessageStateService = inject(NewMessageStateService);
  private unreadService = inject(UnreadService);
  private messageService = inject(MessageService);
  private directMessageService = inject(DirectMessageService);
  private searchService = inject(SearchService);
  private usersSubscription?: Subscription; // ← NEU
  private channelsSubscription?: Subscription;
  private messagesSubscription?: Subscription;
  private dmMessagesSubscription?: Subscription;
  private authSubscription?: Subscription;
  private currentUserSubscription?: Subscription;

  channels: any[] = [];
  users: any[] = [];
  allUsers: User[] = [];
  allChannels: Channel[] = [];
  memberChannels: Channel[] = [];
  allChannelMessages: Message[] = [];
  allDirectMessages: DirectMessage[] = [];
  currentUserProfile: User | null = null;
  currentUser: any | null = null;
  unreadChannels: Set<string> = new Set();
  unreadDMs: Set<string> = new Set();

  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;

  isCollapsed = false;

  @Output() collapsedChange = new EventEmitter<boolean>();
  channelsExpanded = true;
  directMessagesExpanded = true;

  showNewChannelModal = false;
  showAddPeopleModal = false;
  newChannelName = '';
  newChannelDescription = '';
  addPeopleSelection: 'all' | 'specific' | null = null;
  addPeopleQuery = '';
  selectedAddPeople: any[] = [];
  selectedSourceChannelId: string | null = null;

  showUserProfileModal = false;
  selectedProfileUser: UserProfileModalUser | null = null;

  searchQuery = '';
  showTagDropdown = false;
  tagListType: 'user' | 'channel' | null = null;
  tagQuery = '';
  showSearchResults = false;
  currentUserId = '';
  private readonly searchResultLimit = 6;

  ngOnInit(): void {
    // subscriptions disabled until services/models are available
    this.authSubscription = this.authService.authState$.subscribe(authUser => {
      this.currentUserId = authUser?.uid || '';
      if (authUser?.uid) {
        this.currentUserSubscription?.unsubscribe();
        this.currentUserSubscription = this.userService.subscribeToUser(authUser.uid)
          .subscribe(user => this.currentUserProfile = user);
      } else {
        this.currentUserProfile = null;
        this.currentUserSubscription?.unsubscribe();
      }
      if (this.allUsers.length) {
        this.users = this.allUsers.filter(u => u.uid !== this.currentUserId);
      }
      this.updateMemberChannels();
    });
    this.subscribeToChannels();
    this.subscribeToUsers();
    this.subscribeToCurrentUser();
    this.subscribeToUnread();
    this.subscribeToMessages();
    this.subscribeToDirectMessages();
  }

  ngOnDestroy(): void {
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
    if (this.channelsSubscription) {
      this.channelsSubscription.unsubscribe();
    }
    this.messagesSubscription?.unsubscribe();
    this.dmMessagesSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.currentUserSubscription?.unsubscribe();
  }

  private subscribeToChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        this.channels = channels;
        this.allChannels = channels;
        this.updateMemberChannels();
        // Starte Listening für unread Nachrichten
        const channelIds = channels.map(c => c.id).filter(id => id) as string[];
        this.unreadService.startListeningForChannelMessages(channelIds);
      });
  }

  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.currentUserId || this.authService.getCurrentUser()?.uid;
        this.allUsers = users;
        this.users = users.filter(u => u.uid !== currentUid);
        // Starte Listening für unread DMs
        const userIds = this.users.map(u => u.uid);
        this.unreadService.startListeningForDMMessages(userIds);
      });
  }

  private subscribeToMessages(): void {
    this.messagesSubscription = this.messageService.getAllMessages()
      .subscribe(messages => {
        this.allChannelMessages = messages;
      });
  }

  private subscribeToDirectMessages(): void {
    this.dmMessagesSubscription = this.directMessageService.getAllDirectMessages()
      .subscribe(messages => {
        this.allDirectMessages = messages;
      });
  }

  private subscribeToCurrentUser(): void {
    // this.authService.userProfile$.subscribe(user => this.currentUser = user);
  }

  private updateMemberChannels(): void {
    const currentUid = this.currentUserId || this.authService.getCurrentUser()?.uid;
    if (!currentUid) {
      this.memberChannels = [];
      return;
    }
    this.memberChannels = this.allChannels.filter(c => Array.isArray(c.members) && c.members.includes(currentUid));
  }

  private subscribeToUnread(): void {
    this.unreadService.unreadChannels$.subscribe(set => {
      this.unreadChannels = set;
    });
    this.unreadService.unreadDMs$.subscribe(set => {
      this.unreadDMs = set;
    });
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }
  toggleChannels(): void { this.channelsExpanded = !this.channelsExpanded; }
  toggleDirectMessages(): void { this.directMessagesExpanded = !this.directMessagesExpanded; }

  selectChannel(channel: any): void {
    this.newMessageStateService.closeNewMessage();
    this.selectedChannelId = channel.id;
    this.selectedUserId = null;
    // Markiere Channel als gelesen
    this.unreadService.markChannelAsRead(channel.id);
    // this.chatService.selectChannel(channel.id);
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  startDirectMessage(user: any): void {
    this.newMessageStateService.closeNewMessage();
    this.selectedUserId = user.uid;
    this.selectedChannelId = null;
    // Markiere DM als gelesen
    this.unreadService.markDMAsRead(user.uid);
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  openNewMessage(): void {
    this.newMessageStateService.openNewMessage();
    this.router.navigate(['/dashboard']);
  }

  openNewChannelModal(): void {
    this.showNewChannelModal = true;
    this.showAddPeopleModal = false;
    this.newChannelName = '';
    this.newChannelDescription = '';
    this.addPeopleSelection = null;
    this.addPeopleQuery = '';
    this.selectedAddPeople = [];
    this.selectedSourceChannelId = null;
  }

  closeNewChannelModal(): void { this.showNewChannelModal = false; }

  openAddPeopleModal(): void {
    if (!this.newChannelName.trim()) return;
    this.showNewChannelModal = false;
    this.showAddPeopleModal = true;
    this.addPeopleSelection = null;
    this.addPeopleQuery = '';
    this.selectedAddPeople = [];
    this.selectedSourceChannelId = null;
  }

  closeAddPeopleModal(): void { this.showAddPeopleModal = false; }

  setAddPeopleSelection(value: 'all' | 'specific', channel?: any): void {
    this.addPeopleSelection = value;
    if (value === 'all') {
      this.selectedSourceChannelId = channel?.id ?? null;
    } else {
      this.selectedSourceChannelId = null;
      this.addPeopleQuery = '';
      this.selectedAddPeople = [];
    }
  }

  get filteredAddPeople(): any[] {
    const query = this.addPeopleQuery.trim().toLowerCase();
    if (!query) return [];
    const selectedIds = new Set(this.selectedAddPeople.map(u => u.uid));
    return this.users
      .filter(u => !selectedIds.has(u.uid))
      .filter(u => (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query));
  }

  addPersonToSelection(user: any): void {
    if (!user || this.selectedAddPeople.find(u => u.uid === user.uid)) return;
    this.selectedAddPeople = [...this.selectedAddPeople, user];
    this.addPeopleQuery = '';
  }

  removeSelectedAddPerson(uid: string): void {
    this.selectedAddPeople = this.selectedAddPeople.filter(u => u.uid !== uid);
  }

  async createChannel(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    let memberUids: string[] = [];

    if (this.addPeopleSelection === 'all' && this.selectedSourceChannelId) {
      const sourceChannel = this.channels.find(c => c.id === this.selectedSourceChannelId);
      memberUids = Array.isArray(sourceChannel?.members) ? sourceChannel.members : [];
    }

    if (this.addPeopleSelection === 'specific') {
      memberUids = this.selectedAddPeople.map(u => u.uid).filter(Boolean);
    }

    await this.channelService.createChannel(
      this.newChannelName,
      this.newChannelDescription,
      currentUser.uid,
      memberUids
    );

    this.closeAddPeopleModal();
  }

  private validateUserLoggedIn(): boolean {
    // if (!this.authService.getCurrentUser()) {
    //   alert('Bitte zuerst einloggen!');
    //   return false;
    // }
    return true;
  }

  private async performChannelCreation(): Promise<void> {
    try {
      // const channelId = await this.chatService.createChannel(this.newChannelName.trim(), this.newChannelDescription.trim());
      this.closeNewChannelModal();
      // this.router.navigate(['/chat/channel', channelId]);
    } catch (error: any) {
      // alert('Fehler beim Erstellen: ' + error.message);
    }
  }

  getStatusClass(user: any): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away'; // ← Away hinzufügen!
    return 'status-offline';
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.updateTagState(value);
    this.updateSearchResultsVisibility();
  }

  get filteredSearchChannels(): Channel[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    return this.getSearchableChannels()
      .filter(c => (c.name || '').toLowerCase().includes(q))
      .slice(0, this.searchResultLimit);
  }

  get filteredSearchMessages(): SearchMessageResult[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    if (this.isEmailQuery()) return [];

    const channelIds = new Set(this.getSearchableChannels().map(c => c.id).filter(Boolean) as string[]);

    const channelMessages = this.allChannelMessages
      .filter(m => channelIds.has(m.channelId) && !(m as any).parentMessageId)
      .filter(m => this.messageMatchesQuery(m, q))
      .map(m => ({
        type: 'channel',
        messageId: m.id,
        content: m.content,
        senderName: m.senderName,
        senderProfileImage: (m as any).senderProfileImage,
        timestamp: m.timestamp,
        channelId: m.channelId,
        channelName: this.getChannelNameById(m.channelId)
      } as SearchMessageResult));

    const directMessages = this.allDirectMessages
      .filter(dm => this.isCurrentUserInConversation(dm.conversationId) && !(dm as any).parentMessageId)
      .filter(dm => this.messageMatchesQuery(dm, q))
      .map(dm => {
        const otherUserId = this.getOtherUserIdFromConversation(dm.conversationId);
        return {
          type: 'dm',
          messageId: dm.id,
          content: dm.content,
          senderName: dm.senderName,
          senderProfileImage: (dm as any).senderProfileImage,
          timestamp: dm.timestamp,
          conversationId: dm.conversationId,
          otherUserId: otherUserId,
          otherUserName: otherUserId ? this.getUserNameById(otherUserId) : undefined
        } as SearchMessageResult;
      });

    return [...channelMessages, ...directMessages]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.searchResultLimit);
  }

  get hasSearchResults(): boolean {
    return this.filteredSearchChannels.length > 0
      || this.filteredSearchUsers.length > 0
      || this.filteredSearchMessages.length > 0;
  }

  get filteredSearchUsers(): User[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    if (!this.isEmailQuery() && q.length < 3) return [];
    if (!this.isEmailQuery() && this.filteredSearchMessages.length > 0) return [];
    const sourceUsers = this.getSearchUsersSource();
    if (this.isEmailQuery()) {
      return sourceUsers
        .filter(u => (u.email || '').toLowerCase().includes(q))
        .slice(0, this.searchResultLimit);
    }
    return sourceUsers
      .filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .slice(0, this.searchResultLimit);
  }

  get filteredMentionUsers(): User[] {
    if (!this.showTagDropdown || this.tagListType !== 'user') return [];
    const q = this.tagQuery.trim().toLowerCase();
    if (!q) return this.allUsers;
    return this.allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    );
  }

  get filteredMentionChannels(): Channel[] {
    if (!this.showTagDropdown || this.tagListType !== 'channel') return [];
    const q = this.tagQuery.trim().toLowerCase();
    const channels = this.getSearchableChannels();
    if (!q) return channels;
    return channels.filter(c => (c.name || '').toLowerCase().includes(q));
  }

  selectMentionUser(user: User): void {
    if (!user?.uid) return;
    this.clearSearch();
    this.openUserProfile(user);
  }

  selectMentionChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  selectSearchChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  selectSearchUser(user: User): void {
    if (!user?.uid) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  selectSearchMessage(result: SearchMessageResult): void {
    if (result.type === 'channel' && result.channelId) {
      this.clearSearch();
      this.router.navigate(['/dashboard/chat/channel', result.channelId]);
      return;
    }
    if (result.type === 'dm' && result.otherUserId) {
      this.clearSearch();
      this.router.navigate(['/dashboard/chat/user', result.otherUserId]);
    }
  }

  private updateTagState(value: string): void {
    const match = value.trim().match(/^([@#])([^\s]*)$/);
    if (!match) {
      this.showTagDropdown = false;
      this.tagListType = null;
      this.tagQuery = '';
      return;
    }
    const trigger = match[1];
    this.tagListType = trigger === '@' ? 'user' : 'channel';
    this.showTagDropdown = true;
    this.tagQuery = match[2] || '';
  }

  private updateSearchResultsVisibility(): void {
    const hasQuery = !!this.normalizedSearchQuery;
    this.showSearchResults = hasQuery && !this.showTagDropdown;
  }

  private clearSearch(): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
  }

  private get normalizedSearchQuery(): string {
    return this.searchQuery.trim().toLowerCase();
  }

  private messageMatchesQuery(message: { content: string; senderName?: string }, q: string): boolean {
    return this.searchService.messageMatchesQuery(message, q);
  }

  private normalizeText(value: string): string {
    return this.searchService.normalizeText(value);
  }

  private isEmailQuery(): boolean {
    return this.searchService.isEmailQuery(this.searchQuery);
  }

  private getChannelNameById(channelId: string): string {
    return this.searchService.getChannelNameById(channelId, this.getSearchableChannels());
  }

  private getSearchUsersSource(): User[] {
    return this.searchService.getSearchUsersSource(this.allUsers, this.currentUserProfile);
  }

  private getSearchableChannels(): Channel[] {
    return this.searchService.getSearchableChannels(this.memberChannels, this.allChannels);
  }

  private isCurrentUserInConversation(conversationId?: string): boolean {
    return this.searchService.isCurrentUserInConversation(conversationId, this.currentUserId);
  }

  private getOtherUserIdFromConversation(conversationId?: string): string | null {
    return this.searchService.getOtherUserIdFromConversation(conversationId, this.currentUserId);
  }

  private getUserNameById(uid: string): string {
    return this.searchService.getUserNameById(this.allUsers, this.currentUserProfile, uid);
  }

  formatMessagePreview(content: string): string {
    return this.searchService.formatMessagePreview(content);
  }

  trackByChannelId(index: number, channel: Channel): string {
    return channel.id || `${index}`;
  }

  trackBySearchMessage(index: number, message: SearchMessageResult): string {
    return message.messageId || `${message.type}-${message.timestamp.getTime()}-${index}`;
  }

  private replaceLastTag(value: string, trigger: '@' | '#', name: string): string {
    return this.searchService.replaceLastTag(value, trigger, name);
  }

  openUserProfile(user: any): void {
    if (!user) return;
    this.setSelectedProfileUser(user);
    this.showUserProfileModal = true;
  }

  closeUserProfile(): void {
    this.showUserProfileModal = false;
    this.selectedProfileUser = null;
  }

  isSelectedProfileOwn(): boolean {
    const currentUid = this.authService.getCurrentUser()?.uid;
    if (!currentUid) return false;
    return this.selectedProfileUser?.uid === currentUid;
  }

  async startDirectMessageFromProfile(user: UserProfileModalUser): Promise<void> {
    this.closeUserProfile();
    if (!user?.uid) return;
    if (user.uid === this.authService.getCurrentUser()?.uid) return;
    await this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  private setSelectedProfileUser(user: any): void {
    this.selectedProfileUser = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      status: user.status
    };
  }
}

