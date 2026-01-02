import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, UrlSegment } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ChannelMembersListComponent } from '../channel-members-list/channel-members-list.component';
import { ChannelService } from '../../services/channel.service';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
// import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
// import { Channel } from '../../models/channel.model';
// import { Message } from '../../models/message.model';
// import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, InputFieldComponent, ChannelMembersListComponent],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewChecked {
  // private chatService = inject(ChatService);
  // private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private channelService = inject(ChannelService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  currentChannel: any | null = null;
  currentDMUser: any | null = null;
  messages: any[] = [];
  showMembersList = false;
  private shouldScrollToBottom = false;
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // service-based subscriptions are disabled while stubs/models are missing
    // this.subscribeToRoute();
    // this.subscribeToChannel();
    // this.subscribeToDMUser();
    // this.subscribeToMessages();
    this.loadChannel();
  }

  private subscribeToRoute(): void {
    this.subscriptions.push(
      combineLatest([this.route.url, this.route.params]).subscribe(([segments, params]) => {
        this.handleRouteChange(segments, params['id']);
      })
    );
  }

  private handleRouteChange(segments: UrlSegment[], id: string): void {
    const path = segments.map(s => s.path).join('/');
    if (path.includes('channel') && id) {
      this.currentDMUser = null;
      // this.chatService.selectChannel(id);
    } else if (path.includes('user') && id) {
      this.currentChannel = null;
      // this.chatService.selectDirectMessage(id);
      // this.loadDMUser(id);
    }
  }

  private subscribeToChannel(): void {
    // disabled until ChatService is available
    // this.subscriptions.push(
    //   this.chatService.currentChannel$.subscribe(channel => {
    //     this.currentChannel = channel;
    //     if (channel) this.currentDMUser = null;
    //     this.shouldScrollToBottom = true;
    //   })
    // );
  }

  private subscribeToDMUser(): void {
    // disabled until ChatService is available
    // this.subscriptions.push(
    //   this.chatService.currentDMUserId$.subscribe(userId => {
    //     if (userId) this.loadDMUser(userId);
    //   })
    // );
  }

  private subscribeToMessages(): void {
    // disabled until ChatService is available
    // this.subscriptions.push(
    //   this.chatService.messages$.subscribe(messages => {
    //     if (messages.length > this.messages.length) this.shouldScrollToBottom = true;
    //     this.messages = messages;
    //   })
    // );
  }

  private loadDMUser(userId: string): void {
    // disabled until UserService is available
    // this.userService.getUser(userId).then(user => this.currentDMUser = user);
  }

   private loadChannel(): void {
    this.route.params.subscribe(async params => {
      const channelId = params['id'];
      if (channelId) {
        this.currentChannel = await this.channelService.getChannelById(channelId);
        console.log('Channel geladen:', this.currentChannel);

        this.messageService.getMessagesByChannelId(channelId).subscribe(messages => {
          this.messages = messages;
          console.log('Messages geladen:', messages);
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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

async onMessageSent(text: string): Promise<void> {
  if (!text.trim() || !this.currentChannel) return;
  const currentUser = this.authService.getCurrentUser();
  if (!currentUser) return;
  const userData = await this.userService.getUserById(currentUser.uid);
  const senderName = userData?.name || currentUser.displayName || 'Unbekannt';

  await this.messageService.createMessage(
    this.currentChannel.id!,
    currentUser.uid,
    text.trim(),
    senderName
  );
}
    


  getMessageDate(message: any): string { // Message type not available yet
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

}

