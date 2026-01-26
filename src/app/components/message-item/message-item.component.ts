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
  @Input() currentUserId: string = '';
  @Input() isOwnMessageOverride: boolean | null = null;
  @Input() showReactions: boolean = true;
  @Input() showThreadButton: boolean = false;
  @Input() senderClickable: boolean = false;
  @Output() reactionToggled = new EventEmitter<{ messageId: string | undefined; emoji: string }>();
  @Output() threadClicked = new EventEmitter<void>();
  @Output() senderClicked = new EventEmitter<string>();
  @Output() mentionClicked = new EventEmitter<string>();
  @Output() channelClicked = new EventEmitter<string>();

  @ViewChild('editTextarea') editTextarea!: ElementRef<HTMLDivElement>;

  showEditMessage: boolean = false;
  showEditMessageInput: boolean = false;
  editedContent: string = '';
  private mentionListenersAdded = false;
  reactionsExpanded: boolean = false;
  private cachedFormattedContent: SafeHtml | null = null;
  private lastContentHash: string = '';
  private cachedReactions: { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] = [];
  private lastReactionsHash: string = '';
  private messageService = inject(MessageService);
  private elementRef = inject(ElementRef);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private contentFormatter = inject(ContentFormatterService);
  showTagList: boolean = false;
  tagListType: 'user' | 'channel' | null = null;
  users: any[] = [];
  channels: Channel[] = [];
  private usersSubscription?: Subscription;
  private channelsSubscription?: Subscription;
  private channelService = inject(ChannelService);


  /**
   * Initializes the component by subscribing to users and channels
   * and updating the formatted content
   */
  ngOnInit(): void {
    this.subscribeToUsers();
    this.subscribeToChannels();
    this.updateFormattedContent();
  }


  /**
   * Handles input changes and updates cached content and reactions
   * @param changes - The changes detected in the component inputs
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.updateFormattedContent();
      this.updateCachedReactions();
    }
  }


  /**
   * Updates the formatted content cache when content changes
   * @private
   */
  private updateFormattedContent(): void {
    const content = this.getContent();
    if (content !== this.lastContentHash) {
      this.lastContentHash = content;
      this.cachedFormattedContent = this.contentFormatter.formatContent(content);
    }
  }


  /**
   * Updates the cached reactions when reactions change
   * @private
   */
  private updateCachedReactions(): void {
    const reactionsHash = JSON.stringify(this.message?.reactions || {});
    if (reactionsHash !== this.lastReactionsHash) {
      this.lastReactionsHash = reactionsHash;
      this.cachedReactions = this.computeReactionsWithUsers();
    }
  }


  /**
   * Cleans up subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
  }


  /**
   * Attaches click listeners to mention tags after view is checked
   */
  ngAfterViewChecked(): void {
    this.attachMentionClickListeners();
  }


  /**
   * Subscribes to realtime updates of all users except current user
   * @private
   */
  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        this.users = users.filter(u => u.uid !== currentUid);
      });
  }


  /**
   * Subscribes to realtime updates of all channels
   * @private
   */
  private subscribeToChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        this.channels = channels;
      });
  }


  /**
 * Attaches click listeners to mention and channel tags in the message
 * @private
 */
private attachMentionClickListeners(): void {
  this.attachTagListeners('.mention-tag', (name) => this.mentionClicked.emit(name));
  this.attachTagListeners('.channel-tag', (name) => this.channelClicked.emit(name));
}


/**
 * Attaches click listeners to tags with specified selector
 * @private
 * @param selector - CSS selector for the tags
 * @param emitCallback - Callback function to emit the tag name
 */
private attachTagListeners(selector: string, emitCallback: (name: string) => void): void {
  const tags = this.elementRef.nativeElement.querySelectorAll(selector);
  tags.forEach((tag: HTMLElement) => {
    if (!tag.hasAttribute('data-listener-attached')) {
      tag.setAttribute('data-listener-attached', 'true');
      tag.addEventListener('mousedown', (event: MouseEvent) => {
        this.handleTagClick(event, tag, emitCallback);
      });
    }
  });
}


