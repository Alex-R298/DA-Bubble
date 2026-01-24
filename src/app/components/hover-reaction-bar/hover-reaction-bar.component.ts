import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ElementRef, inject, HostListener } from '@angular/core';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

@Component({
  selector: 'app-hover-reaction-bar',
  standalone: true,
  imports: [CommonModule, SvgImagesComponent],
  templateUrl: './hover-reaction-bar.component.html',
  styleUrls: ['./hover-reaction-bar.component.css']
})
export class HoverReactionBarComponent {
  @Input() isOwnMessage: boolean = false;
  @Input() showThreadButton: boolean = false;

  @Output() reactionToggled = new EventEmitter<string>();
  @Output() moreVertClicked = new EventEmitter<void>();
  @Output() threadButtonClicked = new EventEmitter<void>();

  showReactionPicker = false;
  availableReactions: string[] = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😱', '🙏', '🔥'];

  private elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showReactionPicker && !this.elementRef.nativeElement.contains(event.target)) {
      this.showReactionPicker = false;
    }
  }

  toggleReaction(emoji: string): void {
    this.reactionToggled.emit(emoji);
  }

  toggleReactionPicker(): void {
    this.showReactionPicker = !this.showReactionPicker;
  }

  addReaction(emoji: string): void {
    this.reactionToggled.emit(emoji);
    this.showReactionPicker = false;
  }

  onMoreVertClick(): void {
    this.moreVertClicked.emit();
  }

  onThreadButtonClick(): void {
    this.threadButtonClicked.emit();
  }
}
