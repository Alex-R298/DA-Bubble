import { Component, EventEmitter, Output, inject, OnInit, HostListener } from '@angular/core';
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

/**
 * Sidebar component for navigation and search.
 * Displays channels, direct messages, and provides search functionality across the application.
 */
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

  /**
   * Initializes component subscriptions for channels, users, messages, and unread notifications.
   */
  ngOnInit(): void {
    this.ensureSidebarOpenForMobile();
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

  /**
   * Handles window resize events to adjust sidebar visibility.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    this.ensureSidebarOpenForMobile();
  }

  /**
   * Ensures the sidebar is open on mobile devices.
   */
  private ensureSidebarOpenForMobile(): void {
    if (typeof window === 'undefined') return;
    if (window.innerWidth <= 1024 && this.isCollapsed) {
      this.isCollapsed = false;
      this.collapsedChange.emit(this.isCollapsed);
    }
  }

  /**
   * Cleans up all subscriptions on component destruction.
   */
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

  /**
   * Subscribes to real-time channel updates and starts unread message listening.
   */
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

  /**
   * Subscribes to real-time user updates and starts unread DM listening.
   */
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

  /**
   * Subscribes to all channel messages for search functionality.
   */
  private subscribeToMessages(): void {
    this.messagesSubscription = this.messageService.getAllMessages()
      .subscribe(messages => {
        this.allChannelMessages = messages;
      });
  }

  /**
   * Subscribes to all direct messages for search functionality.
   */
  private subscribeToDirectMessages(): void {
    this.dmMessagesSubscription = this.directMessageService.getAllDirectMessages()
      .subscribe(messages => {
        this.allDirectMessages = messages;
      });
  }

  /**
   * Subscribes to current user profile updates.
   */
  private subscribeToCurrentUser(): void {
    // this.authService.userProfile$.subscribe(user => this.currentUser = user);
  }

  /**
   * Updates the list of channels where the current user is a member.
   */
  private updateMemberChannels(): void {
    const currentUid = this.currentUserId || this.authService.getCurrentUser()?.uid;
    if (!currentUid) {
      this.memberChannels = [];
      return;
    }
    this.memberChannels = this.allChannels.filter(c => Array.isArray(c.members) && c.members.includes(currentUid));
  }

  /**
   * Subscribes to unread message notifications for channels and DMs.
   */
  private subscribeToUnread(): void {
    this.unreadService.unreadChannels$.subscribe(set => {
      this.unreadChannels = set;
    });
    this.unreadService.unreadDMs$.subscribe(set => {
      this.unreadDMs = set;
    });
  }

  /**
   * Toggles the sidebar collapsed state.
   */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  /**
   * Toggles the channels section expanded state.
   */
  toggleChannels(): void { this.channelsExpanded = !this.channelsExpanded; }

  /**
   * Toggles the direct messages section expanded state.
   */
  toggleDirectMessages(): void { this.directMessagesExpanded = !this.directMessagesExpanded; }

  /**
   * Selects a channel and navigates to its chat view.
   * @param channel - The channel to select.
   */
  selectChannel(channel: any): void {
    this.newMessageStateService.closeNewMessage();
    this.selectedChannelId = channel.id;
    this.selectedUserId = null;
    // Markiere Channel als gelesen
    this.unreadService.markChannelAsRead(channel.id);
    // this.chatService.selectChannel(channel.id);
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  /**
   * Starts a direct message conversation with a user.
   * @param user - The user to message.
   */
  startDirectMessage(user: any): void {
    this.newMessageStateService.closeNewMessage();
    this.selectedUserId = user.uid;
    this.selectedChannelId = null;
    // Markiere DM als gelesen
    this.unreadService.markDMAsRead(user.uid);
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  /**
   * Opens the new message composition view.
   */
  openNewMessage(): void {
    this.newMessageStateService.openNewMessage();
    this.router.navigate(['/dashboard']);
  }

  /**
   * Opens the modal for creating a new channel.
   */
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

  /**
   * Closes the new channel modal.
   */
  closeNewChannelModal(): void { this.showNewChannelModal = false; }

  /**
   * Opens the modal for adding people to the new channel.
   */
  openAddPeopleModal(): void {
    if (!this.newChannelName.trim()) return;
    this.showNewChannelModal = false;
    this.showAddPeopleModal = true;
    this.addPeopleSelection = null;
    this.addPeopleQuery = '';
    this.selectedAddPeople = [];
    this.selectedSourceChannelId = null;
  }

  /**
   * Closes the add people modal.
   */
  closeAddPeopleModal(): void { this.showAddPeopleModal = false; }

  /**
   * Sets the member selection mode for the new channel.
   * @param value - The selection mode ('all' or 'specific').
   * @param channel - Optional source channel for copying members.
   */
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

  /**
   * Gets the filtered list of users available for adding to the channel.
   * @returns Array of users matching the search query.
   */
  get filteredAddPeople(): any[] {
    const query = this.addPeopleQuery.trim().toLowerCase();
    if (!query) return [];
    const selectedIds = new Set(this.selectedAddPeople.map(u => u.uid));
    return this.users
      .filter(u => !selectedIds.has(u.uid))
      .filter(u => (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query));
  }

  /**
   * Adds a user to the selected members list.
   * @param user - The user to add.
   */
  addPersonToSelection(user: any): void {
    if (!user || this.selectedAddPeople.find(u => u.uid === user.uid)) return;
    this.selectedAddPeople = [...this.selectedAddPeople, user];
    this.addPeopleQuery = '';
  }

  /**
   * Removes a user from the selected members list.
   * @param uid - The user ID to remove.
   */
  removeSelectedAddPerson(uid: string): void {
    this.selectedAddPeople = this.selectedAddPeople.filter(u => u.uid !== uid);
  }

  /**
   * Creates a new channel with the selected members.
   */
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

  /**
   * Validates that a user is logged in.
   * @returns True if user is logged in.
   */
  private validateUserLoggedIn(): boolean {
    // if (!this.authService.getCurrentUser()) {
    //   alert('Bitte zuerst einloggen!');
    //   return false;
    // }
    return true;
  }

  /**
   * Performs the channel creation process.
   */
  private async performChannelCreation(): Promise<void> {
    try {
      // const channelId = await this.chatService.createChannel(this.newChannelName.trim(), this.newChannelDescription.trim());
      this.closeNewChannelModal();
      // this.router.navigate(['/chat/channel', channelId]);
    } catch (error: any) {
      // alert('Fehler beim Erstellen: ' + error.message);
    }
  }

  /**
   * Gets the CSS class for a user's online status indicator.
   * @param user - The user object.
   * @returns The CSS class name.
   */
  getStatusClass(user: any): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away'; // ← Away hinzufügen!
    return 'status-offline';
  }

  /**
   * Handles search input changes and updates search state.
   * @param event - The input event.
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.updateTagState(value);
    this.updateSearchResultsVisibility();
  }

  /**
   * Gets channels matching the current search query.
   * @returns Filtered array of channels.
   */
  get filteredSearchChannels(): Channel[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    return this.getSearchableChannels()
      .filter(c => (c.name || '').toLowerCase().includes(q))
      .slice(0, this.searchResultLimit);
  }

  /**
   * Gets messages matching the current search query.
   * @returns Filtered array of search message results.
   */
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

  /**
   * Checks if there are any search results to display.
   * @returns True if any results exist.
   */
  get hasSearchResults(): boolean {
    return this.filteredSearchChannels.length > 0
      || this.filteredSearchUsers.length > 0
      || this.filteredSearchMessages.length > 0;
  }

  /**
   * Gets users matching the current search query.
   * @returns Filtered array of users.
   */
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

  /**
   * Gets users for the @ mention dropdown.
   * @returns Filtered array of users for mentions.
   */
  get filteredMentionUsers(): User[] {
    if (!this.showTagDropdown || this.tagListType !== 'user') return [];
    const q = this.tagQuery.trim().toLowerCase();
    if (!q) return this.allUsers;
    return this.allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    );
  }

  /**
   * Gets channels for the # mention dropdown.
   * @returns Filtered array of channels for mentions.
   */
  get filteredMentionChannels(): Channel[] {
    if (!this.showTagDropdown || this.tagListType !== 'channel') return [];
    const q = this.tagQuery.trim().toLowerCase();
    const channels = this.getSearchableChannels();
    if (!q) return channels;
    return channels.filter(c => (c.name || '').toLowerCase().includes(q));
  }

  /**
   * Selects a user from the mention dropdown and opens their profile.
   * @param user - The user to select.
   */
  selectMentionUser(user: User): void {
    if (!user?.uid) return;
    this.clearSearch();
    this.openUserProfile(user);
  }

  /**
   * Selects a channel from the mention dropdown and navigates to it.
   * @param channel - The channel to select.
   */
  selectMentionChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  /**
   * Selects a channel from search results and navigates to it.
   * @param channel - The channel to select.
   */
  selectSearchChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  /**
   * Selects a user from search results and navigates to their DM.
   * @param user - The user to select.
   */
  selectSearchUser(user: User): void {
    if (!user?.uid) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  /**
   * Selects a message from search results and navigates to its location.
   * @param result - The search message result to select.
   */
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

  /**
   * Updates the tag dropdown state based on @ or # triggers.
   * @param value - The current search input value.
   */
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

  /**
   * Updates the visibility of search results based on current state.
   */
  private updateSearchResultsVisibility(): void {
    const hasQuery = !!this.normalizedSearchQuery;
    this.showSearchResults = hasQuery && !this.showTagDropdown;
  }

  /**
   * Clears the search query and resets search state.
   */
  private clearSearch(): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
  }

  /**
   * Gets the normalized (lowercase, trimmed) search query.
   * @returns The normalized search query.
   */
  private get normalizedSearchQuery(): string {
    return this.searchQuery.trim().toLowerCase();
  }

  /**
   * Checks if a message matches the search query.
   * @param message - The message to check.
   * @param q - The search query.
   * @returns True if the message matches.
   */
  private messageMatchesQuery(message: { content: string; senderName?: string }, q: string): boolean {
    return this.searchService.messageMatchesQuery(message, q);
  }

  /**
   * Normalizes text for search comparison.
   * @param value - The text to normalize.
   * @returns The normalized text.
   */
  private normalizeText(value: string): string {
    return this.searchService.normalizeText(value);
  }

  /**
   * Checks if the current query is an email search.
   * @returns True if searching by email.
   */
  private isEmailQuery(): boolean {
    return this.searchService.isEmailQuery(this.searchQuery);
  }

  /**
   * Gets a channel name by its ID.
   * @param channelId - The channel ID.
   * @returns The channel name.
   */
  private getChannelNameById(channelId: string): string {
    return this.searchService.getChannelNameById(channelId, this.getSearchableChannels());
  }

  /**
   * Gets the source list of users for search.
   * @returns Array of users to search through.
   */
  private getSearchUsersSource(): User[] {
    return this.searchService.getSearchUsersSource(this.allUsers, this.currentUserProfile);
  }

  /**
   * Gets the list of channels available for search.
   * @returns Array of searchable channels.
   */
  private getSearchableChannels(): Channel[] {
    return this.searchService.getSearchableChannels(this.memberChannels, this.allChannels);
  }

  /**
   * Checks if the current user is part of a conversation.
   * @param conversationId - The conversation ID.
   * @returns True if user is in the conversation.
   */
  private isCurrentUserInConversation(conversationId?: string): boolean {
    return this.searchService.isCurrentUserInConversation(conversationId, this.currentUserId);
  }

  /**
   * Gets the other user's ID from a conversation.
   * @param conversationId - The conversation ID.
   * @returns The other user's ID or null.
   */
  private getOtherUserIdFromConversation(conversationId?: string): string | null {
    return this.searchService.getOtherUserIdFromConversation(conversationId, this.currentUserId);
  }

  /**
   * Gets a user's name by their ID.
   * @param uid - The user ID.
   * @returns The user's name.
   */
  private getUserNameById(uid: string): string {
    return this.searchService.getUserNameById(this.allUsers, this.currentUserProfile, uid);
  }

  /**
   * Formats a message content for preview display.
   * @param content - The message content.
   * @returns The formatted preview string.
   */
  formatMessagePreview(content: string): string {
    return this.searchService.formatMessagePreview(content);
  }

  /**
   * TrackBy function for channel lists.
   * @param index - The item index.
   * @param channel - The channel object.
   * @returns The tracking identifier.
   */
  trackByChannelId(index: number, channel: Channel): string {
    return channel.id || `${index}`;
  }

  /**
   * TrackBy function for search message results.
   * @param index - The item index.
   * @param message - The search message result.
   * @returns The tracking identifier.
   */
  trackBySearchMessage(index: number, message: SearchMessageResult): string {
    return message.messageId || `${message.type}-${message.timestamp.getTime()}-${index}`;
  }

  /**
   * Replaces the last tag trigger in the search value.
   * @param value - The current value.
   * @param trigger - The trigger character.
   * @param name - The name to insert.
   * @returns The updated value.
   */
  private replaceLastTag(value: string, trigger: '@' | '#', name: string): string {
    return this.searchService.replaceLastTag(value, trigger, name);
  }

  /**
   * Opens the user profile modal for a user.
   * @param user - The user to display.
   */
  openUserProfile(user: any): void {
    if (!user) return;
    this.setSelectedProfileUser(user);
    this.showUserProfileModal = true;
  }

  /**
   * Closes the user profile modal.
   */
  closeUserProfile(): void {
    this.showUserProfileModal = false;
    this.selectedProfileUser = null;
  }

  /**
   * Checks if the selected profile belongs to the current user.
   * @returns True if viewing own profile.
   */
  isSelectedProfileOwn(): boolean {
    const currentUid = this.authService.getCurrentUser()?.uid;
    if (!currentUid) return false;
    return this.selectedProfileUser?.uid === currentUid;
  }

  /**
   * Starts a direct message from the user profile modal.
   * @param user - The user to message.
   */
  async startDirectMessageFromProfile(user: UserProfileModalUser): Promise<void> {
    this.closeUserProfile();
    if (!user?.uid) return;
    if (user.uid === this.authService.getCurrentUser()?.uid) return;
    await this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  /**
   * Sets the selected profile user data for the modal.
   * @param user - The user data to set.
   */
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