/**
 * Handles click events on tag elements
 * @private
 * @param event - The mouse event
 * @param tag - The HTML element that was clicked
 * @param emitCallback - Callback function to emit the tag name
 */
private handleTagClick(event: MouseEvent, tag: HTMLElement, emitCallback: (name: string) => void): void {
  if (event.button !== 0) return;
  event.stopPropagation();
  event.preventDefault();
  const name = tag.getAttribute('data-name');
  if (name) {
    emitCallback(name);
  }
}


  /**
   * Checks if the current message belongs to the current user
   * @returns True if message is from current user
   */
  get isOwnMessage(): boolean {
    if (this.isOwnMessageOverride !== null) return this.isOwnMessageOverride;
    const senderId = this.message?.senderId;
    if (!senderId || !this.currentUserId) return false;
    return senderId === this.currentUserId;
  }


  /**
   * Gets the formatted time of the message
   * @returns Formatted time string in HH:MM format
   */
  getTime(): string {
    const timestamp = this.message?.timestamp;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }


  /**
   * Gets the formatted time of the last reply
   * @returns Formatted time string in HH:MM format
   */
  getLastReplyTime(): string {
    const timestamp = this.message?.lastReplyTimestamp;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }


  /**
   * Gets the avatar source URL for the message sender
   * @returns Avatar image URL or default avatar path
   */
  getAvatarSrc(): string {
    return (
      this.message?.senderProfileImage ||
      this.message?.profileImageUrl ||
      'assets/avatars/avatar-1.png'
    );
  }


  /**
   * Gets the sender's name
   * @returns Sender name or 'Unknown' if not available
   */
  getSenderName(): string {
    return this.message?.senderName || this.message?.sender || 'Unknown';
  }


  /**
   * Gets the message content text
   * @returns Message content string
   */
  getContent(): string {
    return this.message?.content || this.message?.text || '';
  }


  /**
   * Gets the formatted HTML content with caching
   * @returns SafeHtml formatted content
   */
  getFormattedContent(): SafeHtml {
    if (!this.cachedFormattedContent || this.getContent() !== this.lastContentHash) {
      this.updateFormattedContent();
    }
    return this.cachedFormattedContent!;
  }


  /**
   * Handles input events in the edit textarea and detects tag triggers
   * @param event - The input event
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


  /**
   * Inserts a user tag at the current cursor position
   * @param user - The user object to tag
   */
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


  /**
   * Inserts a channel tag at the current cursor position
   * @param channel - The channel object to tag
   */
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
   * Handles click events on mention tags
   * @param event - The mouse event
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
   * Gets basic reaction data without user names
   * @returns Array of reactions with emoji, count, and user reaction status
   */
  getReactions(): { emoji: string; count: number; hasReacted: boolean }[] {
    const reactions = this.message?.reactions;
    if (!reactions) return [];
    
    if (Array.isArray(reactions)) {
      return this.getReactionsFromArray(reactions);
    }
    return this.getReactionsFromObject(reactions);
  }


  /**
   * Extracts reactions from array format
   * @private
   * @param reactions - Reactions in array format
   * @returns Array of processed reactions
   */
  private getReactionsFromArray(reactions: any[]): { emoji: string; count: number; hasReacted: boolean }[] {
    return reactions
      .map((r: any) => this.toBasicReaction(r?.emoji, r?.users, r?.count))
      .filter((r: any) => r.emoji && r.count > 0);
  }


  /**
   * Extracts reactions from object format
   * @private
   * @param reactions - Reactions in object format
   * @returns Array of processed reactions
   */
  private getReactionsFromObject(reactions: any): { emoji: string; count: number; hasReacted: boolean }[] {
    return Object.entries(reactions)
      .map(([emoji, value]: [string, any]) => {
        if (Array.isArray(value)) return this.toBasicReaction(emoji, value);
        if (value && typeof value === 'object') return this.toBasicReaction(emoji, value.users, value.count);
        return this.toBasicReaction(emoji, []);
      })
      .filter(r => r.emoji && r.count > 0);
  }


  /**
   * Converts raw reaction data to basic reaction object
   * @private
   * @param emoji - The emoji string
   * @param users - Array of user IDs who reacted
   * @param count - Optional count override
   * @returns Basic reaction object
   */
  private toBasicReaction(emoji: string, users?: string[], count?: number): { emoji: string; count: number; hasReacted: boolean } {
    const safeUsers = Array.isArray(users) ? users : [];
    const safeCount = typeof count === 'number' ? count : safeUsers.length;
    return {
      emoji,
      count: safeCount,
      hasReacted: this.currentUserId ? safeUsers.includes(this.currentUserId) : false
    };
  }


  /**
   * Gets reaction data including user names with caching
   * @returns Array of reactions with emoji, count, user reaction status, and user names
   */
  getReactionsWithUsers(): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    const reactionsHash = JSON.stringify(this.message?.reactions || {});
    if (reactionsHash !== this.lastReactionsHash) {
      this.updateCachedReactions();
    }
    return this.cachedReactions;
  }


  /**
   * Computes reaction data with user names from message reactions
   * @private
   * @returns Array of reactions with emoji, count, user reaction status, and user names
   */
  private computeReactionsWithUsers(): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    const reactions = this.message?.reactions;
    if (!reactions) return [];
    
    if (Array.isArray(reactions)) {
      return this.computeReactionsWithUsersArray(reactions);
    }
    return this.computeReactionsWithUsersObject(reactions);
  }


  /**
   * Computes reactions with user names from array format
   * @private
   * @param reactions - Reactions in array format
   * @returns Array of reactions with user names
   */
  private computeReactionsWithUsersArray(reactions: any[]): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    return reactions
      .map((r: any) => this.toReactionWithUsers(r?.emoji, r?.users, r?.userNames, r?.count))
      .filter((r: any) => r.emoji && r.count > 0);
  }


  /**
   * Computes reactions with user names from object format
   * @private
   * @param reactions - Reactions in object format
   * @returns Array of reactions with user names
   */
  private computeReactionsWithUsersObject(reactions: any): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
    return Object.entries(reactions)
      .map(([emoji, value]: [string, any]) => {
        if (Array.isArray(value)) return this.toReactionWithUsers(emoji, value, []);
        if (value && typeof value === 'object') return this.toReactionWithUsers(emoji, value.users, value.userNames, value.count);
        return this.toReactionWithUsers(emoji, [], []);
      })
      .filter(r => r.emoji && r.count > 0);
  }


  /**
   * Converts raw reaction data to reaction object with user names
   * @private
   * @param emoji - The emoji string
   * @param users - Array of user IDs who reacted
   * @param userNames - Array of user names who reacted
   * @param count - Optional count override
   * @returns Reaction object with user names
   */
  private toReactionWithUsers(emoji: string, users?: string[], userNames?: string[], count?: number): { emoji: string; count: number; hasReacted: boolean; userNames: string[] } {
    const safeUsers = Array.isArray(users) ? users : [];
    const safeUserNames = Array.isArray(userNames) ? userNames : [];
    const safeCount = typeof count === 'number' ? count : safeUsers.length;
    return {
      emoji,
      count: safeCount,
      hasReacted: this.currentUserId ? safeUsers.includes(this.currentUserId) : false,
      userNames: safeUserNames
    };
  }


  /**
   * Tracking function for ngFor to improve performance
   * @param index - The index of the item
   * @param reaction - The reaction object
   * @returns The emoji as unique identifier
   */
  trackByEmoji(index: number, reaction: { emoji: string }): string {
    return reaction.emoji;
  }


  /**
   * Calculates maximum number of visible reactions based on screen size and context
   * @returns Maximum number of reactions to display
   */
  getMaxVisibleReactions(): number {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
    const isThread = !this.showThreadButton;
    return (isMobile || isThread) ? 7 : 20;
  }


  /**
   * Gets the reactions that should be visible based on expansion state
   * @returns Array of visible reactions with user information
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
   * Calculates the number of hidden reactions
   * @returns Count of reactions not currently visible
   */
  getHiddenReactionsCount(): number {
    const allReactions = this.getReactionsWithUsers();
    const maxVisible = this.getMaxVisibleReactions();
    return Math.max(0, allReactions.length - maxVisible);
  }


  /**
   * Checks if there are hidden reactions
   * @returns True if reactions are hidden
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


  /**
   * Gets a user name to display for a reaction
   * @param reaction - The reaction object with user information
   * @returns User name to display
   */
  getReactionUserName(reaction: { emoji: string; hasReacted: boolean; userNames: string[] }): string {
    if (reaction.hasReacted && reaction.userNames && reaction.userNames.length > 0) {
      const otherName = reaction.userNames.find(name => name !== 'Du');
      if (otherName) {
        return otherName;
      }
      return 'Du';
    }
    if (reaction.userNames && reaction.userNames.length > 0) {
      return reaction.userNames[0];
    }
    return 'Jemand';
  }


  /**
   * Determines if 'Du' suffix should be shown for a reaction
   * @param reaction - The reaction object
   * @returns True if Du suffix should be displayed
   */
  showDuSuffix(reaction: { emoji: string; hasReacted: boolean; userNames: string[] }): boolean {
    if (!reaction.hasReacted) return false;
    if (!reaction.userNames || reaction.userNames.length === 0) return false;
    const otherName = reaction.userNames.find(name => name !== 'Du');
    return !!otherName;
  }


  /**
   * Generates tooltip text for a reaction showing all users who reacted
   * @param reaction - The reaction object with user information
   * @returns Formatted tooltip text
   */
  getReactionTooltipText(reaction: { emoji: string; hasReacted: boolean; userNames: string[] }): string {
    const names = [...reaction.userNames];
    if (reaction.hasReacted) {
      const currentUserIndex = names.findIndex(name => 
        name === this.message?.senderName || name === 'Du'
      );
      if (currentUserIndex === -1) {
        names.unshift('Du');
      } else {
        names[currentUserIndex] = 'Du';
        names.splice(currentUserIndex, 1);
        names.unshift('Du');
      }
    }
    
    return this.formatReactionNames(names, reaction.hasReacted);
  }


  /**
   * Formats reaction names into a readable German text
   * @private
   * @param names - Array of user names
   * @param hasReacted - Whether current user has reacted
   * @returns Formatted text string
   */
  private formatReactionNames(names: string[], hasReacted: boolean): string {
    if (names.length === 0) {
      return hasReacted ? 'Du hast reagiert' : 'hat reagiert';
    }
    if (names.length === 1) {
      return `${names[0]} hat reagiert`;
    }
    if (names.length === 2) {
      return `${names[0]} und ${names[1]} haben reagiert`;
    }
    return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]} haben reagiert`;
  }


  /**
   * Toggles a reaction for the current message
   * @param emoji - The emoji to toggle
   */
  toggleReaction(emoji: string): void {
    this.reactionToggled.emit({ messageId: this.message?.id, emoji });
  }


  /**
   * Handles click events on the sender's name
   * @param event - The mouse event
   */
  onSenderNameClick(event: MouseEvent): void {
    if (!this.senderClickable) return;
    event.stopPropagation();
    const senderId = this.message?.senderId;
    if (!senderId) return;
    this.senderClicked.emit(senderId);
  }


  /**
   * Toggles the edit message menu visibility
   */
  onMoreVertClick(): void {
    this.showEditMessage = !this.showEditMessage;
  }


  /**
   * Hides the edit message menu and input
   */
  hideEditMessage(): void {
    this.showEditMessage = false;
    this.showEditMessageInput = false;
  }


  /**
   * Handles mouse leave event to hide edit menu
   */
  onMouseLeave(): void {
    this.showEditMessage = false;
  }


  /**
   * Hides the edit message input field
   */
  hideEditMessageInput(): void {
    this.showEditMessageInput = false;
  }


  /**
   * Opens the edit message input with current message content
   */
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


  /**
   * Saves the edited message to the database
   * @returns Promise that resolves when message is saved
   */
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