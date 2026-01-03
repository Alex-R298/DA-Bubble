import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, UrlSegment } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ChannelMembersListComponent } from '../channel-members-list/channel-members-list.component';
// import { ChatService } from '../../services/chat.service';
// import { UserService } from '../../services/user.service';
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

  // Event handler for input-field
  onMessageSent(text: string): void {
    if (!text || !text.trim()) return;
    // ChatService not available — temporarily log message
    console.log('message sent (stub):', text.trim());
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

    // Firestore Timestamp-like: { toDate(): Date }
    const maybeToDate = (value as any)?.toDate;
    if (typeof maybeToDate === 'function') {
      const date = maybeToDate.call(value);
      return date instanceof Date ? date : null;
    }

    return null;
  }
}

