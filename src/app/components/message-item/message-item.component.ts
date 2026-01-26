import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, ElementRef, AfterViewChecked, ViewChild, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { HoverReactionBarComponent } from '../hover-reaction-bar/hover-reaction-bar.component';
import { UserTagDropdownComponent, TagUser } from '../user-tag-dropdown/user-tag-dropdown.component';
import { MessageService } from '../../services/message.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ChannelService, Channel } from '../../services/channel.service';
import { ContentFormatterService } from '../../services/content-formatter.service';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule, SvgImagesComponent, FormsModule, HoverReactionBarComponent, UserTagDropdownComponent],
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.css']
})
export class MessageItemComponent implements AfterViewChecked, OnInit, OnDestroy, OnChanges {
  @Input() message: any;

  /** Optional: provide the current user id so we can compute own-message styling and reacted-state */
  @Input() currentUserId: string = '';

  /** Optional override if you already know it's the user's own message */
  @Input() isOwnMessageOverride: boolean | null = null;

  /** Controls whether to show reaction buttons (default: true) */
  @Input() showReactions: boolean = true;

  /** Controls whether to show thread reply button (default: false) */
  @Input() showThreadButton: boolean = false;

  /** If true, clicking the sender name emits the sender's uid */
  @Input() senderClickable: boolean = false;

  /** Emits when a reaction should be toggled (wire to your service later) */
  @Output() reactionToggled = new EventEmitter<{ messageId: string | undefined; emoji: string }>();

  /** Emits when thread button is clicked */
  @Output() threadClicked = new EventEmitter<void>();

  /** Emits when sender name is clicked (sender uid) */
  @Output() senderClicked = new EventEmitter<string>();

  /** Emits when a @mention is clicked (user uid) */
  @Output() mentionClicked = new EventEmitter<string>();

  /** Emits when a #channel is clicked (channel name) */
  @Output() channelClicked = new EventEmitter<string>();

  @ViewChild('editTextarea') editTextarea!: ElementRef<HTMLDivElement>;

  showEditMessage: boolean = false;
  showEditMessageInput: boolean = false;
  editedContent: string = '';
  private mentionListenersAdded = false;

  /** Controls whether all reactions are shown or limited */
  reactionsExpanded: boolean = false;

  /** Cached formatted content to prevent flickering */
  private cachedFormattedContent: SafeHtml | null = null;
  private lastContentHash: string = '';

  /** Cached reactions to prevent flickering */
  private cachedReactions: { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] = [];
  private lastReactionsHash: string = '';

  private messageService = inject(MessageService);
  private elementRef = inject(ElementRef);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private contentFormatter = inject(ContentFormatterService);

  // Tag-Dropdown für Edit-Modus
  showTagList: boolean = false;
  tagListType: 'user' | 'channel' | null = null;
  users: any[] = [];
  channels: Channel[] = [];
  private usersSubscription?: Subscription;
  private channelsSubscription?: Subscription;
  private channelService = inject(ChannelService);

