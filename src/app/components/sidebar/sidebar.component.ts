import { Component, EventEmitter, Output, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
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
import { SidebarSearchHelper, SearchMessageResult } from './sidebar-search.helper';
import { SidebarChannelModalHelper } from './sidebar-channel-modal.helper';
import { SidebarProfileHelper } from './sidebar-profile.helper';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule, UserProfileModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', '../../shared/styles/shared-search.css', './sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private channelService = inject(ChannelService);
  private newMessageStateService = inject(NewMessageStateService);
  private unreadService = inject(UnreadService);
  private messageService = inject(MessageService);
  private directMessageService = inject(DirectMessageService);
  private searchService = inject(SearchService);

  private usersSubscription?: Subscription;
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
  channelsExpanded = true;
  directMessagesExpanded = true;
  currentUserId = '';

  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly searchHelper = new SidebarSearchHelper();
  readonly channelModalHelper = new SidebarChannelModalHelper();
  readonly profileHelper = new SidebarProfileHelper();

  get searchQuery() { return this.searchHelper.searchQuery; }
  set searchQuery(v: string) { this.searchHelper.searchQuery = v; }
  get showSearchResults() { return this.searchHelper.showSearchResults; }
  get showTagDropdown() { return this.searchHelper.showTagDropdown; }
  get tagListType() { return this.searchHelper.tagListType; }
  get showNewChannelModal() { return this.channelModalHelper.showNewChannelModal; }
  get showAddPeopleModal() { return this.channelModalHelper.showAddPeopleModal; }
  get newChannelName() { return this.channelModalHelper.newChannelName; }
  set newChannelName(v: string) { this.channelModalHelper.newChannelName = v; }
  get newChannelDescription() { return this.channelModalHelper.newChannelDescription; }
  set newChannelDescription(v: string) { this.channelModalHelper.newChannelDescription = v; }
  get addPeopleSelection() { return this.channelModalHelper.addPeopleSelection; }
  get addPeopleQuery() { return this.channelModalHelper.addPeopleQuery; }
  set addPeopleQuery(v: string) { this.channelModalHelper.addPeopleQuery = v; }
  get selectedAddPeople() { return this.channelModalHelper.selectedAddPeople; }
  get selectedSourceChannelId() { return this.channelModalHelper.selectedSourceChannelId; }
  get showUserProfileModal() { return this.profileHelper.showUserProfileModal; }
  get selectedProfileUser() { return this.profileHelper.selectedProfileUser; }

  /** Initializes component subscriptions */
  ngOnInit(): void {
    this.ensureSidebarOpenForMobile();
    this.setupAuthSubscription();
    this.subscribeToChannels();
    this.subscribeToUsers();
    this.subscribeToUnread();
    this.subscribeToMessages();
    this.subscribeToDirectMessages();
  }

  /** Cleans up all subscriptions on component destruction */
  ngOnDestroy(): void {
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
    this.dmMessagesSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.currentUserSubscription?.unsubscribe();
  }

  /** Handles window resize events */
  @HostListener('window:resize')
  onWindowResize(): void {
    this.ensureSidebarOpenForMobile();
  }

  private ensureSidebarOpenForMobile(): void {
    if (typeof window === 'undefined') return;
    if (window.innerWidth <= 1024 && this.isCollapsed) {
      this.isCollapsed = false;
      this.collapsedChange.emit(this.isCollapsed);
    }
  }

  private setupAuthSubscription(): void {
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
  }

  private subscribeToChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels().subscribe(channels => {
      this.channels = channels;
      this.allChannels = channels;
      this.updateMemberChannels();
      const channelIds = channels.map(c => c.id).filter(id => id) as string[];
      this.unreadService.startListeningForChannelMessages(channelIds);
    });
  }

  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime().subscribe(users => {
      const currentUid = this.currentUserId || this.authService.getCurrentUser()?.uid;
      this.allUsers = users;
      this.users = users.filter(u => u.uid !== currentUid);
      const userIds = this.users.map(u => u.uid);
      this.unreadService.startListeningForDMMessages(userIds);
    });
  }

  private subscribeToMessages(): void {
    this.messagesSubscription = this.messageService.getAllMessages().subscribe(messages => {
      this.allChannelMessages = messages;
    });
  }

  private subscribeToDirectMessages(): void {
    this.dmMessagesSubscription = this.directMessageService.getAllDirectMessages().subscribe(messages => {
      this.allDirectMessages = messages;
    });
  }

  private updateMemberChannels(): void {
    const currentUid = this.currentUserId || this.authService.getCurrentUser()?.uid;
    this.memberChannels = currentUid ? this.allChannels.filter(c => Array.isArray(c.members) && c.members.includes(currentUid)) : [];
  }

  private subscribeToUnread(): void {
    this.unreadService.unreadChannels$.subscribe(set => this.unreadChannels = set);
    this.unreadService.unreadDMs$.subscribe(set => this.unreadDMs = set);
  }

  /** Toggles the sidebar collapsed state */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  /** Toggles the channels section expanded state */
  toggleChannels(): void { this.channelsExpanded = !this.channelsExpanded; }

  /** Toggles the direct messages section expanded state */
  toggleDirectMessages(): void { this.directMessagesExpanded = !this.directMessagesExpanded; }

  /** Selects a channel and navigates to its chat view */
  selectChannel(channel: any): void {
    this.newMessageStateService.closeNewMessage();
    this.selectedChannelId = channel.id;
    this.selectedUserId = null;
    this.unreadService.markChannelAsRead(channel.id);
    this.router.navigate(['/dashboard/chat/channel', channel.id]);
  }

  /** Starts a direct message conversation with a user */
  startDirectMessage(user: any): void {
    this.newMessageStateService.closeNewMessage();
    this.selectedUserId = user.uid;
    this.selectedChannelId = null;
    this.unreadService.markDMAsRead(user.uid);
    this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  /** Opens the new message composition view */
  openNewMessage(): void {
    this.newMessageStateService.openNewMessage();
    this.router.navigate(['/dashboard']);
  }

  /** Gets the CSS class for a user's online status indicator */
  getStatusClass(user: any): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  // ==================== Search Methods ====================

  /** Handles search input changes */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchHelper.onSearchInput(value);
  }

  /** Gets channels matching the current search query */
  get filteredSearchChannels(): Channel[] {
    return this.searchHelper.getFilteredSearchChannels(this.getSearchableChannels());
  }

  /** Gets messages matching the current search query */
  get filteredSearchMessages(): SearchMessageResult[] {
    return this.searchHelper.getFilteredSearchMessages(
      this.allChannelMessages, this.allDirectMessages, this.getSearchableChannels(),
      this.currentUserId, this.allUsers, this.currentUserProfile, this.searchService
    );
  }

  /** Checks if there are any search results to display */
  get hasSearchResults(): boolean {
    return this.filteredSearchChannels.length > 0 || this.filteredSearchUsers.length > 0 || this.filteredSearchMessages.length > 0;
  }

  /** Gets users matching the current search query */
  get filteredSearchUsers(): User[] {
    return this.searchHelper.getFilteredSearchUsers(this.allUsers, this.currentUserProfile, this.searchService, this.filteredSearchMessages.length > 0);
  }

  /** Gets users for the @ mention dropdown */
  get filteredMentionUsers(): User[] {
    return this.searchHelper.getFilteredMentionUsers(this.allUsers);
  }

  /** Gets channels for the # mention dropdown */
  get filteredMentionChannels(): Channel[] {
    return this.searchHelper.getFilteredMentionChannels(this.getSearchableChannels());
  }

  /** Selects a user from the mention dropdown and opens their profile */
  selectMentionUser(user: User): void {
    if (!user?.uid) return;
    this.searchHelper.clearSearch();
    this.profileHelper.openUserProfile(user);
  }

  /** Selects a channel from the mention dropdown and navigates to it */
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

  /** Selects a user from search results and navigates to their DM */
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

  /** Formats a message content for preview display */
  formatMessagePreview(content: string): string {
    return this.searchService.formatMessagePreview(content);
  }

  /** TrackBy function for channel lists */
  trackByChannelId(index: number, channel: Channel): string {
    return this.searchHelper.trackByChannelId(index, channel);
  }

  /** TrackBy function for search message results */
  trackBySearchMessage(index: number, message: SearchMessageResult): string {
    return this.searchHelper.trackBySearchMessage(index, message);
  }

  private getSearchableChannels(): Channel[] {
    return this.searchService.getSearchableChannels(this.memberChannels, this.allChannels);
  }

  // ==================== Channel Modal Methods ====================

  /** Opens the modal for creating a new channel */
  openNewChannelModal(): void {
    this.channelModalHelper.openNewChannelModal();
  }

  /** Closes the new channel modal */
  closeNewChannelModal(): void {
    this.channelModalHelper.closeNewChannelModal();
  }

  /** Opens the modal for adding people to the new channel */
  openAddPeopleModal(): void {
    this.channelModalHelper.openAddPeopleModal();
  }

  /** Closes the add people modal */
  closeAddPeopleModal(): void {
    this.channelModalHelper.closeAddPeopleModal();
  }

  /** Sets the member selection mode for the new channel */
  setAddPeopleSelection(value: 'all' | 'specific', channel?: any): void {
    this.channelModalHelper.setAddPeopleSelection(value, channel);
  }

  /** Gets the filtered list of users available for adding to the channel */
  get filteredAddPeople(): any[] {
    return this.channelModalHelper.getFilteredAddPeople(this.users);
  }

  /** Adds a user to the selected members list */
  addPersonToSelection(user: any): void {
    this.channelModalHelper.addPersonToSelection(user);
  }

  /** Removes a user from the selected members list */
  removeSelectedAddPerson(uid: string): void {
    this.channelModalHelper.removeSelectedAddPerson(uid);
  }

  /** Creates a new channel with the selected members */
  async createChannel(): Promise<void> {
    await this.channelModalHelper.createChannel(this.channels, this.authService, this.channelService);
  }

  // ==================== Profile Modal Methods ====================

  /** Opens the user profile modal for a user */
  openUserProfile(user: any): void {
    this.profileHelper.openUserProfile(user);
  }

  /** Closes the user profile modal */
  closeUserProfile(): void {
    this.profileHelper.closeUserProfile();
  }

  /** Checks if the selected profile belongs to the current user */
  isSelectedProfileOwn(): boolean {
    return this.profileHelper.isSelectedProfileOwn(this.authService);
  }

  /** Starts a direct message from the user profile modal */
  async startDirectMessageFromProfile(user: UserProfileModalUser): Promise<void> {
    await this.profileHelper.startDirectMessageFromProfile(user, this.authService, this.router);
  }
}
