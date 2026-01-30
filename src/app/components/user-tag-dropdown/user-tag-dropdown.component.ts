import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { Channel } from '../../services/channel.service';

export interface TagUser {
  uid: string;
  name?: string;
  displayName?: string;
  profileImageUrl?: string;
  status?: 'online' | 'offline' | 'away';
}

@Component({
  selector: 'app-user-tag-dropdown',
  standalone: true,
  imports: [CommonModule, SvgImagesComponent],
  templateUrl: './user-tag-dropdown.component.html',
  styleUrls: ['./user-tag-dropdown.component.css']
})
export class UserTagDropdownComponent {
  @Input() showTagList: boolean = false;
  @Input() tagListType: 'user' | 'channel' | null = null;
  @Input() users: TagUser[] = [];
  @Input() channels: Channel[] = [];
  @Input() dropdownPosition: 'top' | 'bottom' = 'top';

  @Output() userSelected = new EventEmitter<TagUser>();
  @Output() channelSelected = new EventEmitter<Channel>();

  getStatusClass(user: TagUser): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  onUserSelect(user: TagUser): void {
    this.userSelected.emit(user);
  }

  onChannelSelect(channel: Channel): void {
    this.channelSelected.emit(channel);
  }
}
