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
      case 'steffen-hoffmann':
      case 'sofia-mueller':
      case 'noah-braun':
      case 'frederik-beck':
      case 'elise-roth':
      case 'elias-neumann':
        return '0 0 500 500';
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

  isSteffenHoffmannIcon(): boolean {
    return this.iconName === 'steffen-hoffmann';
  }

  isSofiaMuellerIcon(): boolean {
    return this.iconName === 'sofia-mueller';
  }

  isNoahBraunIcon(): boolean {
    return this.iconName === 'noah-braun';
  }

  isFrederikBeckIcon(): boolean {
    return this.iconName === 'frederik-beck';
  }

  isEliseRothIcon(): boolean {
    return this.iconName === 'elise-roth';
  }

  isEliasNeumannIcon(): boolean {
    return this.iconName === 'elias-neumann';
  }
}

