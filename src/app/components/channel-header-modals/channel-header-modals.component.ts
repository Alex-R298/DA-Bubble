import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { ChannelService, Channel } from '../../services/channel.service';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

export type ChannelHeaderModalType =
  | 'channel-info'
  | 'members'
  | 'add-members'
  | null;

type SelectedUserChip = {
  uid: string;
  name: string;
  profileImageUrl: string;
};

@Component({
  selector: 'app-channel-header-modals',
  standalone: true,
  imports: [CommonModule, FormsModule, /* svg icons */ SvgImagesComponent],
  templateUrl: './channel-header-modals.component.html',
  styleUrls: [
    '../../shared/styles/shared-ui.css',
    './channel-header-modals.component.css',
  ],
})
export class ChannelHeaderModalsComponent implements OnChanges, OnDestroy {
  private channelService = inject(ChannelService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  @Input() isOpen = false;
  @Input() type: ChannelHeaderModalType = null;
  @Input() channel: Channel | null = null;
  private usersSubscription?: Subscription;
  activeType: ChannelHeaderModalType = null;
  @Output() closed = new EventEmitter<void>();
  @Output() channelLeft = new EventEmitter<void>();
  @Output() openType = new EventEmitter<ChannelHeaderModalType>();
  @Output() userProfileRequested = new EventEmitter<User>();

  createdByName = '';
  isEditingName = false;
  isEditingDescription = false;
  draftName = '';
  draftDescription = '';
  memberUsers: User[] = [];
  addMemberQuery = '';
  selectableUsers: User[] = [];
  selectedUsers: SelectedUserChip[] = [];

  /**
   * Checks if the modal is visible based on open state and active type
   * @returns True if modal should be displayed
   */
  get isVisible(): boolean {
    return this.isOpen && !!this.activeType;
  }

  /**
   * Handles input changes and loads appropriate data based on modal type
   */
  async ngOnChanges(): Promise<void> {
    this.activeType = this.type;
    if (!this.isVisible) return;
    this.resetInlineState();
    if (this.activeType === 'channel-info') {
      await this.loadChannelInfo();
      await this.loadMembers();
    }
    if (this.activeType === 'members') {
      await this.loadMembers();
    }
    if (this.activeType === 'add-members') {
      await this.loadAddMembersCandidates();
    }
  }

  /**
   * Cleans up subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.usersSubscription?.unsubscribe();
  }

  /**
   * Closes the modal and unsubscribes from active subscriptions
   */
  close(): void {
    this.usersSubscription?.unsubscribe();
    this.closed.emit();
  }

  /**
   * Opens the add members modal
   */
  openAddMembers(): void {
    this.openType.emit('add-members');
  }

  /**
   * Handles click on modal overlay to close the modal
   */
  onOverlayClick(): void {
    this.close();
  }

  /**
   * Prevents event propagation when clicking inside modal content
   * @param event - The mouse event
   */
  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Resets all inline editing states and temporary data
   * @private
   */
  private resetInlineState(): void {
    this.isEditingName = false;
    this.isEditingDescription = false;
    this.draftName = this.channel?.name ?? '';
    this.draftDescription = this.channel?.description ?? '';
    this.createdByName = '';
    this.memberUsers = [];
    this.addMemberQuery = '';
    this.selectableUsers = [];
    this.selectedUsers = [];
  }

  /**
   * Loads channel creator information
   * @private
   */
  private async loadChannelInfo(): Promise<void> {
    const createdById = this.channel?.createdById;
    if (!createdById) return;
    const user = await this.userService.getUserById(createdById);
    this.createdByName = user?.name ?? '';
  }

  /**
   * Loads all channel members and sorts them with current user first
   * @private
   */
  private async loadMembers(): Promise<void> {
    const memberIds = this.channel?.members ?? [];
    const users = await Promise.all(
      memberIds.map((uid) => this.userService.getUserById(uid)),
    );
    const list = users.filter((u): u is User => !!u);
    const currentUid = this.authService.getCurrentUser()?.uid;
    if (currentUid) {
      list.sort((a, b) => {
        const aIsMe = a.uid === currentUid ? 0 : 1;
        const bIsMe = b.uid === currentUid ? 0 : 1;
        return aIsMe - bIsMe;
      });
    }

    this.memberUsers = list;
  }

  /**
   * Loads users that can be added as members (excluding current members)
   * @private
   */
  private async loadAddMembersCandidates(): Promise<void> {
    const memberIds = new Set(this.channel?.members ?? []);
    this.usersSubscription?.unsubscribe();
    this.usersSubscription = this.userService
      .getAllUsersRealtime()
      .subscribe((users) => {
        this.selectableUsers = users.filter((u) => !memberIds.has(u.uid));
      });
  }

  /**
   * Gets the display label for a member (adds "(du)" for current user)
   * @param user - The user to get label for
   * @returns Formatted member label
   */
  getMemberLabel(user: User): string {
    const currentUid = this.authService.getCurrentUser()?.uid;
    return user.uid === currentUid ? `${user.name} (du)` : user.name;
  }

  /**
   * Gets the CSS class for user status indicator
   * @param user - The user to check status for
   * @returns CSS class name for status
   */
  getStatusClass(user: User | null | undefined): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  /**
   * Opens the profile modal for a member
   * @param user - The user whose profile to open
   */
  openMemberProfile(user: User): void {
    if (!user) return;
    this.userProfileRequested.emit(user);
    this.close();
  }

  /**
   * Starts editing mode for channel name
   */
  startEditName(): void {
    this.isEditingName = true;
    this.draftName = this.channel?.name ?? '';
  }

  /**
   * Cancels name editing and restores original value
   */
  cancelEditName(): void {
    this.isEditingName = false;
    this.draftName = this.channel?.name ?? '';
  }

  /**
   * Saves the edited channel name
   */
  async saveName(): Promise<void> {
    if (!this.channel?.id) return;
    await this.channelService.updateChannel(this.channel.id, {
      name: this.draftName.trim(),
    });
    this.isEditingName = false;
  }

  /**
   * Starts editing mode for channel description
   */
  startEditDescription(): void {
    this.isEditingDescription = true;
    this.draftDescription = this.channel?.description ?? '';
  }

  /**
   * Cancels description editing and restores original value
   */
  cancelEditDescription(): void {
    this.isEditingDescription = false;
    this.draftDescription = this.channel?.description ?? '';
  }

  /**
   * Saves the edited channel description
   */
  async saveDescription(): Promise<void> {
    if (!this.channel?.id) return;
    await this.channelService.updateChannel(this.channel.id, {
      description: this.draftDescription.trim(),
    });
    this.isEditingDescription = false;
  }

  /**
   * Removes current user from channel and closes modal
   */
  async leaveChannel(): Promise<void> {
    const channelId = this.channel?.id;
    const uid = this.authService.getCurrentUser()?.uid;
    if (!channelId || !uid) return;
    await this.channelService.removeMember(channelId, uid);
    this.close();
    this.channelLeft.emit();
  }

  /**
   * Filters selectable users based on search query
   * @returns Filtered list of users matching the search query
   */
  get filteredSelectableUsers(): User[] {
    const q = this.addMemberQuery.trim().toLowerCase();
    if (!q) return [];
    const selected = new Set(this.selectedUsers.map((s) => s.uid));
    return this.selectableUsers
      .filter((u) => !selected.has(u.uid))
      .filter(
        (u) =>
          (u.name ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }

  /**
   * Adds a user to the selection for adding as member
   * @param user - The user to add to selection
   */
  addUserToSelection(user: User): void {
    this.selectedUsers = [
      ...this.selectedUsers,
      {
        uid: user.uid,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
      },
    ];
    this.addMemberQuery = '';
  }

  /**
   * Removes a user from the selection
   * @param uid - The user ID to remove from selection
   */
  removeSelectedUser(uid: string): void {
    this.selectedUsers = this.selectedUsers.filter((u) => u.uid !== uid);
  }

  /**
   * Checks if the add members action can be confirmed
   * @returns True if at least one user is selected
   */
  get canConfirmAddMembers(): boolean {
    return this.selectedUsers.length > 0;
  }

  /**
   * Adds selected users as channel members and closes modal
   */
  async confirmAddMembers(): Promise<void> {
    if (!this.channel?.id) return;
    if (!this.canConfirmAddMembers) return;
    const uids = this.selectedUsers.map((u) => u.uid);
    await this.channelService.addMembers(this.channel.id, uids);
    this.close();
  }
}
