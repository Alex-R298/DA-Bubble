import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule, SvgImagesComponent, FormsModule],
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.css']
})
export class MessageItemComponent {
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

  showEditMessage: boolean = false;
  showEditMessageInput: boolean = false;
  showReactionPicker = false;
  editedContent: string = '';
  availableReactions: string[] = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😱', '🙏', '🔥'];

  private messageService = inject(MessageService);

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
    // showEditMessageInput bleibt aktiv bis Speichern/Abbrechen
  }

  hideEditMessageInput(): void {
    this.showEditMessageInput = false;
  }

  openEditMessageInput(): void {
    this.showEditMessageInput = true;
    this.showEditMessage = false;
    this.editedContent = this.getContent(); // Initialisiere mit aktueller Nachricht
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
