import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ThreadComponent } from '../thread/thread.component';
import { ThreadStateService } from '../../services/thread-state.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Message } from '../../services/message.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent, RouterModule, ThreadComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private threadStateService = inject(ThreadStateService);
  authService = inject(AuthService);
  private userService = inject(UserService);

  selectedMessageId: string = '';
  selectedChannelId: string = '';
  currentUserName: string = '';
  selectedMessage: Message | null = null;

  constructor() {
    this.loadCurrentUserName();
  }

  async ngOnInit(): Promise<void> {
    this.threadStateService.messageId$.subscribe(messageId => {
      this.selectedMessageId = messageId;
    });

    this.threadStateService.channelId$.subscribe(channelId => {
      this.selectedChannelId = channelId;
    });

    this.threadStateService.selectedMessage$.subscribe(message => {
      this.selectedMessage = message;
    });
  }

  private async loadCurrentUserName(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const userData = await this.userService.getUserById(currentUser.uid);
      this.currentUserName = userData?.name || 'Unbekannt';
      }
  }

  closeThread(): void {
    this.threadStateService.closeThread();
  }
}