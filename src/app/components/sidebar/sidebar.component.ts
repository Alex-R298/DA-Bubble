import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
// import { Channel } from '../../models/channel.model';
// import { User } from '../../models/user.model';
import { ChannelService } from '../../services/channel.service';
import { Subscription } from 'rxjs';
import { NewMessageStateService } from '../../services/new-message-state.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';
import { UnreadService } from '../../services/unread.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', './sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  // private chatService = inject(ChatService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private channelService = inject(ChannelService);
  private newMessageStateService = inject(NewMessageStateService);
  private unreadService = inject(UnreadService);
  private usersSubscription?: Subscription; // ← NEU
  private channelsSubscription?: Subscription;

  channels: any[] = [];
  users: any[] = [];
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

  ngOnInit(): void {
    // subscriptions disabled until services/models are available
    this.subscribeToChannels();
    this.subscribeToUsers();
    this.subscribeToCurrentUser();
    this.subscribeToUnread();
  }

  ngOnDestroy(): void {
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
    if (this.channelsSubscription) {
      this.channelsSubscription.unsubscribe();
    }
  }

  private subscribeToChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        this.channels = channels;
        // Starte Listening für unread Nachrichten
        const channelIds = channels.map(c => c.id).filter(id => id) as string[];
        this.unreadService.startListeningForChannelMessages(channelIds);
      });
  }

  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        this.users = users.filter(u => u.uid !== currentUid);
        // Starte Listening für unread DMs
        const userIds = this.users.map(u => u.uid);
        this.unreadService.startListeningForDMMessages(userIds);
      });
  }

  private subscribeToCurrentUser(): void {
    // this.authService.userProfile$.subscribe(user => this.currentUser = user);
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
}

