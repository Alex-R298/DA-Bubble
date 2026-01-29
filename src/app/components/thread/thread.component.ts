import { Component, OnInit, OnDestroy, inject, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { InputFieldComponent } from '../input-field/input-field.component';
import { Message } from '../../models/message.model';
import { ThreadService } from '../../services/thread.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { MessageService } from '../../services/message.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { Subscription } from 'rxjs';
import { ChannelService, Channel } from '../../services/channel.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, InputFieldComponent, MessageItemComponent, SvgImagesComponent],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.css']
})
export class ThreadComponent implements OnInit, OnDestroy, OnChanges {
  @Input() parentMessageId: string = '';
  @Input() channelId: string = '';
  @Input() parentMessage: Message | null = null;
  @Output() threadClosed = new EventEmitter<void>();

  threadMessages: Message[] = [];

  private threadService = inject(ThreadService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private channelService = inject(ChannelService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private subscription?: Subscription;
  private channelsSubscription?: Subscription;
  currentUserId: string = '';
  private currentUserName: string = '';
  private currentUserProfileImage: string = '';
  currentChannel: Channel | null = null;
  private allChannels: Channel[] = [];

  /**
   * Initializes the component by loading user data, channel info, and thread messages.
   */
  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    await this.loadChannel();
    this.loadAllChannels();
    if (this.parentMessageId) {
      this.loadThreadMessages();
    }
  }

  /**
   * Subscribes to all available channels and stores them locally.
   */
  private loadAllChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        this.allChannels = channels;
      });
  }

  /**
   * Reloads thread messages when input properties change.
   */
  ngOnChanges(): void {
    if (this.parentMessageId) {
      this.loadThreadMessages();
    }
  }

  /**
   * Cleans up all subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
  }

  /**
   * Loads the current user's data including ID, name, and profile image.
   */
  private async loadCurrentUser(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserId = currentUser.uid;
      const userData = await this.userService.getUserById(currentUser.uid);
      this.currentUserName = userData?.name || 'Unbekannt';
      this.currentUserProfileImage = userData?.profileImageUrl || '';
    }
  }

  /**
   * Loads the channel data based on the current channel ID.
   */
  private async loadChannel(): Promise<void> {
    if (this.channelId) {
      const channel = await this.channelService.getChannelById(this.channelId);
      if (channel && channel.id) {
        this.currentChannel = channel;
      }
    }
  }

  /**
   * Subscribes to and loads all messages in the current thread.
   */
  private loadThreadMessages(): void {
    this.subscription = this.threadService.getThreadMessages(this.parentMessageId)
      .subscribe(messages => {
        this.threadMessages = messages;
      });
  }

  /**
   * Handles sending a reply in the thread.
   * @param content - The message content to send.
   */
  async onReplySent(content: string): Promise<void> {
    if (!content.trim() || !this.parentMessageId) return;

    await this.threadService.addThreadReply(
      this.parentMessageId,
      this.channelId,
      this.currentUserId,
      this.currentUserName,
      content.trim(),
      this.currentUserProfileImage
    );
  }

  /**
   * Closes the thread and emits the threadClosed event.
   */
  closeThread(): void {
    this.threadClosed.emit();
  }

  /**
   * Toggles a reaction on a thread message.
   * @param event - The event containing the message ID and emoji to toggle.
   */
  async onReactionToggled(event: { messageId: string | undefined; emoji: string }): Promise<void> {
    if (!event.messageId || !this.currentUserId) return;

    try {
      const currentUser = await this.userService.getUserById(this.currentUserId);
      const userName = currentUser?.name || 'Unbekannt';

      await this.messageService.toggleReaction(
        event.messageId,
        event.emoji,
        this.currentUserId,
        userName
      );
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  }

  /**
   * Navigates to a specific channel by its name.
   * @param channelName - The name of the channel to navigate to.
   */
  async navigateToChannel(channelName: string): Promise<void> {
    if (!channelName) return;
    const channel = this.allChannels.find(c => c.name === channelName);
    if (channel?.id) {
      await this.router.navigate(['/dashboard/chat/channel', channel.id]);
    }
  }
}