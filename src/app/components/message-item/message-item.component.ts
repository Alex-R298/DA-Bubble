import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, ElementRef, AfterViewChecked, ViewChild, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { HoverReactionBarComponent } from '../hover-reaction-bar/hover-reaction-bar.component';
import { UserTagDropdownComponent } from '../user-tag-dropdown/user-tag-dropdown.component';
import { MessageService } from '../../services/message.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ChannelService, Channel } from '../../services/channel.service';
import { ContentFormatterService } from '../../services/content-formatter.service';
import { MessageItemReactionsHelper, ReactionWithUsers } from './message-item-reactions.helper';
import { MessageItemEditHelper } from './message-item-edit.helper';

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
  @Input() showCommentButton: boolean = true;
  @Input() senderClickable: boolean = false;
  @Output() reactionToggled = new EventEmitter<{ messageId: string | undefined; emoji: string }>();
  @Output() threadClicked = new EventEmitter<void>();
  @Output() senderClicked = new EventEmitter<string>();
  @Output() mentionClicked = new EventEmitter<string>();
  @Output() channelClicked = new EventEmitter<string>();
  @ViewChild('editTextarea') editTextarea!: ElementRef<HTMLDivElement>;

  private cachedFormattedContent: SafeHtml | null = null;
  private lastContentHash: string = '';
  private messageService = inject(MessageService);
  private elementRef = inject(ElementRef);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private contentFormatter = inject(ContentFormatterService);
  private channelService = inject(ChannelService);
  users: any[] = [];
  channels: Channel[] = [];
  senderProfileImage: string = '';
  senderName: string = '';
  private usersSubscription?: Subscription;
  private channelsSubscription?: Subscription;
  private senderSubscription?: Subscription;
  readonly reactionsHelper = new MessageItemReactionsHelper();
  readonly editHelper = new MessageItemEditHelper();
  showEditEmojiPicker = false;
  editEmojis: string[] = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😱', '🙏', '🔥'];
  dropdownPosition: 'top' | 'bottom' = 'top';
  tooltipLeftIndex: number = -1;
  tooltipBottomIndex: number = -1;

  get showEditMessage() { return this.editHelper.showEditMessage; }
  get showEditMessageInput() { return this.editHelper.showEditMessageInput; }
  get editedContent() { return this.editHelper.editedContent; }
  get showTagList() { return this.editHelper.showTagList; }
  get tagListType() { return this.editHelper.tagListType; }
  get reactionsExpanded() { return this.reactionsHelper.reactionsExpanded; }

  /** Checks if the current message belongs to the current user */
  get isOwnMessage(): boolean {
    if (this.isOwnMessageOverride !== null) return this.isOwnMessageOverride;
    const senderId = this.message?.senderId;
    if (!senderId || !this.currentUserId) return false;
    return senderId === this.currentUserId;
  }

  /** Initializes the component by subscribing to users and channels */
  ngOnInit(): void {
    this.subscribeToUsers();
    this.subscribeToChannels();
    this.subscribeToSenderProfile();
    this.updateFormattedContent();
  }

  /** Handles input changes and updates cached content and reactions */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.updateFormattedContent();
      this.reactionsHelper.updateCachedReactions(this.message, this.currentUserId);
      this.subscribeToSenderProfile();
    }
  }

  /** Cleans up subscriptions when component is destroyed */
  ngOnDestroy(): void {
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
    this.senderSubscription?.unsubscribe();
  }

  /** Attaches click listeners to mention tags after view is checked */
  ngAfterViewChecked(): void {
    this.attachMentionClickListeners();
  }

  /** Updates the formatted content cache when content changes */
  private updateFormattedContent(): void {
    const content = this.getContent();
    if (content !== this.lastContentHash) {
      this.lastContentHash = content;
      this.cachedFormattedContent = this.contentFormatter.formatContent(content);
    }
  }

  /** Subscribes to realtime updates of all users except current user */
  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime().subscribe(users => {
      const currentUid = this.authService.getCurrentUser()?.uid;
      this.users = users.filter(u => u.uid !== currentUid);
    });
  }

  /** Subscribes to realtime updates of all channels */
  private subscribeToChannels(): void {
    this.channelsSubscription = this.channelService.getAllChannels().subscribe(channels => {
      this.channels = channels;
    });
  }

  /** Subscribes to realtime updates of the message sender's profile image */
  private subscribeToSenderProfile(): void {
    this.senderSubscription?.unsubscribe();
    const senderId = this.message?.senderId;
    if (!senderId) return;

    this.senderSubscription = this.userService.getUserByIdRealtime(senderId).subscribe(user => {
      if (user?.profileImageUrl) {
        this.senderProfileImage = user.profileImageUrl;
      }
      if (user?.name) {
        this.senderName = user.name;
      }
    });
  }

  /** Attaches click listeners to mention and channel tags in the message */
  private attachMentionClickListeners(): void {
    this.attachTagListeners('.mention-tag', (name) => this.mentionClicked.emit(name));
    this.attachTagListeners('.channel-tag', (name) => this.channelClicked.emit(name));
  }

  /** Attaches click listeners to tags with specified selector */
  private attachTagListeners(selector: string, emitCallback: (name: string) => void): void {
    const tags = this.elementRef.nativeElement.querySelectorAll(selector);
    tags.forEach((tag: HTMLElement) => {
      if (!tag.hasAttribute('data-listener-attached')) {
        tag.setAttribute('data-listener-attached', 'true');
        tag.addEventListener('mousedown', (event: MouseEvent) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          const name = tag.getAttribute('data-name');
          if (name) emitCallback(name);
        });
      }
    });
  }

  /** Gets the formatted time of the message in HH:MM format */
  getTime(): string {
    const timestamp = this.message?.timestamp;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  /** Gets the formatted time of the last reply in HH:MM format */
  getLastReplyTime(): string {
    const timestamp = this.message?.lastReplyTimestamp;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  /** Gets the avatar source URL for the message sender */
  getAvatarSrc(): string {
    return this.senderProfileImage || this.message?.senderProfileImage || this.message?.profileImageUrl || 'assets/avatars/avatar-1.png';
  }

  /** Gets the sender's name or 'Unknown' if not available */
  getSenderName(): string {
    return this.senderName || this.message?.senderName || this.message?.sender || 'Unknown';
  }

  /** Gets the message content text */
  getContent(): string {
    return this.message?.content || this.message?.text || '';
  }

  /** Gets the formatted HTML content with caching */
  getFormattedContent(): SafeHtml {
    if (!this.cachedFormattedContent || this.getContent() !== this.lastContentHash) {
      this.updateFormattedContent();
    }
    return this.cachedFormattedContent!;
  }

  /** Handles click events on mention tags */
  onMentionClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('mention-tag') || target.classList.contains('edit-mention-tag')) {
      event.stopPropagation();
      event.preventDefault();
      const name = target.getAttribute('data-name');
      if (name) this.mentionClicked.emit(name);
    }
  }

  /** Handles input events in the edit textarea and detects tag triggers */
  onEditInput(event: Event): void {
    const wasShowingTagList = this.editHelper.showTagList;
    this.editHelper.onEditInput(event, this.contentFormatter);
    if (!wasShowingTagList && this.editHelper.showTagList) {
      this.calculateDropdownPosition();
    }
  }

  /** Inserts a user tag at the current cursor position */
  tagUser(user: any): void {
    this.editHelper.tagUser(user, this.editTextarea, this.contentFormatter);
  }

  /** Inserts a channel tag at the current cursor position */
  tagChannel(channel: Channel): void {
    this.editHelper.tagChannel(channel, this.editTextarea, this.contentFormatter);
  }

  /** Toggles the edit message menu visibility */
  onMoreVertClick(): void {
    this.editHelper.onMoreVertClick();
  }

  /** Hides the edit message menu and input */
  hideEditMessage(): void {
    this.editHelper.hideEditMessage();
  }

  /** Handles mouse leave event to hide edit menu */
  onMouseLeave(): void {
    this.editHelper.onMouseLeave();
  }

  /** Hides the edit message input field */
  hideEditMessageInput(): void {
    this.editHelper.hideEditMessageInput();
  }

  /** Opens the edit message input with current message content */
  openEditMessageInput(): void {
    this.editHelper.openEditMessageInput(this.getContent(), () => this.editTextarea, this.contentFormatter);
  }

  /** Saves the edited message to the database */
  async saveEditMessage(): Promise<void> {
    await this.editHelper.saveEditMessage(this.message, this.messageService);
  }

  /** Gets the reactions that should be visible based on expansion state */
  getVisibleReactions(): ReactionWithUsers[] {
    return this.reactionsHelper.getVisibleReactions(this.message, this.currentUserId, this.showThreadButton);
  }

  /** Checks if there are hidden reactions */
  hasHiddenReactions(): boolean {
    return this.reactionsHelper.hasHiddenReactions(this.message, this.currentUserId, this.showThreadButton);
  }

  /** Calculates the number of hidden reactions */
  getHiddenReactionsCount(): number {
    return this.reactionsHelper.getHiddenReactionsCount(this.message, this.currentUserId, this.showThreadButton);
  }

  /** Toggles the expanded state of reactions */
  toggleReactionsExpanded(): void {
    this.reactionsHelper.toggleReactionsExpanded();
  }

  /** Gets a user name to display for a reaction */
  getReactionUserName(reaction: ReactionWithUsers): string {
    return this.reactionsHelper.getReactionUserName(reaction);
  }

  /** Determines if 'Du' suffix should be shown for a reaction */
  showDuSuffix(reaction: ReactionWithUsers): boolean {
    return this.reactionsHelper.showDuSuffix(reaction);
  }

  /** Generates tooltip text for a reaction showing all users who reacted */
  getReactionTooltipText(reaction: ReactionWithUsers): string {
    return this.reactionsHelper.getReactionTooltipText(reaction, this.message?.senderName);
  }

  /** Checks if tooltip should be positioned to the left/bottom based on available space */
  checkTooltipPosition(wrapper: HTMLElement, index: number): void {
    const rect = wrapper.getBoundingClientRect();
    const tooltipWidth = 180; // approximate tooltip width
    const tooltipHeight = 130; // approximate tooltip height

    // For own messages (right-aligned), always show tooltip to the left
    if (this.isOwnMessage) {
      this.tooltipLeftIndex = index;
    } else {
      // Check horizontal space - use viewport width
      const spaceOnRight = window.innerWidth - rect.right;
      if (spaceOnRight < tooltipWidth) {
        this.tooltipLeftIndex = index;
      } else {
        this.tooltipLeftIndex = -1;
      }
    }

    // Check vertical space - use element position from top of viewport
    const spaceAbove = rect.top;
    if (spaceAbove < tooltipHeight) {
      this.tooltipBottomIndex = index;
    } else {
      this.tooltipBottomIndex = -1;
    }
  }

  /** Tracking function for ngFor to improve performance */
  trackByEmoji = (index: number, reaction: { emoji: string }): string => {
    return reaction.emoji;
  }

  /** Toggles a reaction for the current message */
  toggleReaction(emoji: string): void {
    this.reactionToggled.emit({ messageId: this.message?.id, emoji });
  }

  /** Checks if the given user name belongs to the current user */
  isCurrentUserName(userName: string): boolean {
    const currentName = this.message?.senderName;
    // Check if the userName matches the current user by comparing with message reactions
    const reactions = this.message?.reactions;
    if (!reactions) return false;

    // Find the user index in any reaction and compare with currentUserId
    for (const [emoji, reaction] of Object.entries(reactions)) {
      if (reaction && typeof reaction === 'object') {
        const r = reaction as any;
        if (r.userNames && r.users) {
          const nameIndex = r.userNames.indexOf(userName);
          if (nameIndex !== -1 && r.users[nameIndex] === this.currentUserId) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Handles click events on the sender's name */
  onSenderNameClick(event: MouseEvent): void {
    if (!this.senderClickable) return;
    event.stopPropagation();
    const senderId = this.message?.senderId;
    if (!senderId) return;
    this.senderClicked.emit(senderId);
  }

  /** Toggles the edit emoji picker visibility */
  toggleEditEmojiPicker(): void {
    this.showEditEmojiPicker = !this.showEditEmojiPicker;
  }

  /** Inserts an emoji into the edit textarea at cursor position */
  insertEditEmoji(emoji: string): void {
    const textarea = this.editTextarea?.nativeElement;
    if (!textarea) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (textarea.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(document.createTextNode(emoji));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        textarea.innerHTML += emoji;
      }
    } else {
      textarea.innerHTML += emoji;
    }
    this.editHelper.editedContent = textarea.innerHTML;
    this.showEditEmojiPicker = false;
  }

  /** Calculates whether the dropdown should appear above or below */
  private calculateDropdownPosition(): void {
    const textarea = this.editTextarea?.nativeElement;
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();
    const scrollContainer = this.findScrollableParent(textarea);

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const spaceAboveInContainer = rect.top - containerRect.top;
      this.dropdownPosition = spaceAboveInContainer < 320 ? 'bottom' : 'top';
    } else {
      this.dropdownPosition = rect.top < 320 ? 'bottom' : 'top';
    }
  }

  /** Finds the nearest scrollable parent container */
  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }
}
