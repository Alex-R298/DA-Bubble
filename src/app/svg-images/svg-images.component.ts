import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-svg-images',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './svg-images.component.html',
  styleUrl: './svg-images.component.css'
})
export class SvgImagesComponent {
  @Input() iconName: string = '';
  @Input() width: string = '38';
  @Input() height: string = '38';
  @Input() className: string = '';

  getViewBox(): string {
    switch (this.iconName) {
      case 'google':
        return '0 0 38 38';
      case 'mail':
        return '0 0 20 16';
      case 'lock':
        return '0 0 16 21';
      case 'arrow_back':
        return '0 0 16 16';
      case 'person_filled':
        return '0 0 16 16';
      case 'dabubble':
        return '0 0 243 70';
      default:
        return '0 0 24 24';
    }
  }

  isGoogleIcon(): boolean {
    return this.iconName === 'google';
  }

  isMailIcon(): boolean {
    return this.iconName === 'mail';
  }

  isLockIcon(): boolean {
    return this.iconName === 'lock';
  }

  isArrowBackIcon(): boolean {
    return this.iconName === 'arrow_back';
  }

  isPersonFilledIcon(): boolean {
    return this.iconName === 'person_filled';
  }

  isDABubbleIcon(): boolean {
    return this.iconName === 'dabubble';
  }
}
