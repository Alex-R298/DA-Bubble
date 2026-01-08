import { Component, OnInit, OnDestroy, inject, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InputFieldComponent } from '../input-field/input-field.component';
import { Message } from '../../models/message.model';
import { ThreadService } from '../../services/thread.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { Subscription } from 'rxjs';
import { ChannelService, Channel } from '../../services/channel.service';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, InputFieldComponent , MessageItemComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.css'
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
  private subscription?: Subscription;
  currentUserId: string = '';
  private currentUserName: string = '';
  private currentUserProfileImage: string = '';
  currentChannel: Channel | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    await this.loadChannel();
    if (this.parentMessageId) {
      this.loadThreadMessages();
    }
  }

  ngOnChanges(): void {
    if (this.parentMessageId) {
      this.loadThreadMessages();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async loadCurrentUser(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserId = currentUser.uid;
      const userData = await this.userService.getUserById(currentUser.uid);
      this.currentUserName = userData?.name || 'Unbekannt';
      this.currentUserProfileImage = userData?.profileImageUrl || '';
    }
  }

  private async loadChannel(): Promise<void> {
    if (this.channelId) {
      const channel = await this.channelService.getChannelById(this.channelId);
      if (channel && channel.id) {
        this.currentChannel = channel;
      }
    }
  }

  private loadThreadMessages(): void {
    this.subscription = this.threadService.getThreadMessages(this.parentMessageId)
      .subscribe(messages => {
        this.threadMessages = messages;
      });
  }

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

  closeThread(): void {
    this.threadClosed.emit();
  }
}