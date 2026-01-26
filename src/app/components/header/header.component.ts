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

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.newMessageSub?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
    this.dmMessagesSubscription?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportFlags();
  }

  getStatusClass(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  getStatusText(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return this.translateService.instant('STATUS.ONLINE');
    if (user?.status === 'away') return this.translateService.instant('STATUS.OFFLINE');
    return 'Offline';
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
    this.userProfileStateService.openProfile(user);
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

  private getSearchUsersSource(): User[] {
    return this.searchService.getSearchUsersSource(this.allUsers, this.currentUserProfile);
  }

  private getChannelNameById(channelId: string): string {
    return this.searchService.getChannelNameById(channelId, this.getSearchableChannels());
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

  private checkIfChatActive(url: string): void {
    this.isChatActive = url.includes('/channel/') || url.includes('/user/') || this.isNewMessageActive;
  }

  private updateViewportFlags(): void {
    this.isMobile = window.innerWidth <= 1024;
  }

  goBack(): void {
    this.newMessageStateService.closeNewMessage();
    if (this.isThreadActive) {
      this.threadStateService.closeThread();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleUserMenu(): void {
    if (this.showProfileView || this.showEditProfileView) {
      this.showProfileView = false;
      this.showEditProfileView = false;
      this.showUserMenu = true;
      return;
    }
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  closeMenus(): void {
    this.showUserMenu = false;
    this.showProfileView = false;
    this.showEditProfileView = false;
  }

  openProfile(): void {
    this.showUserMenu = false;
    this.showProfileView = true;
    this.showEditProfileView = false;
  }

  closeProfileView(): void {
    this.showProfileView = false;
    this.showEditProfileView = false;
    this.showUserMenu = true;
  }

  openEditProfile(): void {
    this.editedFullName = this.user?.name || '';
    this.editNameFocused = false;
    this.showProfileView = false;
    this.showEditProfileView = true;
    this.showUserMenu = false;
  }

  onEditNameFocus(): void {
    this.editNameFocused = true;
  }

  onEditNameBlur(): void {
    this.editNameFocused = false;
  }

  closeEditProfileView(): void {
    this.showEditProfileView = false;
    this.showProfileView = true;
  }

  cancelEditProfile(): void {
    this.closeEditProfileView();
  }

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

  openSettings(): void {
    this.closeMenus();
    this.router.navigate(['/settings']);
  }

  async onLogout(): Promise<void> {
    this.closeMenus();
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}