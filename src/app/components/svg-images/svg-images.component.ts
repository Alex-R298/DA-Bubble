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
      case 'person':
        return '0 0 91 91';
      case 'dabubble':
        return '0 0 243 70';
      case 'steffen-hoffmann':
      case 'sofia-mueller':
      case 'noah-braun':
      case 'frederik-beck':
      case 'elise-roth':
      case 'elias-neumann':
        return '0 0 500 500';
      case 'workspace':
        return '0 0 60 60';
      case 'edit_square':
        return '0 0 21 21';
      case 'add_circle':
      case 'account_circle':
        return '0 0 20 20';
      case 'workspaces':
        return '0 0 20 18';
      case 'keyboard_arrow_down':
        return '0 0 14 9';
      case 'add':
        return '0 0 14 14';
      case 'arrow_drop_down':
        return '0 0 10 6';
      case 'add_reaction':
        return '0 0 22 21';
      case 'person_add':
        return '0 0 22 16';
      case 'tag':
        return '0 0 22 23';
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

  isPersonIcon(): boolean {
    return this.iconName === 'person';
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

  isAvatarIcon(): boolean {
    return [
      'steffen-hoffmann',
      'sofia-mueller',
      'noah-braun',
      'frederik-beck',
      'elise-roth',
      'elias-neumann'
    ].includes(this.iconName);
  }

  isWorkspaceIcon(): boolean {
    return this.iconName === 'workspace';
  }

  isEditSquareIcon(): boolean {
    return this.iconName === 'edit_square';
  }

  isAddCircleIcon(): boolean {
    return this.iconName === 'add_circle';
  }

  isAccountCircleIcon(): boolean {
    return this.iconName === 'account_circle';
  }

  isWorkspacesIcon(): boolean {
    return this.iconName === 'workspaces';
  }

  isKeyboradArrowDownIcon(): boolean {
    return this.iconName === 'keyboard_arrow_down';
  }

  isAddIcon(): boolean {
    return this.iconName === 'add';
  }

  isArrowDropDownIcon(): boolean {
    return this.iconName === 'arrow_drop_down';
  }

  isAddReactionIcon(): boolean {
    return this.iconName === 'add_reaction';
  }

  isPersonAddIcon(): boolean {
    return this.iconName === 'person_add';
  }

  isTagIcon(): boolean {
    return this.iconName === 'tag';
  }
}

