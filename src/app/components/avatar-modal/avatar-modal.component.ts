import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-avatar-modal',
    standalone: true,
    imports: [CommonModule, SvgImagesComponent, TranslateModule],
    templateUrl: './avatar-modal.component.html',
    styleUrl: './avatar-modal.component.css',
})
export class AvatarModalComponent {
    private userService = inject(UserService);
    private authService = inject(AuthService);

    @Output() closed = new EventEmitter<void>();

    selectedAvatar: number | null = null;

    avatars: string[] = [
        'steffen-hoffmann',
        'sofia-mueller',
        'noah-braun',
        'frederik-beck',
        'elise-roth',
        'elias-neumann',
    ];

    /**
     * Selects an avatar by its index
     * @param index - The index of the avatar in the avatars array
     */
    selectAvatar(index: number): void {
        this.selectedAvatar = index;
    }

    /**
     * Saves the selected avatar and closes the modal
     */
    async onSave(): Promise<void> {
        if (this.selectedAvatar !== null) {
            const selectedAvatarUrl = this.avatars[this.selectedAvatar];
            const currentUser = this.authService.getCurrentUser();
            if (currentUser) {
                await this.userService.updateUserAvatar(
                    currentUser.uid,
                    selectedAvatarUrl,
                );
            }
        }
        this.closed.emit();
    }

    /**
     * Closes the modal without saving
     */
    close(): void {
        this.closed.emit();
    }
}