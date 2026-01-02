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

  isGoogleIcon(): boolean {
    return this.iconName === 'google';
  }
}
