import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, UrlSegment } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ChannelMembersListComponent } from '../channel-members-list/channel-members-list.component';
import { UserProfileModalComponent, UserProfileModalUser } from '../user-profile-modal/user-profile-modal.component';
import { ChannelService } from '../../services/channel.service';
import { Message, MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ThreadStateService } from '../../services/thread-state.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { DirectMessageService } from '../../services/direct-message.service';
import { NewMessageStateService } from '../../services/new-message-state.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, InputFieldComponent, ChannelMembersListComponent, UserProfileModalComponent],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private channelService = inject(ChannelService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private threadStateService = inject(ThreadStateService);
  private router = inject(Router);
  private directMessageService = inject(DirectMessageService);
  private newMessageStateService = inject(NewMessageStateService);
  private messagesSubscription?: Subscription;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  currentChannel: any | null = null;
  currentDMUser: any | null = null;
  messages: any[] = [];
  isNewMessageMode = false;
  newMessageRecipient = '';
  showMembersList = false;
  selectedMessage: Message | null = null;
  showUserProfileModal = false;
  selectedProfileUser: UserProfileModalUser | null = null;
  private shouldScrollToBottom = false;
  private subscriptions: Subscription[] = [];

  isSelectedProfileOwn(): boolean {
    const currentUid = this.authService.getCurrentUser()?.uid;
    if (!currentUid) return false;
    return this.selectedProfileUser?.uid === currentUid;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.newMessageStateService.isNewMessageActive$.subscribe(isActive => {
        this.isNewMessageMode = isActive;
        if (isActive) {
          this.showMembersList = false;
          this.newMessageRecipient = '';
          this.messages = [];
        }
      })
    );
    this.loadChannel();
  }

  openThread(message: Message): void {
    this.threadStateService.openThread(message, this.currentChannel!.id!);
  }

  private loadChannel(): void {
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }

    this.subscriptions.push(
      this.route.params.subscribe(async params => {
        const channelId = params['id'];
        const userId = params['userId'];

        if (channelId) {
          this.newMessageStateService.closeNewMessage();
          this.currentChannel = await this.channelService.getChannelById(channelId);
          this.currentDMUser = null;

          if (this.messagesSubscription) {
            this.messagesSubscription.unsubscribe();
          }

          this.messagesSubscription = this.messageService.getMessagesByChannelId(channelId)
            .subscribe(messages => {
              if (messages.length > this.messages.length) {
                this.shouldScrollToBottom = true;
              }
              this.messages = messages;
            });

        } else if (userId) {
          this.newMessageStateService.closeNewMessage();
          this.currentChannel = null;
          this.currentDMUser = await this.userService.getUserById(userId);

          const currentUserId = this.authService.getCurrentUser()?.uid;
          if (currentUserId && this.currentDMUser) {
            const conversationId = this.createConversationId(currentUserId, userId);

            if (this.messagesSubscription) {
              this.messagesSubscription.unsubscribe();
            }

            this.messagesSubscription = this.directMessageService.getMessagesByConversationId(conversationId)
              .subscribe(messages => {
                if (messages.length > this.messages.length) {
                  this.shouldScrollToBottom = true;
                }
                this.messages = messages;
              });
          }
        } else {
          // No route params selected (e.g. /dashboard)
          this.currentChannel = null;
          this.currentDMUser = null;
          this.messages = [];
          this.showMembersList = false;
        }
      })
    );
  }

  private createConversationId(userId1: string, userId2: string): string {
    const [first, second] = [userId1, userId2].sort();
    return `${first}_${second}`;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }

  toggleMembersList(): void {
    this.showMembersList = !this.showMembersList;
  }

  openUserProfile(user: any): void {
    if (!user) return;
    this.setSelectedProfileUser(user);
    this.showUserProfileModal = true;
    this.enrichOwnProfile();
  }

  private setSelectedProfileUser(user: any): void {
    this.selectedProfileUser = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      status: user.status
    };
  }

  private enrichOwnProfile(): void {
    const currentUid = this.authService.getCurrentUser()?.uid;
    if (currentUid && currentUid === this.selectedProfileUser?.uid) {
      this.userService.getUserById(currentUid).then(full => this.updateProfileWithFullData(full, currentUid));
    }
  }

  private updateProfileWithFullData(full: any, currentUid: string): void {
    if (!full || !this.selectedProfileUser) return;
    if (this.selectedProfileUser.uid !== currentUid) return;
    this.selectedProfileUser = {
      uid: full.uid,
      name: full.name,
      email: full.email,
      profileImageUrl: full.profileImageUrl,
      status: full.status
    };
  }

  closeUserProfile(): void {
    this.showUserProfileModal = false;
    this.selectedProfileUser = null;
  }

  async startDirectMessageFromProfile(user: UserProfileModalUser): Promise<void> {
    this.closeUserProfile();
    if (!user?.uid) return;
    if (user.uid === this.authService.getCurrentUser()?.uid) return;
    await this.router.navigate(['/dashboard/chat/user', user.uid]);
  }

  async onMessageSent(text: string): Promise<void> {
    if (!text.trim()) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const userData = await this.userService.getUserById(currentUser.uid);
    const senderName = userData?.name || currentUser.displayName || 'Unbekannt';

    if (this.currentChannel) {
      await this.messageService.createMessage(
        this.currentChannel.id!,
        currentUser.uid,
        text.trim(),
        senderName
      );
    } else if (this.currentDMUser) {
      const conversationId = this.createConversationId(currentUser.uid, this.currentDMUser.uid);

      await this.directMessageService.createDirectMessage(
        conversationId,
        currentUser.uid,
        text.trim(),
        senderName
      );
    }
  }

  getMessageDate(message: any): string {
    const date = new Date(message.timestamp);
    if (this.isToday(date)) return 'Heute';
    if (this.isYesterday(date)) return 'Gestern';
    return this.formatDate(date);
  }

  private isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const curr = new Date(this.messages[index].timestamp).toDateString();
    const prev = new Date(this.messages[index - 1].timestamp).toDateString();
    return curr !== prev;
  }

  getChannelCreatedHint(channel: any): string {
    const createdAt = this.toDate(channel?.createdAt);
    if (!createdAt) {
      return 'Das ist der Anfang dieses Channels.';
    }

    const todayStart = this.startOfDay(new Date());
    const createdStart = this.startOfDay(createdAt);
    const diffDays = Math.floor((todayStart.getTime() - createdStart.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Du hast diesen Channel heute erstellt.';
    if (diffDays === 1) return 'Du hast diesen Channel gestern erstellt.';
    if (diffDays < 7) return `Du hast diesen Channel vor ${diffDays} Tagen erstellt.`;

    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Du hast diesen Channel vor ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} erstellt.`;
    }

    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Du hast diesen Channel vor ${months} ${months === 1 ? 'Monat' : 'Monaten'} erstellt.`;
    }

    const years = Math.floor(diffDays / 365);
    return `Du hast diesen Channel vor ${years} ${years === 1 ? 'Jahr' : 'Jahren'} erstellt.`;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    const maybeToDate = (value as any)?.toDate;
    if (typeof maybeToDate === 'function') {
      const date = maybeToDate.call(value);
      return date instanceof Date ? date : null;
    }

    return null;
  }
}