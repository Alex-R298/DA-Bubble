import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { AvatarModalComponent } from '../avatar-modal/avatar-modal.component';

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
    imports: [CommonModule, FormsModule, SvgImagesComponent, AvatarModalComponent],
    templateUrl: './user-profile-modal.component.html',
    styleUrls: ['../../shared/styles/shared-ui.css', './user-profile-modal.component.css']
})
export class UserProfileModalComponent implements OnChanges, OnInit {
    private authService = inject(AuthService);
    private userService = inject(UserService);

    @Input() user: UserProfileModalUser | null = null;
    @Input() allowEdit = false;
    @Input() showMessageButton = true;

    @Output() closed = new EventEmitter<void>();
    @Output() message = new EventEmitter<UserProfileModalUser>();

    // Lokale Kopie des Users um Änderungen zu isolieren
    displayUser: UserProfileModalUser | null = null;
    originalProfileImageUrl: string | null = null;

    isEditing = false;
    editedFullName = '';
    editNameFocused = false;
    showAvatarModal = false;
    nameError: string | null = null;
    pendingAvatar: string | null = null;

    /** Initialisiert die Komponente */
    ngOnInit(): void {
        this.initializeFromUser();
    }

    /** Erstellt eine lokale Kopie wenn sich der Input ändert */
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['user']) {
            this.initializeFromUser();
        }
    }

    /** Initialisiert displayUser und originalProfileImageUrl vom user Input */
    private initializeFromUser(): void {
        if (this.user) {
            this.displayUser = { ...this.user };
            this.originalProfileImageUrl = this.user.profileImageUrl || null;
            this.pendingAvatar = null;
            this.isEditing = false;
        }
    }

    /**
     * Closes the modal and resets the editing state.
     */
    close(): void {
        // Setze alles auf den ursprünglichen Zustand zurück
        this.initializeFromUser();
        this.resetEditState();
        this.closed.emit();
    }

    /**
     * Starts the edit mode for the user profile.
     */
    startEdit(): void {
        if (!this.allowEdit || !this.displayUser) return;
        this.editedFullName = this.displayUser.name || '';
        this.editNameFocused = false;
        this.nameError = null;
        this.pendingAvatar = null;
        this.isEditing = true;
    }

    /**
     * Cancels the edit mode without saving changes.
     */
    cancelEdit(): void {
        // Setze alles auf den ursprünglichen Zustand zurück
        this.initializeFromUser();
        this.isEditing = false;
    }

    /**
     * Resets the edit state variables.
     */
    private resetEditState(): void {
        this.isEditing = false;
        this.showAvatarModal = false;
        this.pendingAvatar = null;
    }

    /** Opens the avatar selection modal */
    openAvatarModal(): void {
        if (!this.allowEdit) return;
        this.showAvatarModal = true;
    }

    /** Closes the avatar selection modal */
    closeAvatarModal(): void {
        this.showAvatarModal = false;
    }

    /** Receives selected avatar from AvatarModal but does not persist here */
    onAvatarSaved(avatarUrl: string): void {
        this.pendingAvatar = avatarUrl;
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
        if (!this.displayUser) return;
        this.nameError = null;
        const nextName = this.editedFullName.trim();
        if (!nextName) {
            this.nameError = 'Bitte einen Namen eingeben!';
            return;
        }
        const currentUid = this.authService.getCurrentUser()?.uid;
        if (!currentUid || currentUid !== this.displayUser.uid) {
            this.isEditing = false;
            return;
        }
        this.displayUser = { ...this.displayUser, name: nextName };

        try {
            await this.userService.updateUserProfile(currentUid, nextName);
            if (this.pendingAvatar) {
                await this.userService.updateUserAvatar(currentUid, this.pendingAvatar);
                this.displayUser = { ...this.displayUser, profileImageUrl: this.pendingAvatar };
                this.originalProfileImageUrl = this.pendingAvatar;
                this.pendingAvatar = null;
            }
            this.userService.clearUserCache();
        } catch {
        }
        this.isEditing = false;
    }

    /**
     * Emits an event to initiate a message with the displayed user.
     */
    sendMessage(): void {
        if (!this.displayUser) return;
        this.message.emit(this.displayUser);
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
