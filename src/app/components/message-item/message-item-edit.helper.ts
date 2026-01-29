import { ElementRef } from '@angular/core';
import { ContentFormatterService } from '../../services/content-formatter.service';
import { MessageService } from '../../services/message.service';
import { Channel } from '../../services/channel.service';


/**
 * Helper class for handling message editing functionality
 * Manages edit state, tag insertion, and message updates
 */
export class MessageItemEditHelper {
  showEditMessage: boolean = false;
  showEditMessageInput: boolean = false;
  editedContent: string = '';
  showTagList: boolean = false;
  tagListType: 'user' | 'channel' | null = null;


  /**
   * Handles input events in the edit textarea and detects tag triggers
   * @param event - The input event
   * @param contentFormatter - The content formatter service
   */
  onEditInput(event: Event, contentFormatter: ContentFormatterService): void {
    const target = event.target as HTMLElement;
    this.editedContent = contentFormatter.extractRawContent(target);

    const tagType = contentFormatter.getTagTriggerType();
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
   * @param editTextarea - Reference to the edit textarea element
   * @param contentFormatter - The content formatter service
   */
  tagUser(user: any, editTextarea: ElementRef<HTMLDivElement> | undefined, contentFormatter: ContentFormatterService): void {
    const userName = user.name || user.displayName || 'Unknown';
    const el = editTextarea?.nativeElement;
    if (el) {
      el.focus();
      document.execCommand('delete', false);
      document.execCommand('insertHTML', false, contentFormatter.createUserTagHtml(userName, user.uid));
    }
    this.showTagList = false;
    this.tagListType = null;
  }


  /**
   * Inserts a channel tag at the current cursor position
   * @param channel - The channel object to tag
   * @param editTextarea - Reference to the edit textarea element
   * @param contentFormatter - The content formatter service
   */
  tagChannel(channel: Channel, editTextarea: ElementRef<HTMLDivElement> | undefined, contentFormatter: ContentFormatterService): void {
    const el = editTextarea?.nativeElement;
    if (el) {
      el.focus();
      document.execCommand('delete', false);
      document.execCommand('insertHTML', false, contentFormatter.createChannelTagHtml(channel.name));
    }
    this.showTagList = false;
    this.tagListType = null;
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
   * @param currentContent - The current message content
   * @param getEditTextarea - Getter function to retrieve the edit textarea element
   * @param contentFormatter - The content formatter service
   */
  openEditMessageInput(
    currentContent: string,
    getEditTextarea: () => ElementRef<HTMLDivElement> | undefined,
    contentFormatter: ContentFormatterService
  ): void {
    this.showEditMessageInput = true;
    this.showEditMessage = false;
    this.editedContent = currentContent;

    setTimeout(() => {
      const editTextarea = getEditTextarea();
      if (editTextarea?.nativeElement && this.editedContent) {
        const formattedContent = contentFormatter.formatContentForEdit(this.editedContent);
        editTextarea.nativeElement.innerHTML = formattedContent;
        editTextarea.nativeElement.focus();

        // Cursor ans Ende setzen
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editTextarea.nativeElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 100);
  }


  /**
   * Saves the edited message to the database
   * @param message - The message object to update
   * @param messageService - The message service for API calls
   * @returns Promise that resolves when message is saved
   */
  async saveEditMessage(message: any, messageService: MessageService): Promise<void> {
    if (!message?.id || !this.editedContent.trim()) return;
    try {
      await messageService.editMessage(message.id, this.editedContent);
      message.content = this.editedContent;
      message.isEdited = true;
      this.showEditMessageInput = false;
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }
}
