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
import { HeaderSearchHelper, SearchMessageResult } from './header-search.helper';
import { HeaderMenuHelper } from './header-menu.helper';
import { AvatarModalComponent } from '../avatar-modal/avatar-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule, AvatarModalComponent],
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

  user: { name?: string; profileImageUrl?: string; email?: string; status?: 'online' | 'offline' | 'away' } | null = null;
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
  isChatActive = false;
  isThreadActive = false;
  isMobile = false;
  private isNewMessageActive = false;
  currentUserId = '';

  maxSearchWidth: string = '50vw';
  isThreadOpen = false;

  readonly searchHelper = new HeaderSearchHelper();
  readonly menuHelper = new HeaderMenuHelper();

  get searchQuery() { return this.searchHelper.searchQuery; }
  set searchQuery(v: string) { this.searchHelper.searchQuery = v; }
  get showSearchResults() { return this.searchHelper.showSearchResults; }
  get showTagDropdown() { return this.searchHelper.showTagDropdown; }
  get tagListType() { return this.searchHelper.tagListType; }
  get showUserMenu() { return this.menuHelper.showUserMenu; }
  get showProfileView() { return this.menuHelper.showProfileView; }
  get showEditProfileView() { return this.menuHelper.showEditProfileView; }
  get showAvatarModal() { return this.menuHelper.showAvatarModal; }
  get editedFullName() { return this.menuHelper.editedFullName; }
  set editedFullName(v: string) { this.menuHelper.editedFullName = v; }
  get editNameFocused() { return this.menuHelper.editNameFocused; }

  /** Initializes the component and sets up subscriptions */
  ngOnInit(): void {
    this.updateViewportFlags();
    this.checkIfChatActive(this.router.url);
    this.setupAuthSubscription();
    this.setupDataSubscriptions();
    this.setupRouterSubscription();
    this.setupThreadSubscription();
  }

  /** Cleans up all subscriptions when component is destroyed */
  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.newMessageSub?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
    this.dmMessagesSubscription?.unsubscribe();
  }

  /** Handles window resize events */
  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportFlags();
    this.updateSearchWidth();
  }

  private updateSearchWidth(): void {
    if (this.isThreadOpen) {
      if (window.innerWidth <= 1440) {
        // Thread überlagert: ursprüngliche Breite des Chat-Windows (ohne Thread)
        this.maxSearchWidth = 'calc(100vw - (var(--layout-padding) * 2) - var(--sidebar-width) - var(--layout-gap))';
      } else {
        // Thread offen, aber nicht überlagert: Breite des Chat-Windows mit Thread daneben
        this.maxSearchWidth = 'calc(100vw - (var(--layout-padding) * 2) - var(--sidebar-width) - var(--layout-gap) - var(--thread-width) - var(--layout-gap))';
      }
    } else {
      // Normal: bis zur User-Area
      this.maxSearchWidth = 'calc(100% - var(--header-user-area-min) - var(--header-gap, 1rem))';
    }
  }

  private setupAuthSubscription(): void {
    this.authService.authState$.subscribe(async (authUser) => {
      this.currentUserId = authUser?.uid || '';
      if (authUser) {
        this.userSubscription = this.userService.subscribeToUser(authUser.uid).subscribe(userData => {
          if (userData) {
            this.user = { name: userData.name, profileImageUrl: userData.profileImageUrl, email: userData.email, status: userData.status };
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
  }

  private setupDataSubscriptions(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime().subscribe(users => {
      const currentUid = this.authService.getCurrentUser()?.uid;
      this.allUsers = users.filter(u => u.uid !== currentUid);
    });

    this.channelsSubscription = this.channelService.getAllChannels().subscribe(channels => {
      this.allChannels = channels;
      const currentUid = this.authService.getCurrentUser()?.uid;
      this.memberChannels = currentUid ? channels.filter(c => Array.isArray(c.members) && c.members.includes(currentUid)) : [];
    });

    this.messagesSubscription = this.messageService.getAllMessages().subscribe(messages => {
      this.allChannelMessages = messages;
    });

    this.dmMessagesSubscription = this.directMessageService.getAllDirectMessages().subscribe(messages => {
      this.allDirectMessages = messages;
    });
  }

  private setupRouterSubscription(): void {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(ev => this.checkIfChatActive(ev.urlAfterRedirects));

    this.newMessageSub = this.newMessageStateService.isNewMessageActive$.subscribe((isActive: boolean) => {
      this.isNewMessageActive = isActive;
      this.checkIfChatActive(this.router.url);
    });
  }

  private setupThreadSubscription(): void {
    this.threadStateService.selectedMessage$.subscribe((message: Message | null) => {
      this.isThreadActive = !!message;
      this.isThreadOpen = !!message;
      this.updateSearchWidth();
    });
  }

  /** Gets the CSS class for user status indicator */
  getStatusClass(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  /** Gets the translated status text for a user */
  getStatusText(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return this.translateService.instant('STATUS.ONLINE');
    if (user?.status === 'away') return this.translateService.instant('STATUS.OFFLINE');
    return 'Offline';
  }

  /** Handles search input changes */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchHelper.onSearchInput(value);
  }

  /** Gets filtered channels based on search query */
  get filteredSearchChannels(): Channel[] {
    return this.searchHelper.getFilteredSearchChannels(this.getSearchableChannels());
  }

  /** Gets filtered users based on search query */
  get filteredSearchUsers(): User[] {
    return this.searchHelper.getFilteredSearchUsers(this.allUsers, this.currentUserProfile, this.searchService, this.filteredSearchMessages.length > 0);
  }

  /** Gets filtered messages from channels and DMs based on search query */
  get filteredSearchMessages(): SearchMessageResult[] {
    return this.searchHelper.getFilteredSearchMessages(
      this.allChannelMessages, this.allDirectMessages, this.getSearchableChannels(),
      this.currentUserId, this.allUsers, this.currentUserProfile, this.searchService
    );
  }

  /** Checks if there are any search results */
  get hasSearchResults(): boolean {
    return this.filteredSearchChannels.length > 0 || this.filteredSearchUsers.length > 0 || this.filteredSearchMessages.length > 0;
  }

  /** Gets filtered users for mention dropdown */
  get filteredMentionUsers(): User[] {
    return this.searchHelper.getFilteredMentionUsers(this.allUsers);
  }

  /** Gets filtered channels for mention dropdown */
  get filteredMentionChannels(): Channel[] {
    return this.searchHelper.getFilteredMentionChannels(this.getSearchableChannels());
  }

  /** Selects a user from mention dropdown and opens their profile */
  selectMentionUser(user: User): void {
    if (!user?.uid) return;
    this.searchHelper.clearSearch();
    this.userProfileStateService.openProfile(user);
  }

  /** Selects a channel from mention dropdown and navigates to it */
  selectMentionChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.searchHelper.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  /** Selects a channel from search results and navigates to it */
  selectSearchChannel(channel: Channel): void {
    if (!channel?.id) return;
    this.searchHelper.clearSearch();
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  /** Selects a user from search results and navigates to direct message */
  selectSearchUser(user: User): void {
    if (!user?.uid) return;
    this.searchHelper.clearSearch();
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  /** Selects a message from search results and navigates to its location */
  selectSearchMessage(result: SearchMessageResult): void {
    if (result.type === 'channel' && result.channelId) {
      this.searchHelper.clearSearch();
      this.router.navigate(['/dashboard/chat/channel', result.channelId]);
      return;
    }
    if (result.type === 'dm' && result.otherUserId) {
      this.searchHelper.clearSearch();
      this.router.navigate(['/dashboard/chat/user', result.otherUserId]);
    }
  }

  /** Formats message content for preview display */
  formatMessagePreview(content: string): string {
    return this.searchService.formatMessagePreview(content);
  }

  /** Tracking function for channel list in ngFor */
  trackByChannelId(index: number, channel: Channel): string {
    return channel.id || `${index}`;
  }

  /** Tracking function for search message list in ngFor */
  trackBySearchMessage(index: number, message: SearchMessageResult): string {
    return message.messageId || `${message.type}-${message.timestamp?.getTime()}-${index}`;
  }

  private getSearchableChannels(): Channel[] {
    return this.searchService.getSearchableChannels(this.memberChannels, this.allChannels);
  }

  private checkIfChatActive(url: string): void {
    this.isChatActive = url.includes('/channel/') || url.includes('/user/') || this.isNewMessageActive;
  }

  private updateViewportFlags(): void {
    this.isMobile = window.innerWidth <= 1024;
  }

  /** Navigates back from current view */
  goBack(): void {
    this.newMessageStateService.closeNewMessage();
    if (this.isThreadActive) {
      this.threadStateService.closeThread();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  /** Toggles the user menu visibility */
  toggleUserMenu(): void {
    this.menuHelper.toggleUserMenu();
  }

  /** Closes the user menu */
  closeUserMenu(): void {
    this.menuHelper.closeUserMenu();
  }

  /** Closes all menus and views */
  closeMenus(): void {
    this.menuHelper.closeMenus();
  }

  /** Opens the profile view */
  openProfile(): void {
    this.menuHelper.openProfile();
  }

  /** Closes the profile view and returns to menu */
  closeProfileView(): void {
    this.menuHelper.closeProfileView();
  }

  /** Opens the edit profile view */
  openEditProfile(): void {
    this.menuHelper.openEditProfile(this.user?.name || '');
  }

  /** Handles focus event on edit name input */
  onEditNameFocus(): void {
    this.menuHelper.onEditNameFocus();
  }

  /** Handles blur event on edit name input */
  onEditNameBlur(): void {
    this.menuHelper.onEditNameBlur();
  }

  /** Closes edit profile view and returns to profile view */
  closeEditProfileView(): void {
    this.menuHelper.closeEditProfileView();
  }

  /** Cancels profile editing */
  cancelEditProfile(): void {
    this.menuHelper.cancelEditProfile();
  }

  /** Saves the edited profile information */
  async saveEditProfile(): Promise<void> {
    await this.menuHelper.saveEditProfile(this.authService, this.userService, (name, avatar) => {
      this.user = { ...this.user, name };
      if (avatar) this.user = { ...this.user, profileImageUrl: avatar };
    });
  }

  /** Opens the settings page */
  openSettings(): void {
    this.menuHelper.openSettings(this.router);
  }

  /** Logs out the current user and navigates to login */
  async onLogout(): Promise<void> {
    await this.menuHelper.onLogout(this.authService, this.router);
  }

  /** Opens the avatar modal */
  openAvatarModal(): void {
    this.menuHelper.openAvatarModal();
  }

  /** Closes the avatar modal */
  closeAvatarModal(): void {
    this.menuHelper.closeAvatarModal();
  }
}
