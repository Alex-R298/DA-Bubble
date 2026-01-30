import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ElementRef, inject, HostListener } from '@angular/core';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

/**
 * Hover reaction bar component for messages.
 * Displays quick reaction options and action buttons when hovering over a message.
 */
@Component({
  selector: 'app-hover-reaction-bar',
  standalone: true,
  imports: [CommonModule, SvgImagesComponent],
  templateUrl: './hover-reaction-bar.component.html',
  styleUrls: ['./hover-reaction-bar.component.css']
})
export class HoverReactionBarComponent {
  /** Indicates whether the message belongs to the current user. */
  @Input() isOwnMessage: boolean = false;

  /** Controls the visibility of the thread button. */
  @Input() showThreadButton: boolean = false;

  /** Controls the visibility of the comment button separately. */
  @Input() showCommentButton: boolean = true;

  /** Emits when a reaction emoji is toggled. */
  @Output() reactionToggled = new EventEmitter<string>();

  /** Emits when the more options button is clicked. */
  @Output() moreVertClicked = new EventEmitter<void>();

  /** Emits when the thread button is clicked. */
  @Output() threadButtonClicked = new EventEmitter<void>();

  /** Controls the visibility of the emoji reaction picker. */
  showReactionPicker = false;

  /** Position of the picker: 'top' or 'bottom'. */
  pickerPosition: 'top' | 'bottom' = 'top';

  /** List of available emoji reactions for selection. */
  availableReactions: string[] = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😱', '🙏', '🔥'];

  /** Reference to the component's host element. */
  private elementRef = inject(ElementRef);

  /**
   * Handles clicks outside the component to close the reaction picker.
   * @param event - The mouse click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showReactionPicker && !this.elementRef.nativeElement.contains(event.target)) {
      this.showReactionPicker = false;
    }
  }

  /**
   * Emits the selected emoji reaction.
   * @param emoji - The emoji string to toggle.
   */
  toggleReaction(emoji: string): void {
    this.reactionToggled.emit(emoji);
  }

  /**
   * Toggles the visibility of the emoji reaction picker.
   * Calculates whether to show picker above or below based on available space.
   */
  toggleReactionPicker(): void {
    if (!this.showReactionPicker) {
      this.calculatePickerPosition();
    }
    this.showReactionPicker = !this.showReactionPicker;
  }

  /**
   * Calculates whether the picker should appear above or below.
   * Finds the scrollable container and checks space relative to it.
   */
  private calculatePickerPosition(): void {
    const element = this.elementRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const scrollContainer = this.findScrollableParent(element);

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const spaceAboveInContainer = rect.top - containerRect.top;
      this.pickerPosition = spaceAboveInContainer < 120 ? 'bottom' : 'top';
    } else {
      this.pickerPosition = rect.top < 200 ? 'bottom' : 'top';
    }
  }

  /**
   * Finds the nearest scrollable parent container.
   */
  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  /**
   * Adds a reaction and closes the picker.
   * @param emoji - The emoji string to add as reaction.
   */
  addReaction(emoji: string): void {
    this.reactionToggled.emit(emoji);
    this.showReactionPicker = false;
  }

  /**
   * Emits event when the more options button is clicked.
   */
  onMoreVertClick(): void {
    this.moreVertClicked.emit();
  }

  /**
   * Emits event when the thread button is clicked.
   */
  onThreadButtonClick(): void {
    this.threadButtonClicked.emit();
  }
}
