import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputFieldComponent } from '../input-field/input-field.component';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, InputFieldComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.css'
})
export class ChatWindowComponent {
  messages: Array<{ id: string; text: string; sender: string; timestamp: Date }> = [];

  onMessageSent(message: string): void {
    // Message handling logic will be implemented here
    console.log('Message sent:', message);
  }
}

