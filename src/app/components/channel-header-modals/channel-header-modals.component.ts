import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, OnChanges, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { ChannelService, Channel } from '../../services/channel.service';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

export type ChannelHeaderModalType = 'channel-info' | 'members' | 'add-members' | null;

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
    styleUrls: ['../../shared/styles/shared-ui.css', './channel-header-modals.component.css']
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

    get isVisible(): boolean {
        return this.isOpen && !!this.activeType;
    }

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

    ngOnDestroy(): void {
        this.usersSubscription?.unsubscribe();
    }

    close(): void {
        this.usersSubscription?.unsubscribe();
        this.closed.emit();
    }

    openAddMembers(): void {
        this.openType.emit('add-members');
    }

    onOverlayClick(): void {
        this.close();
    }

    onModalClick(event: MouseEvent): void {
        event.stopPropagation();
    }

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

    private async loadChannelInfo(): Promise<void> {
        const createdById = this.channel?.createdById;
        if (!createdById) return;
        const user = await this.userService.getUserById(createdById);
        this.createdByName = user?.name ?? '';
    }

    private async loadMembers(): Promise<void> {
        const memberIds = this.channel?.members ?? [];
        const users = await Promise.all(memberIds.map(uid => this.userService.getUserById(uid)));
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

    private async loadAddMembersCandidates(): Promise<void> {
        const memberIds = new Set(this.channel?.members ?? []);

        this.usersSubscription?.unsubscribe();
        this.usersSubscription = this.userService.getAllUsersRealtime().subscribe(users => {
            this.selectableUsers = users.filter(u => !memberIds.has(u.uid));
        });
    }

    getMemberLabel(user: User): string {
        const currentUid = this.authService.getCurrentUser()?.uid;
        return user.uid === currentUid ? `${user.name} (du)` : user.name;
    }

    getStatusClass(user: User | null | undefined): string {
        if (user?.status === 'online') return 'status-online';
        if (user?.status === 'away') return 'status-away';
        return 'status-offline';
    }

    openMemberProfile(user: User): void {
        if (!user) return;
        this.userProfileRequested.emit(user);
        this.close();
    }

    startEditName(): void {
        this.isEditingName = true;
        this.draftName = this.channel?.name ?? '';
    }

    cancelEditName(): void {
        this.isEditingName = false;
        this.draftName = this.channel?.name ?? '';
    }

    async saveName(): Promise<void> {
        if (!this.channel?.id) return;
        await this.channelService.updateChannel(this.channel.id, { name: this.draftName.trim() });
        this.isEditingName = false;
    }

    startEditDescription(): void {
        this.isEditingDescription = true;
        this.draftDescription = this.channel?.description ?? '';
    }

    cancelEditDescription(): void {
        this.isEditingDescription = false;
        this.draftDescription = this.channel?.description ?? '';
    }

    async saveDescription(): Promise<void> {
        if (!this.channel?.id) return;
        await this.channelService.updateChannel(this.channel.id, { description: this.draftDescription.trim() });
        this.isEditingDescription = false;
    }

    async leaveChannel(): Promise<void> {
        const channelId = this.channel?.id;
        const uid = this.authService.getCurrentUser()?.uid;
        if (!channelId || !uid) return;

        await this.channelService.removeMember(channelId, uid);
        this.close();
        this.channelLeft.emit();
    }

    get filteredSelectableUsers(): User[] {
        const q = this.addMemberQuery.trim().toLowerCase();
        if (!q) return [];

        const selected = new Set(this.selectedUsers.map(s => s.uid));
        return this.selectableUsers
            .filter(u => !selected.has(u.uid))
            .filter(u => (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
            .slice(0, 8);
    }

    addUserToSelection(user: User): void {
        this.selectedUsers = [
            ...this.selectedUsers,
            {
                uid: user.uid,
                name: user.name,
                profileImageUrl: user.profileImageUrl
            }
        ];
        this.addMemberQuery = '';
    }

    removeSelectedUser(uid: string): void {
        this.selectedUsers = this.selectedUsers.filter(u => u.uid !== uid);
    }

    get canConfirmAddMembers(): boolean {
        return this.selectedUsers.length > 0;
    }

    async confirmAddMembers(): Promise<void> {
        if (!this.channel?.id) return;
        if (!this.canConfirmAddMembers) return;

        const uids = this.selectedUsers.map(u => u.uid);
        await this.channelService.addMembers(this.channel.id, uids);
        this.close();
    }
}
