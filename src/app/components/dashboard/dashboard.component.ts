import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ThreadComponent } from '../thread/thread.component';
import { ThreadStateService } from '../../services/thread-state.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Message } from '../../services/message.service';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent, RouterModule, ThreadComponent, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private threadStateService = inject(ThreadStateService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  selectedMessageId: string = '';
  selectedChannelId: string = '';
  currentUserName: string = '';
  selectedMessage: Message | null = null;

  isSidebarCollapsed = false;
  isChatActive = false;

  private routerSub?: Subscription;

  constructor() {
    this.loadCurrentUserName();
    this.checkIfChatActive(this.router.url);
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

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(ev => this.checkIfChatActive(ev.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private checkIfChatActive(url: string): void {
    // Chat ist aktiv wenn URL /channel/ oder /user/ enthält
    this.isChatActive = url.includes('/channel/') || url.includes('/user/');
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

  onSidebarCollapsedChange(isCollapsed: boolean): void {
    this.isSidebarCollapsed = isCollapsed;
  }
}