  ngOnInit(): void {
    this.subscribeToUsers();
    this.subscribeToChannels();
    this.updateFormattedContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.updateFormattedContent();
      this.updateCachedReactions();
    }
  }

  private updateFormattedContent(): void {
    const content = this.getContent();
    if (content !== this.lastContentHash) {
      this.lastContentHash = content;
      this.cachedFormattedContent = this.contentFormatter.formatContent(content);
    }
  }

  private updateCachedReactions(): void {
    const reactionsHash = JSON.stringify(this.message?.reactions || {});
    if (reactionsHash !== this.lastReactionsHash) {
      this.lastReactionsHash = reactionsHash;
      this.cachedReactions = this.computeReactionsWithUsers();
    }
  }

  ngOnDestroy(): void {
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    this.attachMentionClickListeners();
  }

  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        this.users = users.filter(u => u.uid !== currentUid);
      });
  }

  private subscribeToChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        this.channels = channels;
      });
  }

  private attachMentionClickListeners(): void {
    // Mention tags (@user)
    const mentionTags = this.elementRef.nativeElement.querySelectorAll('.mention-tag');
    mentionTags.forEach((tag: HTMLElement) => {
      if (!tag.hasAttribute('data-listener-attached')) {
        tag.setAttribute('data-listener-attached', 'true');
        tag.addEventListener('mousedown', (event: MouseEvent) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          const name = tag.getAttribute('data-name');
          if (name) {
            this.mentionClicked.emit(name);
          }
        });
      }
    });

    // Channel tags (#channel)
    const channelTags = this.elementRef.nativeElement.querySelectorAll('.channel-tag');
    channelTags.forEach((tag: HTMLElement) => {
      if (!tag.hasAttribute('data-listener-attached')) {
        tag.setAttribute('data-listener-attached', 'true');
        tag.addEventListener('mousedown', (event: MouseEvent) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          const name = tag.getAttribute('data-name');
          if (name) {
            this.channelClicked.emit(name);
          }
        });
      }
    });
  }


  get isOwnMessage(): boolean {
    if (this.isOwnMessageOverride !== null) return this.isOwnMessageOverride;
    const senderId = this.message?.senderId;
    if (!senderId || !this.currentUserId) return false;
    return senderId === this.currentUserId;
  }

  getTime(): string {
    const timestamp = this.message?.timestamp;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  getLastReplyTime(): string {
    const timestamp = this.message?.lastReplyTimestamp;
    if (!timestamp) return '';

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  getAvatarSrc(): string {
    return (
      this.message?.senderProfileImage ||
      this.message?.profileImageUrl ||
      'assets/avatars/avatar-1.png'
    );
  }

  getSenderName(): string {
    return this.message?.senderName || this.message?.sender || 'Unknown';
  }

  getContent(): string {
    return this.message?.content || this.message?.text || '';
  }

  /**
   * Formatiert den Content mit @mentions und #channels als HTML-Spans
   */
  /**
   * Returns cached formatted content to prevent DOM flickering
   */
  getFormattedContent(): SafeHtml {
    if (!this.cachedFormattedContent || this.getContent() !== this.lastContentHash) {
      this.updateFormattedContent();
    }
    return this.cachedFormattedContent!;
  }

  /**
   * Handler für Input-Events im contenteditable Bereich
   */
  onEditInput(event: Event): void {
    const target = event.target as HTMLElement;
    this.editedContent = this.contentFormatter.extractRawContent(target);

    const tagType = this.contentFormatter.getTagTriggerType();
    if (tagType) {
      this.showTagList = true;
      this.tagListType = tagType;
    } else {
      this.showTagList = false;
      this.tagListType = null;
    }
  }

  tagUser(user: any): void {
    const userName = user.name || user.displayName || 'Unknown';
    const el = this.editTextarea?.nativeElement;

    if (el) {
      el.focus();
      document.execCommand('delete', false);
      document.execCommand('insertHTML', false, this.contentFormatter.createUserTagHtml(userName, user.uid));
    }

    this.showTagList = false;
    this.tagListType = null;
  }

  tagChannel(channel: Channel): void {
    const el = this.editTextarea?.nativeElement;

    if (el) {
      el.focus();
      document.execCommand('delete', false);
      document.execCommand('insertHTML', false, this.contentFormatter.createChannelTagHtml(channel.name));
    }

    this.showTagList = false;
    this.tagListType = null;
  }

  /**
   * Handler für Klicks auf Mention-Tags
   */
  onMentionClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.classList.contains('mention-tag') || target.classList.contains('edit-mention-tag')) {
      event.stopPropagation();
      event.preventDefault();

      const name = target.getAttribute('data-name');

      if (name) {
        this.mentionClicked.emit(name);
      }
    }
  }

  /**
   * Supports different shapes:
   * - { '😀': ['uid1','uid2'] }
   * - { '😀': { users: ['uid'], count: 1 } }
   * - [ { emoji: '😀', users: [...] } ]
   */
  getReactions(): { emoji: string; count: number; hasReacted: boolean }[] {
    const reactions = this.message?.reactions;
    if (!reactions) return [];

    const toReaction = (emoji: string, users: string[] | undefined, count?: number) => {
      const safeUsers = Array.isArray(users) ? users : [];
      const safeCount = typeof count === 'number' ? count : safeUsers.length;
      return {
        emoji,
        count: safeCount,
        hasReacted: this.currentUserId ? safeUsers.includes(this.currentUserId) : false
      };
    };

    if (Array.isArray(reactions)) {
      return reactions
        .map((r: any) => toReaction(r?.emoji, r?.users, r?.count))
        .filter((r: any) => r.emoji && r.count > 0);
    }

    if (typeof reactions === 'object') {
      return Object.entries(reactions)
        .map(([emoji, value]: [string, any]) => {
          if (Array.isArray(value)) return toReaction(emoji, value);
          if (value && typeof value === 'object') return toReaction(emoji, value.users, value.count);
          return toReaction(emoji, []);
        })
        .filter(r => r.emoji && r.count > 0);
    }

    return [];
  }

  /**
   * Returns cached reactions to prevent DOM flickering
   */
  getReactionsWithUsers(): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    const reactionsHash = JSON.stringify(this.message?.reactions || {});
    if (reactionsHash !== this.lastReactionsHash) {
      this.updateCachedReactions();
    }
    return this.cachedReactions;
  }

  /**
   * Computes reactions with user names (internal)
   */
  private computeReactionsWithUsers(): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    const reactions = this.message?.reactions;
    if (!reactions) return [];

    const toReaction = (emoji: string, users: string[] | undefined, userNames: string[] | undefined, count?: number) => {
      const safeUsers = Array.isArray(users) ? users : [];
      const safeUserNames = Array.isArray(userNames) ? userNames : [];
      const safeCount = typeof count === 'number' ? count : safeUsers.length;
      return {
        emoji,
        count: safeCount,
        hasReacted: this.currentUserId ? safeUsers.includes(this.currentUserId) : false,
        userNames: safeUserNames
      };
    };

    if (Array.isArray(reactions)) {
      return reactions
        .map((r: any) => toReaction(r?.emoji, r?.users, r?.userNames, r?.count))
        .filter((r: any) => r.emoji && r.count > 0);
    }

    if (typeof reactions === 'object') {
      return Object.entries(reactions)
        .map(([emoji, value]: [string, any]) => {
          if (Array.isArray(value)) return toReaction(emoji, value, []);
          if (value && typeof value === 'object') return toReaction(emoji, value.users, value.userNames, value.count);
          return toReaction(emoji, [], []);
        })
        .filter(r => r.emoji && r.count > 0);
    }

    return [];
  }

  trackByEmoji(index: number, reaction: { emoji: string }): string {
    return reaction.emoji;
  }

  /**
   * Returns max visible reactions: 7 for threads/mobile, 20 for desktop
   */
  getMaxVisibleReactions(): number {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
    const isThread = !this.showThreadButton;
    return (isMobile || isThread) ? 7 : 20;
  }

  /**
   * Returns the reactions to display based on expanded state
   */
  getVisibleReactions(): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    const allReactions = this.getReactionsWithUsers();
    if (this.reactionsExpanded) {
      return allReactions;
    }
    const maxVisible = this.getMaxVisibleReactions();
    return allReactions.slice(0, maxVisible);
  }

  /**
   * Returns the count of hidden reactions
   */
  getHiddenReactionsCount(): number {
    const allReactions = this.getReactionsWithUsers();
    const maxVisible = this.getMaxVisibleReactions();
    return Math.max(0, allReactions.length - maxVisible);
  }

  /**
   * Returns true if there are more reactions than the limit
   */
  hasHiddenReactions(): boolean {
    return this.getHiddenReactionsCount() > 0;
  }

  /**
   * Toggles the expanded state of reactions
   */
  toggleReactionsExpanded(): void {
    this.reactionsExpanded = !this.reactionsExpanded;
  }


  getReactionUserName(reaction: { emoji: string; hasReacted: boolean; userNames: string[] }): string {
    // Wenn ich reagiert habe und es andere gibt, zeige einen anderen Namen
    if (reaction.hasReacted && reaction.userNames && reaction.userNames.length > 0) {
      // Finde einen Namen der nicht meiner ist
      const otherName = reaction.userNames.find(name => name !== 'Du');
      if (otherName) {
        return otherName;
      }
      return 'Du';
    }
    // Wenn ich nicht reagiert habe, zeige ersten Namen
    if (reaction.userNames && reaction.userNames.length > 0) {
      return reaction.userNames[0];
    }
    return 'Jemand';
  }

  showDuSuffix(reaction: { emoji: string; hasReacted: boolean; userNames: string[] }): boolean {
    // Zeige (du) wenn ich reagiert habe UND ein anderer Name angezeigt wird
    if (!reaction.hasReacted) return false;
    if (!reaction.userNames || reaction.userNames.length === 0) return false;
    const otherName = reaction.userNames.find(name => name !== 'Du');
    return !!otherName;
  }

  getReactionTooltipText(reaction: { emoji: string; hasReacted: boolean; userNames: string[] }): string {
    const names = [...reaction.userNames];
    
    // Replace current user's name with "Du" if they reacted
    if (reaction.hasReacted) {
      const currentUserIndex = names.findIndex(name => 
        name === this.message?.senderName || name === 'Du'
      );
      if (currentUserIndex === -1) {
        names.unshift('Du');
      } else {
        names[currentUserIndex] = 'Du';
        // Move "Du" to the front
        names.splice(currentUserIndex, 1);
        names.unshift('Du');
      }
    }
    
    if (names.length === 0) {
      return reaction.hasReacted ? 'Du hast reagiert' : 'hat reagiert';
    }
    
    if (names.length === 1) {
      return `${names[0]} hat reagiert`;
    }
    
    if (names.length === 2) {
      return `${names[0]} und ${names[1]} haben reagiert`;
    }
    
    return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]} haben reagiert`;
  }

  toggleReaction(emoji: string): void {
    this.reactionToggled.emit({ messageId: this.message?.id, emoji });
  }


  onSenderNameClick(event: MouseEvent): void {
    if (!this.senderClickable) return;
    event.stopPropagation();
    const senderId = this.message?.senderId;
    if (!senderId) return;
    this.senderClicked.emit(senderId);
  }

  onMoreVertClick(){
    this.showEditMessage = !this.showEditMessage;
  }

  hideEditMessage(): void {
    this.showEditMessage = false;
    this.showEditMessageInput = false;
  }

  onMouseLeave(): void {
    // Schließe nur das Edit-Menü, aber nicht das Input wenn es aktiv ist
    this.showEditMessage = false;
    // Reaction Picker bleibt offen bis Emoji ausgewählt wird
    // showEditMessageInput bleibt aktiv bis Speichern/Abbrechen
  }

  hideEditMessageInput(): void {
    this.showEditMessageInput = false;
  }

  openEditMessageInput(): void {
    this.showEditMessageInput = true;
    this.showEditMessage = false;
    this.editedContent = this.getContent();

    setTimeout(() => {
      if (this.editTextarea?.nativeElement) {
        this.editTextarea.nativeElement.innerHTML = this.contentFormatter.formatContentForEdit(this.editedContent);
      }
    });
  }

  async saveEditMessage(): Promise<void> {
    if (!this.message?.id || !this.editedContent.trim()) return;
    try {
      await this.messageService.editMessage(this.message.id, this.editedContent);
      this.message.content = this.editedContent;
      this.message.isEdited = true;
      
      this.showEditMessageInput = false;
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }
}
