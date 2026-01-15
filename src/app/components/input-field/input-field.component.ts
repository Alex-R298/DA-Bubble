import { Component, EventEmitter, Input, Output, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ChannelService, Channel } from '../../services/channel.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule],
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.css']
})
export class InputFieldComponent implements OnInit, AfterViewInit {
  @Input() channelName: string = '';
  @Input() recipientName: string = '';
  @Output() messageSent = new EventEmitter<string>();
  @Output() userProfileClicked = new EventEmitter<string>(); // uid des Users
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLDivElement>;
  
  private userService: UserService = inject(UserService);
  private authService = inject(AuthService);
  private channelService = inject(ChannelService);
  private usersSubscription?: Subscription;
  private channelsSubscription?: Subscription;

  message: string = '';
  isSending: boolean = false;
  users: any[] = [];
  allChannels: Channel[] = [];
  showEmojiPicker: boolean = false;
  emojis: string[] = ['😀', '😅', '😂', '😍', '🤝', '👍', '🎉', '🔥', '✅', '❓'];
  selectedUserIds: string[] = [];
  selectedChannelIds: string[] = [];
  showTagList: boolean = false;
  tagListType: 'user' | 'channel' | null = null;

  // Getter: filtert den aktuellen Channel raus
  get channels(): Channel[] {
    return this.allChannels.filter(c => c.name !== this.channelName);
  }

  ngOnInit(): void {
    this.subscribeToUsers();
    this.subscribeToChannels();
  }

  ngAfterViewInit(): void {
    // Click-Handler für Mention-Tags (Profil öffnen)
    this.messageInput?.nativeElement?.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('mention-tag')) {
        event.preventDefault();
        event.stopPropagation();
        const userName = target.getAttribute('data-name');
        const uid = target.getAttribute('data-uid');
        if (uid) {
          console.log('Mention geklickt, öffne Profil für uid:', uid);
          this.userProfileClicked.emit(uid);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
    if (this.channelsSubscription) {
      this.channelsSubscription.unsubscribe();
    }
  }

  sendMessage(): void {
    if (this.isSending) return;
    const text = this.getTextContent();
    if (text.trim()) {
      this.isSending = true;
      this.messageSent.emit(text.trim());
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.innerHTML = '';
      }
      this.message = '';
      this.showEmojiPicker = false;
      this.isSending = false;
    }
  }

  getTextContent(): string {
    const el = this.messageInput?.nativeElement;
    if (!el) return this.message;
    
    let text = '';
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.classList.contains('mention-tag')) {
          // Format: @[Username] für Namen mit Leerzeichen
          text += '@[' + element.getAttribute('data-name') + ']';
        } else if (element.classList.contains('channel-tag')) {
          text += '#' + element.getAttribute('data-name');
        } else {
          text += element.textContent;
        }
      }
    });
    return text;
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
        this.allChannels = channels;
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

  toggleUserTagList(): void {
    if (this.showTagList && this.tagListType === 'user') {
      // Schließen: @ entfernen
      this.removeTrailingTrigger('@');
      this.showTagList = false;
      this.tagListType = null;
    } else {
      this.showTagList = true;
      this.tagListType = 'user';
      this.insertMention();
    }
  }

  insertEmoji(emoji: string): void {
    this.messageInput?.nativeElement?.focus();
    document.execCommand('insertText', false, emoji);
  }

  insertMention(): void {
    this.messageInput?.nativeElement?.focus();
    document.execCommand('insertText', false, '@');
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
    const userName = user.name || user.displayName || 'Unknown';
    
    if (!this.selectedUserIds.includes(user.uid)) {
      this.selectedUserIds.push(user.uid);
    }
    
    const el = this.messageInput?.nativeElement;
    if (el) {
      el.focus();
      document.execCommand('delete', false);
      const tagHtml = `<span class="mention-tag" contenteditable="false" data-name="${userName}" data-uid="${user.uid}">@${userName}</span>&nbsp;`;
      document.execCommand('insertHTML', false, tagHtml);
    }
    
    this.showTagList = false;
    this.tagListType = null;
  }

  tagChannel(channel: Channel): void {
    if (channel.id && !this.selectedChannelIds.includes(channel.id)) {
      this.selectedChannelIds.push(channel.id);
    }
    
    const el = this.messageInput?.nativeElement;
    if (el) {
      el.focus();
      // Lösche das # das gerade getippt wurde
      document.execCommand('delete', false);
      
      // Füge formatierten Tag ein
      const tagHtml = `<span class="channel-tag" contenteditable="false" data-name="${channel.name}">#${channel.name}</span>&nbsp;`;
      document.execCommand('insertHTML', false, tagHtml);
    }
    
    this.showTagList = false;
    this.tagListType = null;
  }

  onInput(event: Event): void {
    const el = this.messageInput?.nativeElement;
    if (!el) return;
    const textContent = el.textContent?.trim() || '';
    if (textContent === '' && el.innerHTML !== '') {
      el.innerHTML = '';
    }
    const mentionTags = el.querySelectorAll('.mention-tag');
    const presentUserUids = Array.from(mentionTags).map(tag => tag.getAttribute('data-uid'));
    this.selectedUserIds = presentUserUids.filter(uid => uid !== null) as string[];
    const channelTags = el.querySelectorAll('.channel-tag');
    const presentChannelNames = Array.from(channelTags).map(tag => tag.getAttribute('data-name'));
    this.selectedChannelIds = this.allChannels
      .filter(c => c.id && presentChannelNames.includes(c.name))
      .map(c => c.id!);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
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
    this.message = this.getTextContent();
  }

  /**
   * Entfernt das Trigger-Zeichen (@ oder #) am Ende des Inputs
   */
  private removeTrailingTrigger(trigger: string): void {
    const el = this.messageInput?.nativeElement;
    if (!el) return;
    
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      const text = textNode.textContent;
      const offset = range.startOffset;
      
      // Prüfe ob das Zeichen vor dem Cursor das Trigger-Zeichen ist
      if (offset > 0 && text[offset - 1] === trigger) {
        // Lösche das Zeichen mit execCommand
        document.execCommand('delete', false);
      }
    }
  }
}

