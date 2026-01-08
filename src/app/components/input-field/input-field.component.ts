import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent],
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.css']
})
export class InputFieldComponent {
  @Input() channelName: string = '';
  @Input() recipientName: string = '';
  @Output() messageSent = new EventEmitter<string>();

  message: string = '';
  isSending: boolean = false;

  showEmojiPicker: boolean = false;
  emojis: string[] = ['😀', '😅', '😂', '😍', '🤝', '👍', '🎉', '🔥', '✅', '❓'];

  sendMessage(): void {
    if (this.isSending) return;
    if (this.message.trim()) {
      this.isSending = true;
      this.messageSent.emit(this.message.trim());
      this.message = '';
      this.showEmojiPicker = false;
      this.isSending = false;
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string): void {
    this.message = `${this.message}${emoji}`;
  }

  insertMention(): void {
    this.message = `${this.message}@`;
  }

  onAttachClick(): void {
    // placeholder: hook up file upload later
  }

  getTitle(): string {
    if (this.channelName) {
      return 'Nachricht an #' + this.channelName;
    } else if (this.recipientName) {
      return 'Nachricht an ' + this.recipientName;
    }
    return 'Nachricht eingeben...';
  }
}

