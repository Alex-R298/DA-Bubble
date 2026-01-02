import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.css']
})
export class InputFieldComponent {
  @Input() channelName: string = '';
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
}

