import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ThreadComponent } from '../thread/thread.component';
import { ThreadStateService } from '../../services/thread-state.service';
import { NewMessageStateService } from '../../services/new-message-state.service';
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
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private threadStateService = inject(ThreadStateService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private newMessageStateService = inject(NewMessageStateService);

  selectedMessageId: string = '';
  selectedChannelId: string = '';
  currentUserName: string = '';
  selectedMessage: Message | null = null;

  isSidebarCollapsed = false;
  isChatActive = false;
  private isNewMessageActive = false;
  isThreadActive = false;

  private routerSub?: Subscription;

  /**
   * Initializes the component and loads current user name
   */
  constructor() {
    this.loadCurrentUserName();
    this.checkIfChatActive(this.router.url);
  }

  /**
   * Sets up subscriptions for thread state, message state, and router events
   */
  async ngOnInit(): Promise<void> {
    this.threadStateService.messageId$.subscribe((messageId) => {
      this.selectedMessageId = messageId;
    });

    this.threadStateService.channelId$.subscribe((channelId) => {
      this.selectedChannelId = channelId;
    });

    this.threadStateService.selectedMessage$.subscribe((message) => {
      this.selectedMessage = message;
      this.isThreadActive = !!message;
    });

    this.newMessageStateService.isNewMessageActive$.subscribe((isActive) => {
      this.isNewMessageActive = isActive;
      this.checkIfChatActive(this.router.url);
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((ev) => this.checkIfChatActive(ev.urlAfterRedirects));
  }

  /**
   * Cleans up subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  /**
   * Checks if a chat view is currently active based on the URL
   * @private
   * @param url - The current URL to check
   */
  private checkIfChatActive(url: string): void {
    this.isChatActive =
      url.includes('/channel/') ||
      url.includes('/user/') ||
      this.isNewMessageActive;
  }

  /**
   * Loads the current user's name from the user service
   * @private
   */
  private async loadCurrentUserName(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const userData = await this.userService.getUserById(currentUser.uid);
      this.currentUserName = userData?.name || 'Unbekannt';
    }
  }

  /**
   * Closes the thread panel and resets thread state
   */
  closeThread(): void {
    this.threadStateService.closeThread();
    this.isThreadActive = false;
  }

  /**
   * Handles sidebar collapse state changes
   * @param isCollapsed - Whether the sidebar is collapsed
   */
  onSidebarCollapsedChange(isCollapsed: boolean): void {
    this.isSidebarCollapsed = isCollapsed;
  }
}
