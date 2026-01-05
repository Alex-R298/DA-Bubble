import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

export type UserProfileModalUser = {
    uid: string;
    name?: string;
    email?: string;
    profileImageUrl?: string;
    status?: 'online' | 'offline' | string;
};

@Component({
    selector: 'app-user-profile-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-profile-modal.component.html',
    styleUrls: ['../../shared/styles/shared-ui.css', './user-profile-modal.component.css']
})
export class UserProfileModalComponent {
    private authService = inject(AuthService);
    private userService = inject(UserService);

    @Input() user: UserProfileModalUser | null = null;
    @Input() allowEdit = false;
    @Input() showMessageButton = true;

    @Output() closed = new EventEmitter<void>();
    @Output() message = new EventEmitter<UserProfileModalUser>();

    isEditing = false;
    editedFullName = '';
    editNameFocused = false;

    close(): void {
        this.isEditing = false;
        this.closed.emit();
    }

    startEdit(): void {
        if (!this.allowEdit || !this.user) return;
        this.editedFullName = '';
        this.editNameFocused = false;
        this.isEditing = true;
    }

    cancelEdit(): void {
        this.isEditing = false;
    }

    onEditNameFocus(): void {
        this.editNameFocused = true;
    }

    onEditNameBlur(): void {
        this.editNameFocused = false;
    }

    async saveEdit(): Promise<void> {
        if (!this.user) return;
        const nextName = this.editedFullName.trim();
        if (!nextName) {
            this.isEditing = false;
            return;
        }

        // Safety: only allow editing own profile.
        const currentUid = this.authService.getCurrentUser()?.uid;
        if (!currentUid || currentUid !== this.user.uid) {
            this.isEditing = false;
            return;
        }

        // Optimistic UI update.
        this.user = { ...this.user, name: nextName };

        try {
            await this.userService.updateUserProfile(currentUid, nextName);
        } catch {
            // If persistence fails (e.g. Firebase disabled), keep the optimistic name.
        }

        this.isEditing = false;
    }

    sendMessage(): void {
        if (!this.user) return;
        this.message.emit(this.user);
    }

    getStatusClass(user: UserProfileModalUser | null): string {
        return user?.status === 'online' ? 'status-online' : 'status-offline';
    }

    getStatusText(user: UserProfileModalUser | null): string {
        return user?.status === 'online' ? 'Online' : 'Offline';
    }
}
