import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { ChannelService, Channel } from '../../services/channel.service';
import { MessageService, Message } from '../../services/message.service';
import { DirectMessageService, DirectMessage } from '../../services/direct-message.service';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, filter } from 'rxjs';
import { SearchService } from '../../services/search.service';
import { UserProfileStateService } from '../../services/user-profile-state.service';
import { NewMessageStateService } from '../../services/new-message-state.service';
import { ThreadStateService } from '../../services/thread-state.service';

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
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule],
  templateUrl: './header.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', '../../shared/styles/shared-search.css', './header.component.css', './header.menu.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);
  private channelService = inject(ChannelService);
  private messageService = inject(MessageService);
  private directMessageService = inject(DirectMessageService);
  private searchService = inject(SearchService);
  private userProfileStateService = inject(UserProfileStateService);
  private newMessageStateService = inject(NewMessageStateService);
  private threadStateService = inject(ThreadStateService);

  user: {
    name?: string;
    profileImageUrl?: string;
    email?: string;
    status?: 'online' | 'offline' | 'away'
  } | null = null;

  searchQuery = '';
  showUserMenu = false;
  showProfileView = false;
  showEditProfileView = false;
  editedFullName = '';
  editNameFocused = false;
  private userSubscription?: Subscription;
  private usersSubscription?: Subscription;
  private channelsSubscription?: Subscription;
  private routerSub?: Subscription;
  private newMessageSub?: Subscription;
  private messagesSubscription?: Subscription;
  private dmMessagesSubscription?: Subscription;
  allUsers: User[] = [];
  allChannels: Channel[] = [];
  memberChannels: Channel[] = [];
  allChannelMessages: Message[] = [];
  allDirectMessages: DirectMessage[] = [];
  currentUserProfile: User | null = null;
  showTagDropdown = false;
  tagListType: 'user' | 'channel' | null = null;
  tagQuery = '';
  isChatActive = false;
  isThreadActive = false;
  isMobile = false;
  private isNewMessageActive = false;
  showSearchResults = false;
  currentUserId = '';
  private readonly searchResultLimit = 6;


  /**
   * Initializes the component and sets up subscriptions for user, channels, messages, and routing
   */
  ngOnInit(): void {
    this.updateViewportFlags();
    this.checkIfChatActive(this.router.url);
    this.authService.authState$.subscribe(async (authUser) => {
      this.currentUserId = authUser?.uid || '';
      if (authUser) {
        this.userSubscription = this.userService.subscribeToUser(authUser.uid)
          .subscribe(userData => {
            if (userData) {
              this.user = {
                name: userData.name,
                profileImageUrl: userData.profileImageUrl,
                email: userData.email,
                status: userData.status
              };
              this.currentUserProfile = userData;
            } else {
              this.currentUserProfile = null;
            }
          });
      } else {
        this.user = null;
        this.currentUserProfile = null;
        this.userSubscription?.unsubscribe();
      }
    });

    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        this.allUsers = users.filter(u => u.uid !== currentUid);
      });

    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        this.allChannels = channels;
        const currentUid = this.authService.getCurrentUser()?.uid;
        if (!currentUid) {
          this.memberChannels = [];
          return;
        }
        this.memberChannels = channels.filter(c => Array.isArray(c.members) && c.members.includes(currentUid));
      });

    this.messagesSubscription = this.messageService.getAllMessages()
      .subscribe(messages => {
        this.allChannelMessages = messages;
      });

    this.dmMessagesSubscription = this.directMessageService.getAllDirectMessages()
      .subscribe(messages => {
        this.allDirectMessages = messages;
      });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(ev => this.checkIfChatActive(ev.urlAfterRedirects));

    this.newMessageSub = this.newMessageStateService.isNewMessageActive$
      .subscribe((isActive: boolean) => {
        this.isNewMessageActive = isActive;
        this.checkIfChatActive(this.router.url);
      });

    this.threadStateService.selectedMessage$.subscribe((message: Message | null) => {
      this.isThreadActive = !!message;
    });
  }


  /**
   * Cleans up all subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.newMessageSub?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
    this.dmMessagesSubscription?.unsubscribe();
  }


  /**
   * Handles window resize events
   */
  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportFlags();
  }


  /**
   * Gets the CSS class for user status indicator
   * @param user - The user to check status for
   * @returns CSS class name for status
   */
  getStatusClass(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }


  /**
   * Gets the translated status text for a user
   * @param user - The user to get status text for
   * @returns Translated status text
   */
  getStatusText(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return this.translateService.instant('STATUS.ONLINE');
    if (user?.status === 'away') return this.translateService.instant('STATUS.OFFLINE');
    return 'Offline';
  }


  /**
   * Handles search input changes
   * @param event - The input event
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.updateTagState(value);
    this.updateSearchResultsVisibility();
  }


  /**
   * Gets filtered channels based on search query
   * @returns Filtered array of channels
   */
  get filteredSearchChannels(): Channel[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    return this.getSearchableChannels()
      .filter(c => (c.name || '').toLowerCase().includes(q))
      .slice(0, this.searchResultLimit);
  }


  /**
   * Gets filtered users based on search query
   * @returns Filtered array of users
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
   * Gets filtered messages from channels and DMs based on search query
   * @returns Filtered array of search message results
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
   * Checks if there are any search results
   * @returns True if any search results exist
   */
  get hasSearchResults(): boolean {
    return this.filteredSearchChannels.length > 0
      || this.filteredSearchUsers.length > 0
      || this.filteredSearchMessages.length > 0;
  }


  /**
   * Gets filtered users for mention dropdown
   * @returns Filtered array of users for mentions
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
   * Gets filtered channels for mention dropdown
   * @returns Filtered array of channels for mentions
   */
  get filteredMentionChannels(): Channel[] {
    if (!this.showTagDropdown || this.tagListType !== 'channel') return [];
    const q = this.tagQuery.trim().toLowerCase();
    const channels = this.getSearchableChannels();
    if (!q) return channels;
    return channels.filter(c => (c.name || '').toLowerCase().includes(q));
  }


  /**
   * Selects a user from mention dropdown and opens their profile
   * @param user - The user to select
   */
  selectMentionUser(user: User): void {
    if (!user?.uid) return;
    this.clearSearch();
    this.userProfileStateService.openProfile(user);
  }


  /**
   * Selects a channel from mention dropdown and navigates to it
   * @param channel - The channel to select
   */
  selectMentionChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }


  /**
   * Selects a channel from search results and navigates to it
   * @param channel - The channel to select
   */
  selectSearchChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }


  /**
   * Selects a user from search results and navigates to direct message
   * @param user - The user to select
   */
  selectSearchUser(user: User): void {
    if (!user?.uid) return;
    this.clearSearch();
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }


  /**
   * Selects a message from search results and navigates to its location
   * @param result - The search message result to select
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
   * Updates tag dropdown state based on search input
   * @private
   * @param value - The search input value
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
   * Updates the visibility of search results dropdown
   * @private
   */
  private updateSearchResultsVisibility(): void {
    const hasQuery = !!this.normalizedSearchQuery;
    this.showSearchResults = hasQuery && !this.showTagDropdown;
  }


  /**
   * Clears all search-related state
   * @private
   */
  private clearSearch(): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
  }


  /**
   * Gets the normalized search query in lowercase
   * @private
   * @returns Normalized search query
   */
  private get normalizedSearchQuery(): string {
    return this.searchQuery.trim().toLowerCase();
  }


  /**
   * Checks if a message matches the search query
   * @private
   * @param message - The message to check
   * @param q - The search query
   * @returns True if message matches query
   */
  private messageMatchesQuery(message: { content: string; senderName?: string }, q: string): boolean {
    return this.searchService.messageMatchesQuery(message, q);
  }


  /**
   * Normalizes text for search comparison
   * @private
   * @param value - The text to normalize
   * @returns Normalized text
   */
  private normalizeText(value: string): string {
    return this.searchService.normalizeText(value);
  }


  /**
   * Checks if the search query is an email query
   * @private
   * @returns True if query is email format
   */
  private isEmailQuery(): boolean {
    return this.searchService.isEmailQuery(this.searchQuery);
  }


  /**
   * Gets the source of users for search
   * @private
   * @returns Array of users to search through
   */
  private getSearchUsersSource(): User[] {
    return this.searchService.getSearchUsersSource(this.allUsers, this.currentUserProfile);
  }


  /**
   * Gets channel name by its ID
   * @private
   * @param channelId - The channel ID
   * @returns Channel name or empty string
   */
  private getChannelNameById(channelId: string): string {
    return this.searchService.getChannelNameById(channelId, this.getSearchableChannels());
  }


  /**
   * Gets channels that are searchable by current user
   * @private
   * @returns Array of searchable channels
   */
  private getSearchableChannels(): Channel[] {
    return this.searchService.getSearchableChannels(this.memberChannels, this.allChannels);
  }


  /**
   * Checks if current user is part of a conversation
   * @private
   * @param conversationId - The conversation ID
   * @returns True if user is in conversation
   */
  private isCurrentUserInConversation(conversationId?: string): boolean {
    return this.searchService.isCurrentUserInConversation(conversationId, this.currentUserId);
  }


  /**
   * Gets the other user ID from a conversation
   * @private
   * @param conversationId - The conversation ID
   * @returns Other user's ID or null
   */
  private getOtherUserIdFromConversation(conversationId?: string): string | null {
    return this.searchService.getOtherUserIdFromConversation(conversationId, this.currentUserId);
  }


  /**
   * Gets user name by user ID
   * @private
   * @param uid - The user ID
   * @returns User name
   */
  private getUserNameById(uid: string): string {
    return this.searchService.getUserNameById(this.allUsers, this.currentUserProfile, uid);
  }


  /**
   * Formats message content for preview display
   * @param content - The message content
   * @returns Formatted preview text
   */
  formatMessagePreview(content: string): string {
    return this.searchService.formatMessagePreview(content);
  }


  /**
   * Tracking function for channel list in ngFor
   * @param index - The index of the item
   * @param channel - The channel object
   * @returns Unique identifier for tracking
   */
  trackByChannelId(index: number, channel: Channel): string {
    return channel.id || `${index}`;
  }


  /**
   * Tracking function for search message list in ngFor
   * @param index - The index of the item
   * @param message - The message result object
   * @returns Unique identifier for tracking
   */
  trackBySearchMessage(index: number, message: SearchMessageResult): string {
    return message.messageId || `${message.type}-${message.timestamp.getTime()}-${index}`;
  }


  /**
   * Replaces the last tag in search input with selected item
   * @private
   * @param value - The current search value
   * @param trigger - The tag trigger character
   * @param name - The name to insert
   * @returns Updated search value
   */
  private replaceLastTag(value: string, trigger: '@' | '#', name: string): string {
    return this.searchService.replaceLastTag(value, trigger, name);
  }


  /**
   * Checks if a chat view is currently active based on URL
   * @private
   * @param url - The current URL
   */
  private checkIfChatActive(url: string): void {
    this.isChatActive = url.includes('/channel/') || url.includes('/user/') || this.isNewMessageActive;
  }


  /**
   * Updates viewport-related flags based on window size
   * @private
   */
  private updateViewportFlags(): void {
    this.isMobile = window.innerWidth <= 1024;
  }


  /**
   * Navigates back from current view
   */
  goBack(): void {
    this.newMessageStateService.closeNewMessage();
    if (this.isThreadActive) {
      this.threadStateService.closeThread();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }


  /**
   * Toggles the user menu visibility
   */
  toggleUserMenu(): void {
    if (this.showProfileView || this.showEditProfileView) {
      this.showProfileView = false;
      this.showEditProfileView = false;
      this.showUserMenu = true;
      return;
    }
    this.showUserMenu = !this.showUserMenu;
  }


  /**
   * Closes the user menu
   */
  closeUserMenu(): void {
    this.showUserMenu = false;
  }


  /**
   * Closes all menus and views
   */
  closeMenus(): void {
    this.showUserMenu = false;
    this.showProfileView = false;
    this.showEditProfileView = false;
  }


  /**
   * Opens the profile view
   */
  openProfile(): void {
    this.showUserMenu = false;
    this.showProfileView = true;
    this.showEditProfileView = false;
  }


  /**
   * Closes the profile view and returns to menu
   */
  closeProfileView(): void {
    this.showProfileView = false;
    this.showEditProfileView = false;
    this.showUserMenu = true;
  }


  /**
   * Opens the edit profile view
   */
  openEditProfile(): void {
    this.editedFullName = this.user?.name || '';
    this.editNameFocused = false;
    this.showProfileView = false;
    this.showEditProfileView = true;
    this.showUserMenu = false;
  }


  /**
   * Handles focus event on edit name input
   */
  onEditNameFocus(): void {
    this.editNameFocused = true;
  }


  /**
   * Handles blur event on edit name input
   */
  onEditNameBlur(): void {
    this.editNameFocused = false;
  }


  /**
   * Closes edit profile view and returns to profile view
   */
  closeEditProfileView(): void {
    this.showEditProfileView = false;
    this.showProfileView = true;
  }


  /**
   * Cancels profile editing
   */
  cancelEditProfile(): void {
    this.closeEditProfileView();
  }


  /**
   * Saves the edited profile information
   */
  async saveEditProfile(): Promise<void> {
    const nextName = this.editedFullName.trim();
    if (!nextName) return;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      await this.userService.updateUserProfile(currentUser.uid, nextName);
      this.user = { ...this.user, name: nextName };
    }

    this.closeEditProfileView();
  }


  /**
   * Opens the settings page
   */
  openSettings(): void {
    this.closeMenus();
    this.router.navigate(['/settings']);
  }


  /**
   * Logs out the current user and navigates to login
   */
  async onLogout(): Promise<void> {
    this.closeMenus();
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}