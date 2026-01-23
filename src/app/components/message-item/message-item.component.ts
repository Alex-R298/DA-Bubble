import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, HostListener, ElementRef, AfterViewChecked, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { MessageService } from '../../services/message.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ChannelService, Channel } from '../../services/channel.service';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule, SvgImagesComponent, FormsModule],
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.css']
})
export class MessageItemComponent implements AfterViewChecked, OnInit, OnDestroy {
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

  @ViewChild('editTextarea') editTextarea!: ElementRef<HTMLDivElement>;

  showEditMessage: boolean = false;
  showEditMessageInput: boolean = false;
  showReactionPicker = false;
  editedContent: string = '';
  availableReactions: string[] = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😱', '🙏', '🔥'];
  activeReactionTooltip: string | null = null;
  private mentionListenersAdded = false;

  private messageService = inject(MessageService);
  private elementRef = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private userService = inject(UserService);
  private authService = inject(AuthService);

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
    const mentionTags = this.elementRef.nativeElement.querySelectorAll('.mention-tag');
    mentionTags.forEach((tag: HTMLElement) => {
      if (!tag.hasAttribute('data-listener-attached')) {
        tag.setAttribute('data-listener-attached', 'true');
        tag.addEventListener('mousedown', (event: MouseEvent) => {
          if (event.button !== 0) return; // Nur Linksklick
          event.stopPropagation();
          event.preventDefault();
          const name = tag.getAttribute('data-name');
          if (name) {
            this.mentionClicked.emit(name);
          }
        });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showReactionPicker && !this.elementRef.nativeElement.contains(event.target)) {
      this.showReactionPicker = false;
    }
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
  getFormattedContent(): SafeHtml {
    let content = this.getContent();

    if (!content) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    content = content.replace(/@\[([^\]]+)\]/g, (match, name) => {
      const trimmedName = name.trim();
      return `<span class="mention-tag" data-name="${trimmedName}">@${trimmedName}</span>`;
    });
    content = content.replace(/#(\S+)/g, '<span class="channel-tag">#$1</span>');

    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /**
   * Formatiert den Content für das Bearbeitungsfeld (editedContent statt message.content)
   */
  getEditableFormattedContent(): SafeHtml {
    let content = this.editedContent;

    if (!content) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    content = content.replace(/@\[([^\]]+)\]/g, (match, name) => {
      const trimmedName = name.trim();
      return `<span class="edit-mention-tag" data-name="${trimmedName}">@${trimmedName}</span>`;
    });
    content = content.replace(/#(\S+)/g, '<span class="channel-tag">#$1</span>');

    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /**
   * Handler für Input-Events im contenteditable Bereich
   */
  onEditInput(event: Event): void {
    const target = event.target as HTMLElement;
    // Extrahiere den Text und wandle mention-tags zurück in @[Name] Format
    this.editedContent = this.extractRawContent(target);

    // Prüfe ob @ getippt wurde für Tag-Dropdown
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.showTagList = false;
      return;
    }

    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
    const lastChar = textBeforeCursor[textBeforeCursor.length - 1];

    if (lastChar === '@') {
      this.showTagList = true;
      this.tagListType = 'user';
    } else if (lastChar === '#') {
      this.showTagList = true;
      this.tagListType = 'channel';
    } else {
      this.showTagList = false;
      this.tagListType = null;
    }
  }

  getStatusClass(user: any): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  tagUser(user: any): void {
    const userName = user.name || user.displayName || 'Unknown';
    const el = this.editTextarea?.nativeElement;

    if (el) {
      el.focus();
      // Lösche das @ das gerade getippt wurde
      document.execCommand('delete', false);
      // Füge formatierten Tag ein
      const tagHtml = `<span class="edit-mention-tag" contenteditable="false" data-name="${userName}" data-uid="${user.uid}">@${userName}</span>&nbsp;`;
      document.execCommand('insertHTML', false, tagHtml);
    }

    this.showTagList = false;
    this.tagListType = null;
  }

  tagChannel(channel: Channel): void {
    const el = this.editTextarea?.nativeElement;

    if (el) {
      el.focus();
      // Lösche das # das gerade getippt wurde
      document.execCommand('delete', false);
      // Füge formatierten Tag ein
      const tagHtml = `<span class="edit-channel-tag" contenteditable="false" data-name="${channel.name}">#${channel.name}</span>&nbsp;`;
      document.execCommand('insertHTML', false, tagHtml);
    }

    this.showTagList = false;
    this.tagListType = null;
  }

  /**
   * Extrahiert den Rohtext aus dem HTML und wandelt mentions zurück
   */
  private extractRawContent(element: HTMLElement): string {
    let result = '';
    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.classList.contains('edit-mention-tag')) {
          const name = el.getAttribute('data-name');
          result += `@[${name}]`;
        } else if (el.classList.contains('edit-channel-tag') || el.classList.contains('channel-tag')) {
          const name = el.getAttribute('data-name');
          result += `#${name}`;
        } else {
          result += el.textContent;
        }
      }
    });
    return result;
  }

  /**
   * Versucht die UID für einen erwähnten User zu finden
   */
  private getMentionUid(name: string): string | null {
    const mentionedUsers = this.message?.mentionedUsers;
    if (mentionedUsers && Array.isArray(mentionedUsers)) {
      const user = mentionedUsers.find((u: any) => u.name === name || u.displayName === name);
      if (user) return user.uid;
    }
    return null;
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
   * Extended version with user names for tooltips
   */
  getReactionsWithUsers(): { emoji: string; count: number; hasReacted: boolean; userNames: string[] }[] {
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

  showReactionTooltip(reaction: { emoji: string }): void {
    this.activeReactionTooltip = reaction.emoji;
  }

  hideReactionTooltip(): void {
    this.activeReactionTooltip = null;
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

  toggleReactionPicker(): void {
    this.showReactionPicker = !this.showReactionPicker;
  }

  addReaction(emoji: string): void {
    this.toggleReaction(emoji);
    this.showReactionPicker = false;
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

    // Setze den formatierten Inhalt nach dem nächsten Render-Zyklus
    setTimeout(() => {
      if (this.editTextarea?.nativeElement) {
        this.editTextarea.nativeElement.innerHTML = this.formatContentForEdit(this.editedContent);
      }
    });
  }

  private formatContentForEdit(content: string): string {
    if (!content) return '';

    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    formatted = formatted.replace(/@\[([^\]]+)\]/g, (match, name) => {
      const trimmedName = name.trim();
      return `<span class="edit-mention-tag" data-name="${trimmedName}" contenteditable="false">@${trimmedName}</span>`;
    });

    formatted = formatted.replace(/#(\S+)/g, '<span class="channel-tag" contenteditable="false">#$1</span>');

    return formatted;
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
