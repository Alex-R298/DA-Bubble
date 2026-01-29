import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

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
    imports: [CommonModule, FormsModule, SvgImagesComponent],
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

    /**
     * Closes the modal and resets the editing state.
     */
    close(): void {
        this.isEditing = false;
        this.closed.emit();
    }

    /**
     * Starts the edit mode for the user profile.
     */
    startEdit(): void {
        if (!this.allowEdit || !this.user) return;
        this.editedFullName = '';
        this.editNameFocused = false;
        this.isEditing = true;
    }

    /**
     * Cancels the edit mode without saving changes.
     */
    cancelEdit(): void {
        this.isEditing = false;
    }

    /**
     * Handles focus event on the name input field.
     */
    onEditNameFocus(): void {
        this.editNameFocused = true;
    }

    /**
     * Handles blur event on the name input field.
     */
    onEditNameBlur(): void {
        this.editNameFocused = false;
    }

    /**
     * Saves the edited profile name and updates the user data.
     * Only allows editing the current user's own profile.
     */
    async saveEdit(): Promise<void> {
        if (!this.user) return;
        const nextName = this.editedFullName.trim();
        if (!nextName) {
            this.isEditing = false;
            return;
        }
        const currentUid = this.authService.getCurrentUser()?.uid;
        if (!currentUid || currentUid !== this.user.uid) {
            this.isEditing = false;
            return;
        }
        this.user = { ...this.user, name: nextName };

        try {
            await this.userService.updateUserProfile(currentUid, nextName);
        } catch {
        }
        this.isEditing = false;
    }

    /**
     * Emits an event to initiate a message with the displayed user.
     */
    sendMessage(): void {
        if (!this.user) return;
        this.message.emit(this.user);
    }

    /**
     * Returns the CSS class for the user's online status.
     * @param user - The user object to check the status for.
     * @returns The CSS class name for the status indicator.
     */
    getStatusClass(user: UserProfileModalUser | null): string {
        return user?.status === 'online' ? 'status-online' : 'status-offline';
    }

    /**
     * Returns the display text for the user's online status.
     * @param user - The user object to check the status for.
     * @returns The status text to display.
     */
    getStatusText(user: UserProfileModalUser | null): string {
        return user?.status === 'online' ? 'Online' : 'Offline';
    }
}
