import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-avatar-modal',
    standalone: true,
    imports: [CommonModule, SvgImagesComponent, TranslateModule],
    templateUrl: './avatar-modal.component.html',
    styleUrls: ['./avatar-modal.component.css'],
})
export class AvatarModalComponent {
    @Output() closed = new EventEmitter<void>();
    @Output() saved = new EventEmitter<string>();

    selectedAvatar: number | null = null;

    avatars: string[] = [
        'steffen-hoffmann',
        'sofia-mueller',
        'noah-braun',
        'frederik-beck',
        'elise-roth',
        'elias-neumann',
    ];

    /** Selects an avatar by its index */
    selectAvatar(index: number): void {
        this.selectedAvatar = index;
    }

    /**
     * Emits the chosen avatar to the parent but does NOT persist it here.
     * Persistence happens when the parent finally saves the profile.
     */
    onSave(): void {
        if (this.selectedAvatar !== null) {
            const selectedAvatarUrl = this.avatars[this.selectedAvatar];
            this.saved.emit(selectedAvatarUrl);
        }
        this.selectedAvatar = null;
        this.closed.emit();
    }

    /** Closes the modal without saving */
    close(): void {
        this.selectedAvatar = null;
        this.closed.emit();
    }
}