import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { ChatService } from '../../services/chat.service';
// import { UserService } from '../../services/user.service';
// import { AuthService } from '../../services/auth.service';
// import { Channel } from '../../models/channel.model';
// import { User } from '../../models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  // private chatService = inject(ChatService);
  // private userService = inject(UserService);
  // private authService = inject(AuthService);
  private router = inject(Router);

  channels: any[] = [];
  users: any[] = [];
  currentUser: any | null = null;

  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;

  isCollapsed = false;
  channelsExpanded = true;
  directMessagesExpanded = true;

  showNewChannelModal = false;
  newChannelName = '';
  newChannelDescription = '';

  ngOnInit(): void {
    // subscriptions disabled until services/models are available
    // this.subscribeToChannels();
    // this.subscribeToUsers();
    // this.subscribeToCurrentUser();
  }

  private subscribeToChannels(): void {
    // this.chatService.channels$.subscribe(channels => this.channels = channels);
  }

  private subscribeToUsers(): void {
    // this.userService.allUsers$.subscribe(users => {
    //   const currentUid = this.authService.getCurrentUser()?.uid;
    //   this.users = users.filter(u => u.uid !== currentUid);
    // });
  }

  private subscribeToCurrentUser(): void {
    // this.authService.userProfile$.subscribe(user => this.currentUser = user);
  }

  toggleSidebar(): void { this.isCollapsed = !this.isCollapsed; }
  toggleChannels(): void { this.channelsExpanded = !this.channelsExpanded; }
  toggleDirectMessages(): void { this.directMessagesExpanded = !this.directMessagesExpanded; }

  selectChannel(channel: any): void {
    this.selectedChannelId = channel.id;
    this.selectedUserId = null;
    // this.chatService.selectChannel(channel.id);
    this.router.navigate(['/dashboard/chat/channel', channel.id]);


  }

  async startDirectMessage(user: any): Promise<void> {
    this.selectedUserId = user.uid;
    this.selectedChannelId = null;
    // const conversationId = await this.chatService.startDirectMessage(user.uid);
    this.router.navigate(['/dashboard/chat/user', user.uid]);


  }

  openNewChannelModal(): void {
    this.showNewChannelModal = true;
    this.newChannelName = '';
    this.newChannelDescription = '';
  }

  closeNewChannelModal(): void { this.showNewChannelModal = false; }

  async createChannel(): Promise<void> {
    if (!this.newChannelName.trim()) return;
    if (!this.validateUserLoggedIn()) return;
    await this.performChannelCreation();
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
    return user?.status === 'online' ? 'status-online' : 'status-offline';
  }
}

