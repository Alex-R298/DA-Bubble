import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule],
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.css']
})
export class InputFieldComponent implements OnInit {
  @Input() channelName: string = '';
  @Input() recipientName: string = '';
  @Output() messageSent = new EventEmitter<string>();
  private userService: UserService = inject(UserService);
  private authService = inject(AuthService);
  private usersSubscription?: Subscription;

  message: string = '';
  isSending: boolean = false;
  users: any[] = [];
  showEmojiPicker: boolean = false;
  emojis: string[] = ['😀', '😅', '😂', '😍', '🤝', '👍', '🎉', '🔥', '✅', '❓'];
  selectedUserIds: string[] = [];
  showUserTagList: boolean = false;

  ngOnInit(): void {
    this.subscribeToUsers();
  }

  ngOnDestroy(): void {
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
  }

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

  private subscribeToUsers(): void {
    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        this.users = users.filter(u => u.uid !== currentUid);
      });
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

  getStatusClass(user: any): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away'; // ← Away hinzufügen!
    return 'status-offline';
  }

  tagUser(user: any): void {
    console.log('tagUser aufgerufen mit:', user);
    const userName = user.name || user.displayName || 'Unknown';
    
    // User zur Liste hinzufügen wenn noch nicht vorhanden
    if (!this.selectedUserIds.includes(user.uid)) {
      this.selectedUserIds.push(user.uid);
    }
    
    this.message = this.message + userName + ' ';
    this.showUserTagList = false;
    console.log('Neue Nachricht:', this.message);
  }

  checkForMention(event: Event) {
    const input = (event.target as HTMLTextAreaElement).value;
    const cursorPosition = (event.target as HTMLTextAreaElement).selectionStart;
    this.showUserTagList = input[cursorPosition - 1] === '@';
    
    // Entferne User aus selectedUserIds wenn ihr Name nicht mehr im Text ist
    this.selectedUserIds = this.selectedUserIds.filter(uid => {
      const user = this.users.find(u => u.uid === uid);
      if (user) {
        const userName = user.name || user.displayName || '';
        return input.includes(userName);
      }
      return false;
    });
  }
}

